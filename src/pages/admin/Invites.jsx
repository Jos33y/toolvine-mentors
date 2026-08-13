import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import {
  fetchInvites,
  fetchExistingEmails,
  createInvite,
  bulkCreateInvites,
  refreshInvite,
  revokeInvite,
  sendInviteEmail,
  parseEmailList,
  inviteLink,
  friendlyInviteError,
  STATUS_LABELS,
  FILTERS,
  DEFAULT_FILTER,
  DEFAULT_EXPIRY_DAYS
} from '@/lib/invites'
import './invites.css'

const ROLE_OPTIONS = [
  { value: 'mentor',    label: 'Mentor' },
  { value: 'mentee',    label: 'Mentee' },
  { value: 'undecided', label: 'Not set' }
]

const BLANK = { email: '', roleHint: 'mentor', expiryDays: DEFAULT_EXPIRY_DAYS }

export function Invites() {
  const [rows,     setRows]     = useState([])
  const [existing, setExisting] = useState(new Set())
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [notice,   setNotice]   = useState('')

  const [searchParams, setSearchParams] = useSearchParams()
  const rawFilter = searchParams.get('filter')
  const filter = FILTERS.some((f) => f.key === rawFilter) ? rawFilter : DEFAULT_FILTER

  const [mode,   setMode]   = useState(null)   // null, 'single', or 'bulk'
  const [draft,  setDraft]  = useState(BLANK)
  const [paste,  setPaste]  = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [invites, emails] = await Promise.all([fetchInvites(), fetchExistingEmails()])
      setRows(invites)
      setExisting(emails)
    } catch (e) {
      setError(friendlyInviteError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function setFilter(next) {
    const params = new URLSearchParams(searchParams)
    if (next === DEFAULT_FILTER) params.delete('filter')
    else params.set('filter', next)
    setSearchParams(params, { replace: true })
  }

  const counts = useMemo(() => {
    const c = { all: rows.length }
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1
    // 'acknowledged' cannot occur, but if one ever did it belongs with signed up.
    c.registered = (c.registered ?? 0) + (c.acknowledged ?? 0)
    return c
  }, [rows])

  const visible = useMemo(
    () => (filter === 'all'
      ? rows
      : rows.filter((r) => r.status === filter || (filter === 'registered' && r.status === 'acknowledged'))),
    [rows, filter]
  )

  function openSingle() {
    setMode('single'); setDraft(BLANK); setFormError(''); setNotice('')
  }

  function openBulk() {
    setMode('bulk'); setDraft(BLANK); setPaste(''); setFormError(''); setNotice('')
  }

  function closeForm() {
    setMode(null); setPaste(''); setFormError('')
  }

  async function saveSingle() {
    if (saving) return
    setSaving(true); setFormError('')
    try {
      const row = await createInvite(draft)
      const result = await sendInviteEmail(row.id)
      closeForm()
      setNotice(result.sent
        ? `Invitation sent to ${row.email}.`
        : `Invite created for ${row.email}, but the email did not send. Use Resend on the row.`)
      await load()
    } catch (e) {
      setFormError(friendlyInviteError(e))
    } finally {
      setSaving(false)
    }
  }

  // Creates rows only. Sending stays a separate, explicit act so a mistaken
  // paste cannot email a list of people.
  async function saveBulk() {
    if (saving) return
    const emails = parseEmailList(paste)
    if (emails.length === 0) {
      setFormError('No email addresses found in that text.')
      return
    }

    setSaving(true); setFormError('')
    try {
      const result = await bulkCreateInvites({
        emails,
        roleHint:   draft.roleHint,
        expiryDays: draft.expiryDays
      })
      closeForm()
      setNotice(summarise(result))
      await load()
    } catch (e) {
      setFormError(friendlyInviteError(e))
    } finally {
      setSaving(false)
    }
  }

  async function send(row) {
    setBusyId(row.id); setNotice(''); setError('')
    try {
      const result = await sendInviteEmail(row.id)
      setNotice(result.sent
        ? `Invitation sent to ${row.email}.`
        : `Could not send to ${row.email}. ${reasonText(result.reason)}`)
      await load()
    } catch (e) {
      setError(friendlyInviteError(e))
    } finally {
      setBusyId(null)
    }
  }

  async function resend(row) {
    setBusyId(row.id); setNotice(''); setError('')
    try {
      await refreshInvite(row.id, draft.expiryDays)
      const result = await sendInviteEmail(row.id)
      setNotice(result.sent
        ? `Invitation resent to ${row.email}.`
        : `Invite refreshed but the email did not send to ${row.email}.`)
      await load()
    } catch (e) {
      setError(friendlyInviteError(e))
    } finally {
      setBusyId(null)
    }
  }

  async function revoke(row) {
    setBusyId(row.id); setNotice(''); setError('')
    try {
      await revokeInvite(row.id)
      setNotice(`Invitation to ${row.email} revoked.`)
      await load()
    } catch (e) {
      setError(friendlyInviteError(e))
    } finally {
      setBusyId(null)
    }
  }

  async function copyLink(row) {
    try {
      await navigator.clipboard.writeText(inviteLink(row.token))
      setNotice('Invitation link copied.')
    } catch {
      setError('Could not copy the link. Your browser blocked clipboard access.')
    }
  }

  return (
    <section className="admin-invites">
      <header className="admin-invites__head">
        <div>
          <h1 className="admin-invites__title">Invites</h1>
          <p className="admin-invites__lede">
            An invited person signs up with their role already granted and their email
            already verified. Each link works once.
          </p>
        </div>
        <div className="admin-invites__head-actions">
          <button type="button" className="admin-invites__new" onClick={openSingle}>
            <Icon name="plus" size={16} />
            Invite someone
          </button>
          <button type="button" className="admin-invites__action" onClick={openBulk}>
            Invite many
          </button>
        </div>
      </header>

      {error  && <div className="admin-invites__alert" role="alert">{error}</div>}
      {notice && <div className="admin-invites__notice" role="status">{notice}</div>}

      {mode === 'single' && (
        <SingleForm
          draft={draft} setDraft={setDraft}
          saving={saving} formError={formError}
          onCancel={closeForm} onSave={saveSingle}
        />
      )}

      {mode === 'bulk' && (
        <BulkForm
          draft={draft} setDraft={setDraft}
          paste={paste} setPaste={setPaste}
          saving={saving} formError={formError}
          onCancel={closeForm} onSave={saveBulk}
        />
      )}

      <nav className="admin-invites__filters" aria-label="Filter invites">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={'admin-invites__filter' + (filter === f.key ? ' admin-invites__filter--active' : '')}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
          >
            <span className="admin-invites__filter-label">{f.label}</span>
            <span className="admin-invites__filter-count">{counts[f.key] ?? 0}</span>
          </button>
        ))}
      </nav>

      {loading ? (
        <ul className="admin-invites__list" aria-busy="true">
          {[0, 1, 2].map((i) => <li key={i} className="admin-invites__row admin-invites__row--skel" />)}
        </ul>
      ) : visible.length === 0 ? (
        <EmptyState filter={filter} onAdd={openSingle} />
      ) : (
        <ul className="admin-invites__list">
          {visible.map((row) => (
            <InviteRow
              key={row.id}
              row={row}
              hasAccount={existing.has((row.email || '').toLowerCase())}
              busy={busyId === row.id}
              onSend={() => send(row)}
              onResend={() => resend(row)}
              onRevoke={() => revoke(row)}
              onCopy={() => copyLink(row)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

/* ============ Row ============ */

function InviteRow({ row, hasAccount, busy, onSend, onResend, onRevoke, onCopy }) {
  const status = row.status === 'acknowledged' ? 'registered' : row.status
  const spent  = Boolean(row.redeemed_at)
  const dead   = status === 'revoked' || status === 'expired'

  return (
    <li className={`admin-invites__row${dead ? ' is-dead' : ''}`}>
      <div className="admin-invites__row-text">
        <p className="admin-invites__row-email">{row.email}</p>
        <p className="admin-invites__row-meta">
          {ROLE_OPTIONS.find((r) => r.value === row.role_hint)?.label ?? row.role_hint}
          {' · Invited '}{formatDate(row.invited_at)}
          {!dead && !spent && <> · Expires {formatDate(row.expires_at)}</>}
          {row.is_stale && !spent && !dead && <> · No response yet</>}
          {hasAccount && !spent && <> · Address already has an account</>}
        </p>
      </div>

      <span className={`admin-invites__pill admin-invites__pill--${status}`}>
        {STATUS_LABELS[row.status] ?? row.status}
      </span>

      <div className="admin-invites__row-actions">
        {!spent && !dead && (
          <>
            <button type="button" className="admin-invites__action" onClick={onCopy} disabled={busy}>
              Copy link
            </button>
            <button type="button" className="admin-invites__action" onClick={onSend} disabled={busy}>
              Send
            </button>
            <button
              type="button"
              className="admin-invites__action admin-invites__action--danger"
              onClick={onRevoke}
              disabled={busy}
            >
              Revoke
            </button>
          </>
        )}

        {!spent && dead && (
          <button type="button" className="admin-invites__action" onClick={onResend} disabled={busy}>
            Reissue
          </button>
        )}
      </div>
    </li>
  )
}

/* ============ Forms ============ */

function SingleForm({ draft, setDraft, saving, formError, onCancel, onSave }) {
  const set = (key) => (e) => setDraft({ ...draft, [key]: e.target.value })

  return (
    <div className="admin-invites__form">
      <h2 className="admin-invites__form-title">Invite someone</h2>

      <div className="admin-invites__field">
        <label className="admin-invites__label" htmlFor="invite-email">Email</label>
        <input
          id="invite-email"
          type="email"
          className="admin-invites__input"
          value={draft.email}
          onChange={set('email')}
          placeholder="name@example.com"
          autoComplete="off"
        />
      </div>

      <RoleAndExpiry draft={draft} setDraft={setDraft} />

      {formError && <p className="admin-invites__form-error" role="alert">{formError}</p>}

      <div className="admin-invites__form-actions">
        <button type="button" className="admin-invites__save" onClick={onSave} disabled={saving}>
          {saving ? 'Sending' : 'Create and send'}
        </button>
        <button type="button" className="admin-invites__action" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function BulkForm({ draft, setDraft, paste, setPaste, saving, formError, onCancel, onSave }) {
  const found = parseEmailList(paste)

  return (
    <div className="admin-invites__form">
      <h2 className="admin-invites__form-title">Invite many</h2>

      <div className="admin-invites__field">
        <label className="admin-invites__label" htmlFor="invite-paste">Email addresses</label>
        <textarea
          id="invite-paste"
          className="admin-invites__input admin-invites__input--area"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={8}
          placeholder="Paste addresses, one per line or separated by commas."
        />
        <p className="admin-invites__hint">
          {found.length === 0
            ? 'Addresses are picked out of whatever you paste. Duplicates are ignored.'
            : `${found.length} address${found.length === 1 ? '' : 'es'} found.`}
        </p>
      </div>

      <RoleAndExpiry draft={draft} setDraft={setDraft} />

      <p className="admin-invites__hint">
        This creates the invites. Nothing is emailed until you send each one from its row.
      </p>

      {formError && <p className="admin-invites__form-error" role="alert">{formError}</p>}

      <div className="admin-invites__form-actions">
        <button type="button" className="admin-invites__save" onClick={onSave} disabled={saving}>
          {saving ? 'Creating' : `Create ${found.length || ''} invite${found.length === 1 ? '' : 's'}`.trim()}
        </button>
        <button type="button" className="admin-invites__action" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function RoleAndExpiry({ draft, setDraft }) {
  return (
    <div className="admin-invites__field-row">
      <div className="admin-invites__field">
        <label className="admin-invites__label" htmlFor="invite-role">Joining as</label>
        <select
          id="invite-role"
          className="admin-invites__input"
          value={draft.roleHint}
          onChange={(e) => setDraft({ ...draft, roleHint: e.target.value })}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <p className="admin-invites__hint">The role is granted on sign-up. Not set means mentee.</p>
      </div>

      <div className="admin-invites__field admin-invites__field--narrow">
        <label className="admin-invites__label" htmlFor="invite-expiry">Expires in</label>
        <input
          id="invite-expiry"
          type="number"
          className="admin-invites__input"
          value={draft.expiryDays}
          onChange={(e) => setDraft({ ...draft, expiryDays: e.target.value })}
          min={1}
          max={365}
        />
        <p className="admin-invites__hint">Days.</p>
      </div>
    </div>
  )
}

/* ============ Empty ============ */

function EmptyState({ filter, onAdd }) {
  const label = FILTERS.find((f) => f.key === filter)?.label ?? ''

  if (filter !== 'all') {
    return (
      <div className="admin-invites__empty">
        <p className="admin-invites__empty-title">Nothing under {label.toLowerCase()}.</p>
        <p className="admin-invites__empty-body">Invites appear here as they reach that stage.</p>
      </div>
    )
  }

  return (
    <div className="admin-invites__empty">
      <p className="admin-invites__empty-title">No invites yet.</p>
      <p className="admin-invites__empty-body">
        Invite a mentor or a mentee by email. They arrive with their role already granted
        and their address already verified, so there is nothing to approve afterwards.
      </p>
      <button type="button" className="admin-invites__save" onClick={onAdd}>
        Invite the first person
      </button>
    </div>
  )
}

/* ============ Helpers ============ */

function formatDate(iso) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  }).format(new Date(iso))
}

function summarise({ created, skipped, failed }) {
  const parts = []
  if (created.length) parts.push(`${created.length} created`)
  if (skipped.length) parts.push(`${skipped.length} already invited`)
  if (failed.length)  parts.push(`${failed.length} failed`)
  const head = parts.join(', ') || 'Nothing to do'
  return `${head}. Send each invite from its row when you are ready.`
}

function reasonText(reason) {
  if (reason === 'revoked')      return 'That invite was revoked.'
  if (reason === 'expired')      return 'That invite has expired. Reissue it.'
  if (reason === 'already-used') return 'That invite has already been used.'
  return 'Try again in a moment.'
}
