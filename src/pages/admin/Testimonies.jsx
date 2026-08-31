import { useState } from 'react'
import { useAuth } from '@/stores/useAuth'
import { useAdminTestimonies } from '@/hooks/useAdminTestimonies'
import { Icon } from '@/components/shared/Icon/Icon'
import { TestimonyRecordPanel } from './TestimonyRecord'
import {
  TESTIMONY_STATUS,
  TESTIMONY_STATUS_LABELS,
  TESTIMONY_SOURCE_LABELS,
  TESTIMONY_FILTERS,
  DEFAULT_TESTIMONY_FILTER,
  friendlyTestimonyError,
  bodyProblem,
  canEdit,
  canDelete,
  BODY_MAX
} from '@/lib/testimonies'
import './testimonies.css'

// The moderation queue. Same shape as Submissions, because it is the same
// job: a status filter, a paginated list, expand a row to read it whole.
//
// It opens on Waiting rather than All. 0051 put twenty-four fragments here
// that had been on the public wall since launch with nobody able to say where
// they came from, so the first thing this page is for is working through them.
export function Testimonies() {
  const profile = useAuth((s) => s.profile)

  const [status,     setStatus]     = useState(DEFAULT_TESTIMONY_FILTER)
  const [expandedId, setExpandedId] = useState(null)
  const [recording,  setRecording]  = useState(false)
  const [notice,     setNotice]     = useState('')

  const {
    rows, total, page, pageSize, setPage, loading, error, refetch,
    decide, feature, edit, remove
  } = useAdminTestimonies({ status, pageSize: 25 })

  const totalPages = Math.max(1, Math.ceil((total ?? 0) / pageSize))
  const startIdx   = rows.length === 0 ? 0 : page * pageSize + 1
  const endIdx     = Math.min(total ?? 0, page * pageSize + rows.length)

  function changeFilter(next) {
    setStatus(next)
    setExpandedId(null)
    setNotice('')
  }

  return (
    <section className="tst">
      <header className="tst__head">
        <div>
          <h1 className="tst__title">Testimonies</h1>
          {(total ?? 0) > 0 && (
            <p className="tst__head-meta">
              Showing {startIdx} to {endIdx} of {total}
            </p>
          )}
        </div>
        {!recording && (
          <button
            type="button"
            className="tst__new"
            onClick={() => { setRecording(true); setNotice('') }}
          >
            <Icon name="plus" size={16} />
            <span>Record a testimony</span>
          </button>
        )}
      </header>

      {notice && <div className="tst__notice" role="status">{notice}</div>}

      {recording && (
        <TestimonyRecordPanel
          recordedBy={profile?.id ?? null}
          onCancel={() => setRecording(false)}
          onSaved={(row) => {
            setRecording(false)
            setNotice(`${row.display_name} is on the wall.`)
            refetch()
          }}
        />
      )}

      <nav className="tst__filters" aria-label="Filter testimonies by status">
        {TESTIMONY_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={'tst__filter' + (status === f.key ? ' tst__filter--active' : '')}
            onClick={() => changeFilter(f.key)}
            aria-pressed={status === f.key}
          >
            {f.label}
          </button>
        ))}
      </nav>

      {error ? (
        <Panel tone="error">
          We could not load testimonies right now. {friendlyTestimonyError(error)}
        </Panel>
      ) : loading && rows.length === 0 ? (
        <Panel>Loading testimonies.</Panel>
      ) : rows.length === 0 ? (
        <Panel>{emptyFor(status)}</Panel>
      ) : (
        <ul className="tst__list">
          {rows.map((row) => (
            <TestimonyRow
              key={row.id}
              row={row}
              expanded={expandedId === row.id}
              onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
              onDecide={decide}
              onFeature={feature}
              onEdit={edit}
              onRemove={remove}
            />
          ))}
        </ul>
      )}

      {(total ?? 0) > pageSize && (
        <footer className="tst__pagination">
          <button
            type="button"
            className="tst__page-btn"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span className="tst__page-info">Page {page + 1} of {totalPages}</span>
          <button
            type="button"
            className="tst__page-btn"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </footer>
      )}
    </section>
  )
}

/* ============ Row ============ */

