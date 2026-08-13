import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import { pairedSinceLabel, pairingRangeLabel } from '@/lib/format'
import {
  fetchPairingBoard,
  countScheduledMeetings,
  createPairing,
  endPairing,
  reassignPairing,
  sendPairingEmail,
  friendlyPairingError,
  PAIRING_FILTERS,
  DEFAULT_PAIRING_FILTER
} from '@/lib/pairings'
import './pairings.css'

export function Pairings() {
  const [board,   setBoard]   = useState({ pairings: [], mentors: [], mentees: [] })
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [notice,  setNotice]  = useState('')

  // Filter lives in the URL so a dashboard link can land on a subset.
  // Search stays in state to avoid history churn, matching the Users page.
  const [searchParams, setSearchParams] = useSearchParams()
  const rawFilter = searchParams.get('filter')
  const filter = PAIRING_FILTERS.some((f) => f.key === rawFilter) ? rawFilter : DEFAULT_PAIRING_FILTER

  const [query, setQuery] = useState('')

  // panel is the assign surface. mode 'assign' creates, mode 'reassign' moves
  // a mentee who already has a mentor.
  const [panel,     setPanel]     = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState('')

  const [pending, setPending] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setBoard(await fetchPairingBoard())
    } catch (e) {
      setError(friendlyPairingError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setFilter = (next) => {
    const params = new URLSearchParams(searchParams)
    if (next === DEFAULT_PAIRING_FILTER) params.delete('filter')
    else params.set('filter', next)
    setSearchParams(params, { replace: true })
  }

  // A write moves the row to a different tab. Landing on Active shows the
  // result rather than the list it just left.
  const showResult = () => setFilter('active')

  const counts = useMemo(() => ({
    active:   board.pairings.filter((p) => p.isActive).length,
    unpaired: board.mentees.filter((m) => !m.activePairingId).length,
    ended:    board.pairings.filter((p) => !p.isActive).length
  }), [board])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (filter === 'unpaired') {
      return board.mentees.filter((m) => !m.activePairingId).filter((m) => matchesPerson(m, q))
    }
    const wantActive = filter === 'active'
    return board.pairings
      .filter((p) => p.isActive === wantActive)
      .filter((p) => matchesPerson(p.mentor, q) || matchesPerson(p.mentee, q))
  }, [board, filter, query])

  const mentorById = useMemo(
    () => new Map(board.mentors.map((m) => [m.id, m])),
    [board.mentors]
  )

  /* ============ Panel ============ */

  function openAssign(menteeId = null) {
    setFormError('')
    setNotice('')
    setPanel({ mode: 'assign', menteeId, mentorId: null })
  }

  function openReassign(pairing) {
    setFormError('')
    setNotice('')
    setPanel({
      mode:      'reassign',
      menteeId:  pairing.mentee.id,
      mentorId:  null,
      pairingId: pairing.id,
      currentMentorId: pairing.mentor.id
    })
  }

  function closePanel() {
    setPanel(null)
    setFormError('')
  }

  // A new pairing takes effect immediately and is reversible, so it needs no
  // confirmation. A reassignment ends a relationship and cancels meetings, so
  // it routes through the dialog with the same copy an end gets.
  async function submitPanel() {
    if (!panel?.mentorId || !panel?.menteeId) return

    if (panel.mode === 'reassign') {
      const pairing = board.pairings.find((p) => p.id === panel.pairingId)
      if (pairing) askConfirm({ kind: 'reassign', pairing, nextMentorId: panel.mentorId })
      return
    }

    const mentor = mentorById.get(panel.mentorId)
    const mentee = board.mentees.find((m) => m.id === panel.menteeId)

    setSaving(true)
    setFormError('')
    try {
      const row = await createPairing(
        panel.mentorId,
        panel.menteeId,
        `${mentor?.full_name} and ${mentee?.full_name}`
      )
      const mail = await sendPairingEmail(row?.id, 'created')
      setNotice(
        `${mentee?.full_name} is now paired with ${mentor?.full_name}. ` +
        (mail.sent ? 'Both have been emailed.' : 'The notification email did not send.')
      )
      closePanel()
      showResult()
      await load()
    } catch (e) {
      setFormError(friendlyPairingError(e))
    } finally {
      setSaving(false)
    }
  }

  /* ============ Confirm ============ */

  // The count is read before the write so the dialog can state it. end_pairing
  // returns the real count afterwards, and that is what the notice reports.
  async function askConfirm(next) {
    setPending({ ...next, count: null, counting: true })
    try {
      const count = await countScheduledMeetings(next.pairing.id)
      setPending((p) => (p && p.pairing.id === next.pairing.id ? { ...p, count, counting: false } : p))
    } catch {
      setPending((p) => (p && p.pairing.id === next.pairing.id ? { ...p, count: null, counting: false } : p))
    }
  }

  async function runConfirm() {
    if (!pending) return
    const { kind, pairing, nextMentorId } = pending
    setSaving(true)
    try {
      if (kind === 'end') {
        const { meetingsCancelled } = await endPairing(
          pairing.id,
          `${pairing.mentor.full_name} and ${pairing.mentee.full_name}`
        )
        setNotice(
          `Pairing ended. ${meetingsCancelled === 0
            ? 'No scheduled meetings were affected.'
            : `${meetingsCancelled} scheduled ${meetingsCancelled === 1 ? 'meeting was' : 'meetings were'} cancelled.`}`
        )
      } else {
        const mentor = mentorById.get(nextMentorId)
        const row = await reassignPairing(
          pairing.mentee.id,
          nextMentorId,
          `${pairing.mentee.full_name} to ${mentor?.full_name}`
        )
        const mail = await sendPairingEmail(row?.id, 'changed', pairing.mentor.id)
        setNotice(
          `${pairing.mentee.full_name} moved from ${pairing.mentor.full_name} to ${mentor?.full_name}. ` +
          (mail.sent ? 'All three have been emailed.' : 'The notification email did not send.')
        )
        closePanel()
      }
      setPending(null)
      showResult()
      await load()
    } catch (e) {
      setError(friendlyPairingError(e))
      setPending(null)
    } finally {
      setSaving(false)
    }
  }

  /* ============ Render ============ */

  const selectedMentee = panel?.menteeId
    ? board.mentees.find((m) => m.id === panel.menteeId) ?? null
    : null

  return (
    <section className="admin-pairings">
      <header className="admin-pairings__head">
        <div>
          <p className="admin-pairings__eyebrow">Admin</p>
          <h1 className="admin-pairings__title">Pairings</h1>
          <p className="admin-pairings__lede">
            Assign a mentor to a mentee, move a mentee to someone new, or end a pairing.
            History stays on the record.
          </p>
        </div>
        {!panel && (
          <button type="button" className="admin-pairings__new" onClick={() => openAssign()}>
            <Icon name="plus" size={16} />
            <span>Assign mentor</span>
          </button>
        )}
      </header>

      {error && <div className="admin-pairings__alert" role="alert">{error}</div>}
      {notice && <div className="admin-pairings__notice" role="status">{notice}</div>}

      {panel && (
        <AssignPanel
          panel={panel}
          mentors={board.mentors}
          mentees={board.mentees}
          selectedMentee={selectedMentee}
          saving={saving}
          formError={formError}
          onPick={(patch) => setPanel((p) => ({ ...p, ...patch }))}
          onCancel={closePanel}
          onSubmit={submitPanel}
        />
      )}

      <nav className="admin-pairings__filters" aria-label="Filter pairings">
        {PAIRING_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={'admin-pairings__filter' + (filter === f.key ? ' admin-pairings__filter--active' : '')}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
          >
            <span>{f.label}</span>
            <span className="admin-pairings__filter-count">{counts[f.key] ?? 0}</span>
          </button>
        ))}
      </nav>

      <div className="admin-pairings__search">
        <Icon name="search" size={16} />
        <input
          type="search"
          className="admin-pairings__search-input"
          placeholder="Search by name or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck="false"
        />
      </div>

      {loading ? (
        <ul className="admin-pairings__list" aria-busy="true">
          {[0, 1, 2].map((i) => <li key={i} className="admin-pairings__row admin-pairings__row--skel" />)}
        </ul>
      ) : rows.length === 0 ? (
        <EmptyPanel
          filter={filter}
          query={query}
          onAssign={panel ? null : () => openAssign()}
        />
      ) : filter === 'unpaired' ? (
        <ul className="admin-pairings__list">
          {rows.map((m) => (
            <MenteeRow key={m.id} mentee={m} onAssign={() => openAssign(m.id)} />
          ))}
        </ul>
      ) : (
        <ul className="admin-pairings__list">
          {rows.map((p) => (
            <PairingRow
              key={p.id}
              pairing={p}
              onReassign={() => openReassign(p)}
              onEnd={() => askConfirm({ kind: 'end', pairing: p })}
            />
          ))}
        </ul>
      )}

      {pending && (
        <ConfirmDialog
          pending={pending}
          mentorName={pending.nextMentorId ? mentorById.get(pending.nextMentorId)?.full_name : null}
          busy={saving}
          onCancel={() => setPending(null)}
          onConfirm={runConfirm}
        />
      )}
    </section>
  )
}

