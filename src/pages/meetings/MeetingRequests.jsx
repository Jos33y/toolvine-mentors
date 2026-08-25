import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import { meetingWhen, timeOfDay } from '@/lib/format'
import {
  friendlyMeetingError,
  modeNeedsLink,
  modeNeedsLocation,
  fromLocalInputValue,
  isPast,
  isStaleRequest,
  dayNumber,
  monthShort,
  defaultMeetingSlot,
  MEETING_STATUS,
  MODE_ICONS,
  MODE_LABELS,
  STATUS_LABELS,
  DURATION_MIN,
  DURATION_MAX,
  DEFAULT_DURATION
} from '@/lib/meetings'

// The request half of the meetings list, split out of Meetings.jsx when that
// file crossed the length cap. Both pieces use the meetings__ block on purpose:
// they render into the same list, on the same page, styled by meetings.css.
// Giving them a block of their own would mean two stylesheets describing one
// row family.

/* ============ Request panel ============ */

// A separate form from SchedulePanel rather than the same one behind a flag.
// There is no pairing to pick, no backfill case to warn about, native modes
// are never offered, and the note is the field that carries the whole point of
// asking. A shared form covering both would be mostly branches.
export function RequestPanel({ pairing, modes, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    scheduledFor:    defaultMeetingSlot(),
    durationMinutes: String(DEFAULT_DURATION),
    mode:            'external',
    externalLink:    '',
    location:        '',
    note:            ''
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const needsLink     = modeNeedsLink(form.mode)
  const needsLocation = modeNeedsLocation(form.mode)
  const past = isPast(fromLocalInputValue(form.scheduledFor))

  const duration = Number(form.durationMinutes)
  const durationBad = !Number.isFinite(duration) || duration < DURATION_MIN || duration > DURATION_MAX

  // request_meeting refuses a past time outright, so this blocks rather than
  // warns. A mentee has no record to correct.
  const ready = form.scheduledFor
    && !past
    && !durationBad
    && (!needsLink || form.externalLink.trim())
    && (!needsLocation || form.location.trim())

  async function submit() {
    if (!ready) return
    setSaving(true)
    setErr('')
    try {
      await onSubmit(form)
    } catch (e) {
      setErr(friendlyMeetingError(e))
    } finally {
      setSaving(false)
    }
  }

  const mentorName = pairing.mentor?.full_name ?? 'your mentor'

  return (
    <div className="meetings__panel">
      <h2 className="meetings__panel-title">Ask {mentorName} for a time</h2>
      <p className="meetings__panel-hint">
        This goes to {mentorName} to accept or decline. Most people send it after
        agreeing a time in conversation, so it confirms something rather than
        arriving as a surprise.
      </p>

      {err && <p className="meetings__form-error" role="alert">{err}</p>}

      <div className="meetings__fields">
        <label className="meetings__field">
          <span className="meetings__label">Date and time</span>
          <input
            type="datetime-local"
            className="meetings__input"
            value={form.scheduledFor}
            onChange={(e) => set({ scheduledFor: e.target.value })}
          />
          {past && (
            <span className="meetings__hint meetings__hint--warn">
              Pick a time that has not passed yet.
            </span>
          )}
        </label>

        <label className="meetings__field">
          <span className="meetings__label">Length in minutes</span>
          <input
            type="number"
            inputMode="numeric"
            className="meetings__input"
            min={DURATION_MIN}
            max={DURATION_MAX}
            step="5"
            value={form.durationMinutes}
            onChange={(e) => set({ durationMinutes: e.target.value })}
          />
          {durationBad && (
            <span className="meetings__hint meetings__hint--warn">
              Between {DURATION_MIN} and {DURATION_MAX} minutes.
            </span>
          )}
        </label>

        <fieldset className="meetings__field meetings__field--wide">
          <legend className="meetings__label">How you would like to meet</legend>
          <div className="meetings__modes">
            {modes.map((m) => (
              <button
                key={m.value}
                type="button"
                className={'meetings__mode' + (form.mode === m.value ? ' meetings__mode--active' : '')}
                onClick={() => set({ mode: m.value, externalLink: '', location: '' })}
                aria-pressed={form.mode === m.value}
              >
                <Icon name={MODE_ICONS[m.value]} size={16} />
                <span className="meetings__mode-label">{m.label}</span>
                <span className="meetings__mode-hint">{m.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {needsLink && (
          <label className="meetings__field meetings__field--wide">
            <span className="meetings__label">Meeting link</span>
            <input
              type="url"
              className="meetings__input"
              placeholder="https://"
              value={form.externalLink}
              onChange={(e) => set({ externalLink: e.target.value })}
              autoComplete="off"
              spellCheck="false"
            />
          </label>
        )}

        {needsLocation && (
          <label className="meetings__field meetings__field--wide">
            <span className="meetings__label">Where</span>
            <input
              type="text"
              className="meetings__input"
              placeholder="Street address, church, or place name"
              value={form.location}
              onChange={(e) => set({ location: e.target.value })}
              autoComplete="off"
            />
          </label>
        )}

        <label className="meetings__field meetings__field--wide">
          <span className="meetings__label">Anything to add, optional</span>
          <textarea
            className="meetings__input meetings__textarea"
            rows={3}
            value={form.note}
            onChange={(e) => set({ note: e.target.value })}
            placeholder="We agreed this on Sunday, or there is something I want to talk through"
            spellCheck="true"
          />
          <span className="meetings__hint">
            {mentorName} reads this with the request.
          </span>
        </label>
      </div>

      <div className="meetings__panel-actions">
        <button type="button" className="meetings__action" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="meetings__save" onClick={submit} disabled={!ready || saving}>
          {saving ? 'Sending' : 'Send request'}
        </button>
      </div>
    </div>
  )
}

/* ============ Request row ============ */

// Its own row rather than a branch inside MeetingRow. A request carries a note
// and a reason that a meeting never has, and its controls answer a question
// rather than manage a session. Same row chrome so the two read as one list.
export function RequestRow({ meeting, viewerId, canAnswer, busy, onAccept, onReject, onWithdraw }) {
  const { scheduledFor, durationMinutes, mode, status, mentor, mentee, requestNote, rejectionReason } = meeting

  const [declining, setDeclining] = useState(false)
  const [reason, setReason]       = useState('')
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false)

  const pending   = status === MEETING_STATUS.PENDING
  const isMine    = mentee?.id === viewerId
  const stale     = isStaleRequest(meeting)
  const canCancel = pending && isMine

  const cls = ['meetings__row', pending ? '' : 'meetings__row--muted'].filter(Boolean).join(' ')

  return (
    <li className={cls}>
      <div className="meetings__when" aria-hidden="true">
        <span className="meetings__when-day">{dayNumber(scheduledFor)}</span>
        <span className="meetings__when-mon">{monthShort(scheduledFor)}</span>
        <span className="meetings__when-time">{timeOfDay(scheduledFor)}</span>
      </div>

      <div className="meetings__body">
        <p className="meetings__who">
          <span>{mentee?.full_name ?? 'Mentee'} asked {mentor?.full_name ?? 'their mentor'}</span>
        </p>

        <p className="meetings__meta">
          <span>{meetingWhen(scheduledFor)}</span>
          {durationMinutes ? <span className="meetings__dot">{`${durationMinutes} min`}</span> : null}
          <span className="meetings__mode-chip">
            <Icon name={MODE_ICONS[mode]} size={12} strokeWidth={1.75} />
            {MODE_LABELS[mode] ?? mode}
          </span>
        </p>

        {requestNote && <p className="meetings__note">{requestNote}</p>}

        {status === MEETING_STATUS.REJECTED && rejectionReason && (
          <p className="meetings__reason">
            <span className="meetings__reason-label">Reason</span>
            <span>{rejectionReason}</span>
          </p>
        )}

        {/* Nothing prunes a request whose time went by unanswered, because
            nothing in this platform prunes anything. The row says so instead. */}
        {stale && (
          <p className="meetings__overdue">
            <Icon name="alert" size={12} strokeWidth={1.75} />
            <span>
              {isMine
                ? 'That time has passed with no answer. Withdraw it and ask for another.'
                : 'That time has passed and this is still waiting on you.'}
            </span>
          </p>
        )}

        {pending && isMine && !stale && (
          <p className="meetings__waiting">
            Waiting on {mentor?.full_name ?? 'your mentor'}. You can withdraw it until they answer.
          </p>
        )}

        {declining && (
          <div className="meetings__reject">
            <label className="meetings__field meetings__field--wide">
              <span className="meetings__label">Why not this time</span>
              <input
                type="text"
                className="meetings__input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="I am travelling that week, try the Saturday after"
                autoFocus
              />
              <span className="meetings__hint">
                {mentee?.full_name ?? 'Your mentee'} reads this, so write it the way you would say it.
              </span>
            </label>
            <div className="meetings__reject-actions">
              <button
                type="button"
                className="meetings__action"
                onClick={() => { setDeclining(false); setReason('') }}
                disabled={busy}
              >
                Keep waiting
              </button>
              <button
                type="button"
                className="meetings__action meetings__action--danger"
                onClick={() => onReject(reason)}
                disabled={busy || reason.trim().length === 0}
              >
                {busy ? 'Declining' : 'Send decline'}
              </button>
            </div>
          </div>
        )}
      </div>

      <span className={`meetings__status meetings__status--${status}`}>
        {STATUS_LABELS[status] ?? status}
      </span>

      <div className="meetings__actions">
        {pending && canAnswer && !declining && (
          <>
            <button type="button" className="meetings__save" onClick={onAccept} disabled={busy}>
              Accept
            </button>
            <button
              type="button"
              className="meetings__action"
              onClick={() => setDeclining(true)}
              disabled={busy}
            >
              Decline
            </button>
          </>
        )}

        <Link className="meetings__action" to={`/meetings/${meeting.id}`}>Open</Link>

        {/* Inline two-step, the D102 pattern. Withdrawing is not destructive
            but it is not reversible either, and one stray tap should not end a
            request somebody waited a week to send. */}
        {canCancel && !confirmingWithdraw && (
          <button
            type="button"
            className="meetings__action"
            onClick={() => setConfirmingWithdraw(true)}
            disabled={busy}
          >
            Withdraw
          </button>
        )}
        {canCancel && confirmingWithdraw && (
          <>
            <button
              type="button"
              className="meetings__action meetings__action--danger"
              onClick={onWithdraw}
              disabled={busy}
            >
              {busy ? 'Withdrawing' : 'Yes, withdraw'}
            </button>
            <button
              type="button"
              className="meetings__action"
              onClick={() => setConfirmingWithdraw(false)}
              disabled={busy}
            >
              Keep it
            </button>
          </>
        )}
      </div>
    </li>
  )
}