function TestimonyRow({ row, expanded, onToggle, onDecide, onFeature, onEdit, onRemove }) {
  const [declining, setDeclining] = useState(false)
  const [reason,    setReason]    = useState('')
  const [editing,   setEditing]   = useState(false)
  const [draft,     setDraft]     = useState({ body: row.body, displayName: row.display_name })
  const [removing,  setRemoving]  = useState(false)
  const [busy,      setBusy]      = useState(false)
  const [err,       setErr]       = useState('')

  const preview   = row.body.slice(0, 140).trim()
  const truncated = row.body.length > 140
  const pending   = row.status === TESTIMONY_STATUS.PENDING
  const approved  = row.status === TESTIMONY_STATUS.APPROVED
  const editable  = canEdit(row)
  const removable = canDelete(row)
  const draftProblem = bodyProblem(draft.body)

  async function run(next, opts) {
    setBusy(true)
    setErr('')
    try {
      await onDecide(row.id, next, opts)
      setDeclining(false)
      setReason('')
    } catch (e) {
      setErr(friendlyTestimonyError(e))
    } finally {
      setBusy(false)
    }
  }

  async function saveEdit() {
    if (draftProblem || draft.displayName.trim().length === 0) return
    setBusy(true)
    setErr('')
    try {
      await onEdit(row.id, { body: draft.body, displayName: draft.displayName })
      setEditing(false)
    } catch (e) {
      setErr(friendlyTestimonyError(e))
    } finally {
      setBusy(false)
    }
  }

  async function confirmRemove() {
    setBusy(true)
    setErr('')
    try {
      await onRemove(row.id)
    } catch (e) {
      setErr(friendlyTestimonyError(e))
      setRemoving(false)
      setBusy(false)
    }
  }

  return (
    <li className={'tst__row' + (expanded ? ' tst__row--open' : '')}>
      <button
        type="button"
        className="tst__row-head"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="tst__row-name">{row.display_name}</span>
        <span className="tst__row-pills">
          <span className={`tst__pill tst__pill--${row.source}`}>
            {TESTIMONY_SOURCE_LABELS[row.source] ?? row.source}
            {row.edition_num ? ` ${row.edition_num}` : ''}
          </span>
          <span className={`tst__pill tst__pill--${row.status}`}>
            {TESTIMONY_STATUS_LABELS[row.status] ?? row.status}
          </span>
          {row.is_featured && <span className="tst__pill tst__pill--featured">Featured</span>}
        </span>
        <span className="tst__row-time">{shortDate(row.created_at)}</span>
      </button>

      {!expanded && (
        <p className="tst__row-preview">{preview}{truncated ? '\u2026' : ''}</p>
      )}

      {expanded && (
        <div className="tst__row-body">
          {editing ? (
            <div className="tst__edit">
              <label className="tst__field tst__field--wide">
                <span className="tst__label">Their words</span>
                <textarea
                  className="tst__textarea"
                  rows={6}
                  value={draft.body}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                  maxLength={BODY_MAX}
                  autoFocus
                />
                <span className="tst__hint">
                  {draftProblem ?? 'Correct the transcription. This is not for rewriting it.'}
                </span>
              </label>

              <label className="tst__field">
                <span className="tst__label">Shown as</span>
                <input
                  type="text"
                  className="tst__input"
                  value={draft.displayName}
                  onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
                  maxLength={60}
                />
              </label>
            </div>
          ) : (
            <p className="tst__row-text">{row.body}</p>
          )}

          <dl className="tst__row-meta">
            <Fact label="Role" value={row.role_label} />
            <Fact
              label="Account"
              value={row.author?.full_name ?? (row.author_id ? 'Linked' : 'None')}
            />
            <Fact label="Recorded by" value={row.recorder?.full_name} />
            {row.rejection_reason && <Fact label="Reason given" value={row.rejection_reason} />}
          </dl>

          {/* Said here rather than only in the record form, because whoever
              approves a row is often not whoever created it. */}
          {!row.author_id && (
            <p className="tst__row-orphan">
              <Icon name="alert" size={14} strokeWidth={1.75} />
              <span>No account behind this one, so nobody can take it down but an admin.</span>
            </p>
          )}

          {err && <p className="tst__form-error" role="alert">{err}</p>}

          {declining ? (
            <div className="tst__decline">
              <label className="tst__field tst__field--wide">
                <span className="tst__label">Why not this one</span>
                <input
                  type="text"
                  className="tst__input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="We could not confirm where this came from"
                  autoFocus
                />
                <span className="tst__hint">
                  {row.author_id
                    ? 'They read this, so write it the way you would say it.'
                    : 'Nobody reads this, but it stays on the record.'}
                </span>
              </label>
              <div className="tst__row-actions">
                <button
                  type="button"
                  className="tst__action"
                  onClick={() => { setDeclining(false); setReason('') }}
                  disabled={busy}
                >
                  Keep waiting
                </button>
                <button
                  type="button"
                  className="tst__action tst__action--danger"
                  onClick={() => run(TESTIMONY_STATUS.REJECTED, { reason })}
                  disabled={busy || reason.trim().length === 0}
                >
                  {busy ? 'Declining' : 'Decline'}
                </button>
              </div>
            </div>
          ) : editing ? (
            <div className="tst__row-actions">
              <button
                type="button"
                className="tst__action"
                onClick={() => {
                  setEditing(false)
                  setDraft({ body: row.body, displayName: row.display_name })
                }}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tst__save"
                onClick={saveEdit}
                disabled={busy || Boolean(draftProblem) || draft.displayName.trim().length === 0}
              >
                {busy ? 'Saving' : 'Save correction'}
              </button>
            </div>
          ) : removing ? (
            <div className="tst__decline">
              {/* Said rather than assumed. Everything else on this page is
                  reversible and this is the one thing that is not. */}
              <p className="tst__row-orphan">
                <Icon name="alert" size={14} strokeWidth={1.75} />
                <span>
                  This removes the row entirely. The decline stays in the activity log,
                  the words do not.
                </span>
              </p>
              <div className="tst__row-actions">
                <button
                  type="button"
                  className="tst__action"
                  onClick={() => setRemoving(false)}
                  disabled={busy}
                >
                  Keep it
                </button>
                <button
                  type="button"
                  className="tst__action tst__action--danger"
                  onClick={confirmRemove}
                  disabled={busy}
                >
                  {busy ? 'Removing' : 'Remove for good'}
                </button>
              </div>
            </div>
          ) : (
            <div className="tst__row-actions">
              {!approved && (
                <button
                  type="button"
                  className="tst__save"
                  onClick={() => run(TESTIMONY_STATUS.APPROVED)}
                  disabled={busy}
                >
                  {busy ? 'Publishing' : 'Publish'}
                </button>
              )}
              {approved && (
                <button
                  type="button"
                  className="tst__action"
                  onClick={() => onFeature(row.id, !row.is_featured)}
                  disabled={busy}
                >
                  {row.is_featured ? 'Unfeature' : 'Feature'}
                </button>
              )}
              {approved && (
                <button
                  type="button"
                  className="tst__action"
                  onClick={() => run(TESTIMONY_STATUS.WITHDRAWN)}
                  disabled={busy}
                >
                  Take down
                </button>
              )}
              {pending && (
                <button
                  type="button"
                  className="tst__action tst__action--danger"
                  onClick={() => { setDeclining(true); setErr('') }}
                  disabled={busy}
                >
                  Decline
                </button>
              )}
              {/* A relay or a Vinethoughts fragment is a transcription and can
                  be corrected. A member wrote their own, so it cannot, and the
                  control is absent rather than failing on save. */}
              {editable && (
                <button
                  type="button"
                  className="tst__action"
                  onClick={() => { setEditing(true); setErr('') }}
                  disabled={busy}
                >
                  Correct
                </button>
              )}
              {removable && (
                <button
                  type="button"
                  className="tst__action tst__action--danger"
                  onClick={() => { setRemoving(true); setErr('') }}
                  disabled={busy}
                >
                  Remove
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  )
}

/* ============ Pieces ============ */

function Fact({ label, value }) {
  if (!value) return null
  return (
    <div className="tst__fact">
      <dt className="tst__fact-label">{label}</dt>
      <dd className="tst__fact-value">{value}</dd>
    </div>
  )
}

function Panel({ tone, children }) {
  return (
    <div className={'tst__state' + (tone === 'error' ? ' tst__state--error' : '')}>
      <p className="tst__state-text">{children}</p>
    </div>
  )
}

function emptyFor(status) {
  switch (status) {
    case 'pending':   return 'Nothing waiting. Every testimony has been answered.'
    case 'approved':  return 'Nothing published yet. Publish one and it appears on the wall.'
    case 'rejected':  return 'Nothing declined.'
    case 'withdrawn': return 'Nothing withdrawn. Authors can take their own down at any time.'
    default:          return 'No testimonies yet.'
  }
}

function shortDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