/* ============ Assign panel ============ */

function AssignPanel({ panel, mentors, mentees, selectedMentee, saving, formError, onPick, onCancel, onSubmit }) {
  const reassigning = panel.mode === 'reassign'
  const pickable = mentees.filter((m) => !m.activePairingId)
  const ready = Boolean(panel.mentorId && panel.menteeId)

  return (
    <div className="admin-pairings__panel">
      <h2 className="admin-pairings__panel-title">
        {reassigning ? `Move ${selectedMentee?.full_name} to a new mentor` : 'Assign a mentor'}
      </h2>
      <p className="admin-pairings__panel-hint">
        Only people with a finished profile can be paired. Everyone else is listed with the reason.
      </p>

      {formError && <p className="admin-pairings__form-error" role="alert">{formError}</p>}

      <div className="admin-pairings__columns">
        <fieldset className="admin-pairings__column">
          <legend className="admin-pairings__column-title">
            Mentor
            <span className="admin-pairings__column-count">{mentors.length}</span>
          </legend>
          <div className="admin-pairings__picker">
            {mentors.length === 0 && (
              <p className="admin-pairings__picker-empty">No one holds the mentor role yet.</p>
            )}
            {mentors.map((m) => (
              <PersonOption
                key={m.id}
                person={m}
                selected={panel.mentorId === m.id}
                blockedReason={m.id === panel.currentMentorId ? 'Current mentor' : (m.eligible ? null : m.reason)}
                detail={m.eligible ? `${m.menteeCount} ${m.menteeCount === 1 ? 'mentee' : 'mentees'}` : null}
                onSelect={() => onPick({ mentorId: m.id })}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="admin-pairings__column">
          <legend className="admin-pairings__column-title">
            Mentee
            <span className="admin-pairings__column-count">{reassigning ? 1 : pickable.length}</span>
          </legend>
          <div className="admin-pairings__picker">
            {reassigning ? (
              <PersonOption person={selectedMentee} selected locked />
            ) : pickable.length === 0 ? (
              <p className="admin-pairings__picker-empty">Every mentee already has a mentor.</p>
            ) : (
              pickable.map((m) => (
                <PersonOption
                  key={m.id}
                  person={m}
                  selected={panel.menteeId === m.id}
                  blockedReason={m.eligible ? null : m.reason}
                  onSelect={() => onPick({ menteeId: m.id })}
                />
              ))
            )}
          </div>
        </fieldset>
      </div>

      <div className="admin-pairings__panel-actions">
        <button type="button" className="admin-pairings__action" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button
          type="button"
          className="admin-pairings__save"
          onClick={onSubmit}
          disabled={!ready || saving}
        >
          {saving ? 'Working' : reassigning ? 'Review the move' : 'Create pairing'}
        </button>
      </div>
    </div>
  )
}

function PersonOption({ person, selected, blockedReason, detail, locked, onSelect }) {
  if (!person) return null
  const blocked = Boolean(blockedReason)

  return (
    <button
      type="button"
      className={
        'admin-pairings__option' +
        (selected ? ' admin-pairings__option--selected' : '') +
        (blocked ? ' admin-pairings__option--blocked' : '')
      }
      onClick={onSelect}
      disabled={blocked || locked}
      aria-pressed={locked ? undefined : Boolean(selected)}
    >
      <span className="admin-pairings__avatar" aria-hidden="true">
        {person.photo_url
          ? <img src={person.photo_url} alt="" className="admin-pairings__avatar-img" />
          : initials(person.full_name)}
      </span>
      <span className="admin-pairings__option-text">
        <span className="admin-pairings__option-name">{person.full_name}</span>
        {/* Email always shows. Two people can share a first name, and the
            reason alone leaves them indistinguishable. */}
        <span className="admin-pairings__option-meta">{person.email}</span>
        {(blocked || detail) && (
          <span className="admin-pairings__option-detail">
            {blocked && <span className="admin-pairings__option-reason">{blockedReason}</span>}
            {detail && <span className="admin-pairings__option-count">{detail}</span>}
          </span>
        )}
        {person.focus?.length > 0 && (
          <span className="admin-pairings__focus">
            {person.focus.slice(0, 3).map((f) => (
              <span key={f.categoryId} className="admin-pairings__focus-tag">{f.label}</span>
            ))}
          </span>
        )}
      </span>
      {selected && !locked && <Icon name="check" size={16} />}
    </button>
  )
}

/* ============ Rows ============ */

function PairingRow({ pairing, onReassign, onEnd }) {
  const { mentor, mentee, isActive, startedAt, endedAt, mentorInactive } = pairing

  return (
    <li className={'admin-pairings__row' + (isActive ? '' : ' admin-pairings__row--ended')}>
      <div className="admin-pairings__pair">
        <Person person={mentor} role="Mentor" />
        <span className="admin-pairings__link" aria-hidden="true"><Icon name="pairings" size={18} /></span>
        <Person person={mentee} role="Mentee" />
      </div>

      <div className="admin-pairings__meta">
        <p className="admin-pairings__since">
          {isActive
            ? `Since ${pairedSinceLabel(startedAt)}`
            : pairingRangeLabel(startedAt, endedAt)}
        </p>
        {mentorInactive && (
          <span className="admin-pairings__pill admin-pairings__pill--warn">Mentor deactivated</span>
        )}
      </div>

      {isActive && (
        <div className="admin-pairings__actions">
          <button type="button" className="admin-pairings__action" onClick={onReassign}>Reassign</button>
          <button type="button" className="admin-pairings__action admin-pairings__action--danger" onClick={onEnd}>End</button>
        </div>
      )}
    </li>
  )
}

function MenteeRow({ mentee, onAssign }) {
  return (
    <li className={'admin-pairings__row' + (mentee.eligible ? '' : ' admin-pairings__row--ended')}>
      <div className="admin-pairings__pair">
        <Person person={mentee} role="Mentee" />
      </div>

      <div className="admin-pairings__meta">
        {mentee.eligible
          ? <p className="admin-pairings__since">Waiting for a mentor</p>
          : <span className="admin-pairings__pill">{mentee.reason}</span>}
        {mentee.focus?.length > 0 && (
          <span className="admin-pairings__focus">
            {mentee.focus.slice(0, 3).map((f) => (
              <span key={f.categoryId} className="admin-pairings__focus-tag">{f.label}</span>
            ))}
          </span>
        )}
      </div>

      <div className="admin-pairings__actions">
        <button
          type="button"
          className="admin-pairings__action"
          onClick={onAssign}
          disabled={!mentee.eligible}
        >
          Assign mentor
        </button>
      </div>
    </li>
  )
}

function Person({ person, role }) {
  if (!person) return null
  return (
    <span className="admin-pairings__person">
      <span className="admin-pairings__avatar" aria-hidden="true">
        {person.photo_url
          ? <img src={person.photo_url} alt="" className="admin-pairings__avatar-img" />
          : initials(person.full_name)}
      </span>
      <span className="admin-pairings__person-text">
        <span className="admin-pairings__person-role">{role}</span>
        <span className="admin-pairings__person-name">{person.full_name}</span>
      </span>
    </span>
  )
}

/* ============ Confirm dialog ============ */

function ConfirmDialog({ pending, mentorName, busy, onCancel, onConfirm }) {
  const { kind, pairing, count, counting } = pending
  const ending = kind === 'end'
  const title = ending
    ? `End the pairing with ${pairing.mentee.full_name}?`
    : `Move ${pairing.mentee.full_name} to ${mentorName}?`

  return (
    <div className="admin-pairings__overlay" role="dialog" aria-modal="true" aria-labelledby="pairing-confirm">
      <div className="admin-pairings__dialog">
        <h2 className="admin-pairings__dialog-title" id="pairing-confirm">{title}</h2>
        <p className="admin-pairings__dialog-body">
          {ending
            ? `${pairing.mentor.full_name} keeps the record of every meeting and note. The pairing stays in history.`
            : `The pairing with ${pairing.mentor.full_name} ends and a new one starts in the same step.`}
        </p>
        <p className="admin-pairings__dialog-warning" role="note">
          {counting
            ? 'Checking scheduled meetings'
            : count === null
              ? 'Scheduled meetings under this pairing will be cancelled.'
              : count === 0
                ? 'There are no scheduled meetings to cancel.'
                : `${count} scheduled ${count === 1 ? 'meeting' : 'meetings'} will be cancelled. Completed meetings are untouched.`}
        </p>
        <div className="admin-pairings__dialog-actions">
          <button type="button" className="admin-pairings__action" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="admin-pairings__save admin-pairings__save--danger"
            onClick={onConfirm}
            disabled={busy || counting}
            autoFocus
          >
            {busy ? 'Working' : ending ? 'End pairing' : 'Move mentee'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============ Empty ============ */

function EmptyPanel({ filter, query, onAssign }) {
  if (query) {
    return (
      <div className="admin-pairings__empty">
        <p className="admin-pairings__empty-title">Nobody matches that search</p>
        <p className="admin-pairings__empty-body">Try a different name or email address.</p>
      </div>
    )
  }

  const copy = {
    active: {
      title: 'No active pairings yet',
      body:  'Assign a mentor to a mentee and the pairing appears here. Both of them see it on their own dashboard the moment it is created.',
      cta:   true
    },
    unpaired: {
      title: 'Every mentee has a mentor',
      body:  'New mentees appear here as soon as they finish setting up their profile.',
      cta:   false
    },
    ended: {
      title: 'No pairings have ended',
      body:  'When a pairing ends it moves here with its dates. Nothing is ever deleted.',
      cta:   false
    }
  }[filter]

  return (
    <div className="admin-pairings__empty">
      <p className="admin-pairings__empty-title">{copy.title}</p>
      <p className="admin-pairings__empty-body">{copy.body}</p>
      {copy.cta && onAssign && (
        <button type="button" className="admin-pairings__save" onClick={onAssign}>Assign mentor</button>
      )}
    </div>
  )
}

/* ============ Helpers ============ */

function matchesPerson(person, q) {
  if (!q) return true
  if (!person) return false
  return (person.full_name || '').toLowerCase().includes(q)
      || (person.email || '').toLowerCase().includes(q)
}

function initials(full) {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
