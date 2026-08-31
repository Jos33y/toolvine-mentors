import { useState } from 'react'
import { Icon } from '@/components/shared/Icon/Icon'
import {
  modeNeedsLink,
  modeNeedsLocation,
  toLocalInputValue,
  fromLocalInputValue,
  isPast,
  friendlyMeetingError,
  DURATION_MIN,
  DURATION_MAX,
  MODE_ICONS,
  MEETING_KIND
} from '@/lib/meetings'

// Lifted out of Meeting.jsx when convened meetings pushed that file past 900
// lines. Both are presentational, both take everything they need as props, and
// neither reads Supabase.

/* ============ Reschedule ============ */

export function ReschedulePanel({ meeting, modes, onCancel, onSubmit }) {
  const convened = meeting.kind === MEETING_KIND.ADMIN

  const [form, setForm] = useState({
    scheduledFor:    toLocalInputValue(meeting.scheduledFor),
    durationMinutes: String(meeting.durationMinutes ?? 60),
    mode:            meeting.mode,
    externalLink:    meeting.externalLink ?? '',
    location:        meeting.location ?? ''
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const needsLink     = modeNeedsLink(form.mode)
  const needsLocation = modeNeedsLocation(form.mode)
  const past = isPast(fromLocalInputValue(form.scheduledFor))

  const duration = Number(form.durationMinutes)
  const durationBad = !Number.isFinite(duration) || duration < DURATION_MIN || duration > DURATION_MAX
  const unchanged = fromLocalInputValue(form.scheduledFor) === meeting.scheduledFor
    && Number(form.durationMinutes) === meeting.durationMinutes
    && form.mode === meeting.mode
    && (form.externalLink || '') === (meeting.externalLink || '')
    && (form.location || '') === (meeting.location || '')

  const ready = form.scheduledFor
    && !durationBad
    && !unchanged
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

  return (
    <div className="meeting__edit">
      <h2 className="meeting__edit-title">Move this meeting</h2>
      <p className="meeting__edit-hint">
        {convened
          ? 'Everyone on the meeting is notified of the new time. Everything else about the meeting stays as it is.'
          : 'Both of you are emailed with the old time and the new one. Everything else about the meeting stays as it is.'}
      </p>

      {err && <p className="meeting__edit-error" role="alert">{err}</p>}

      <div className="meeting__edit-fields">
        <label className="meeting__field">
          <span className="meeting__field-label">Date and time</span>
          <input
            type="datetime-local"
            className="meeting__input"
            value={form.scheduledFor}
            onChange={(e) => set({ scheduledFor: e.target.value })}
          />
          {past && (
            <span className="meeting__field-hint">
              That time has already passed. Fine if you are correcting the record.
            </span>
          )}
        </label>

        <label className="meeting__field">
          <span className="meeting__field-label">Length in minutes</span>
          <input
            type="number"
            inputMode="numeric"
            className="meeting__input"
            min={DURATION_MIN}
            max={DURATION_MAX}
            step="5"
            value={form.durationMinutes}
            onChange={(e) => set({ durationMinutes: e.target.value })}
          />
          {durationBad && (
            <span className="meeting__field-hint">
              Between {DURATION_MIN} and {DURATION_MAX} minutes.
            </span>
          )}
        </label>

        <fieldset className="meeting__field meeting__field--wide">
          <legend className="meeting__field-label">How you are meeting</legend>
          <div className="meeting__modes">
            {modes.map((m) => (
              <button
                key={m.value}
                type="button"
                className={'meeting__mode-btn' + (form.mode === m.value ? ' meeting__mode-btn--active' : '')}
                onClick={() => set({ mode: m.value, externalLink: '', location: '' })}
                aria-pressed={form.mode === m.value}
              >
                <Icon name={MODE_ICONS[m.value]} size={16} />
                <span className="meeting__mode-btn-label">{m.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {needsLink && (
          <label className="meeting__field meeting__field--wide">
            <span className="meeting__field-label">Meeting link</span>
            <input
              type="url"
              className="meeting__input"
              placeholder="https://"
              value={form.externalLink}
              onChange={(e) => set({ externalLink: e.target.value })}
              autoComplete="off"
              spellCheck="false"
            />
          </label>
        )}

        {needsLocation && (
          <label className="meeting__field meeting__field--wide">
            <span className="meeting__field-label">Where</span>
            <input
              type="text"
              className="meeting__input"
              placeholder="Street address, church, or place name"
              value={form.location}
              onChange={(e) => set({ location: e.target.value })}
              autoComplete="off"
            />
          </label>
        )}
      </div>

      <div className="meeting__edit-actions">
        <button type="button" className="meeting__action" onClick={onCancel} disabled={saving}>
          Keep as is
        </button>
        <button type="button" className="meeting__cta" onClick={submit} disabled={!ready || saving}>
          {saving ? 'Moving' : 'Move meeting'}
        </button>
      </div>
    </div>
  )
}

/* ============ Confirm ============ */

export function ConfirmDialog({ kind, meeting, busy, onCancel, onConfirm }) {
  const convened   = meeting.kind === MEETING_KIND.ADMIN
  const who        = meeting.mentee?.full_name ?? 'your mentee'
  const mentorName = meeting.mentor?.full_name ?? 'your mentor'

  const copy = {
    cancel: {
      title:   convened
        ? `Cancel ${meeting.title || 'this meeting'}?`
        : `Cancel this meeting with ${who}?`,
      body:    convened
        ? 'It stays on the record as cancelled rather than disappearing, and everyone on it is told.'
        : 'It stays on the record as cancelled rather than disappearing. You can schedule a new one at any time.',
      confirm: 'Cancel meeting',
      danger:  true
    },
    reopen: {
      title:   'Reopen this meeting?',
      body:    'It goes back to scheduled and its completion time is cleared. Use this only when it was marked completed by mistake.',
      confirm: 'Reopen',
      danger:  false
    },
    withdraw: {
      title:   'Withdraw this request?',
      body:    `${mentorName} will see that you took it back. Nothing is lost, and you can ask for another time whenever you are ready.`,
      confirm: 'Withdraw request',
      danger:  true
    }
  }[kind]

  return (
    <div className="meeting__overlay" role="dialog" aria-modal="true" aria-labelledby="meeting-confirm">
      <div className="meeting__dialog">
        <h2 className="meeting__dialog-title" id="meeting-confirm">{copy.title}</h2>
        <p className="meeting__dialog-body">{copy.body}</p>
        <div className="meeting__dialog-actions">
          <button type="button" className="meeting__action" onClick={onCancel} disabled={busy}>
            Keep as is
          </button>
          <button
            type="button"
            className={'meeting__cta' + (copy.danger ? ' meeting__cta--danger' : '')}
            onClick={onConfirm}
            disabled={busy}
            autoFocus
          >
            {busy ? 'Working' : copy.confirm}
          </button>
        </div>
      </div>
    </div>
  )
}
