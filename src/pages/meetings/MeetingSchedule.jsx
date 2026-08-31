import { useEffect, useState } from 'react'
import { Icon } from '@/components/shared/Icon/Icon'
import {
  modeNeedsLink,
  modeNeedsLocation,
  modeUsesMentorPhone,
  mentorPhone,
  fromLocalInputValue,
  defaultMeetingSlot,
  isPast,
  friendlyMeetingError,
  DURATION_MIN,
  DURATION_MAX,
  DEFAULT_DURATION,
  MODE_ICONS
} from '@/lib/meetings'

// The pairing scheduler, lifted out of Meetings.jsx when the convene panel
// took that file past 880 lines. Sibling of MeetingRequests.jsx and
// MeetingConvene.jsx: one panel per file, each taking what it needs as props.

/* ============ Schedule panel ============ */

export function SchedulePanel({ pairings, modes, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    pairingId:       pairings[0]?.id ?? '',
    scheduledFor:    defaultMeetingSlot(),
    durationMinutes: String(DEFAULT_DURATION),
    mode:            'external',
    externalLink:    '',
    location:        ''
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!form.pairingId && pairings[0]?.id) {
      setForm((f) => ({ ...f, pairingId: pairings[0].id }))
    }
  }, [pairings, form.pairingId])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const needsLink     = modeNeedsLink(form.mode)
  const needsLocation = modeNeedsLocation(form.mode)
  const usesPhone     = modeUsesMentorPhone(form.mode)
  const past = isPast(fromLocalInputValue(form.scheduledFor))

  const selected = pairings.find((p) => p.id === form.pairingId) ?? null
  const phone    = usesPhone ? mentorPhone(selected?.mentor) : null

  const duration = Number(form.durationMinutes)
  const durationBad = !Number.isFinite(duration) || duration < DURATION_MIN || duration > DURATION_MAX
  const ready = form.pairingId
    && form.scheduledFor
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

  if (pairings.length === 0) {
    return (
      <div className="meetings__panel">
        <h2 className="meetings__panel-title">No active pairings</h2>
        <p className="meetings__panel-hint">
          Meetings sit under a pairing. Once you have an active pairing you can schedule against it.
        </p>
        <div className="meetings__panel-actions">
          <button type="button" className="meetings__action" onClick={onCancel}>Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="meetings__panel">
      <h2 className="meetings__panel-title">Schedule a meeting</h2>
      <p className="meetings__panel-hint">
        One screen. Pick who, when, and how you are meeting.
      </p>

      {err && <p className="meetings__form-error" role="alert">{err}</p>}

      <div className="meetings__fields">
        <label className="meetings__field meetings__field--wide">
          <span className="meetings__label">Pairing</span>
          <select
            className="meetings__input"
            value={form.pairingId}
            onChange={(e) => set({ pairingId: e.target.value })}
          >
            {pairings.map((p) => (
              <option key={p.id} value={p.id}>
                {p.mentor?.full_name} and {p.mentee?.full_name}
              </option>
            ))}
          </select>
        </label>

        <label className="meetings__field">
          <span className="meetings__label">Date and time</span>
          <input
            type="datetime-local"
            className="meetings__input"
            value={form.scheduledFor}
            onChange={(e) => set({ scheduledFor: e.target.value })}
          />
          {/* D18. Backfilling a meeting that already happened is legitimate
              and this community will do it, so this warns rather than blocks. */}
          {past && (
            <span className="meetings__hint meetings__hint--warn">
              That time has already passed. Fine if you are recording a meeting that happened.
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
          <legend className="meetings__label">How you are meeting</legend>
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
            <span className="meetings__hint">
              Both of you see this on the meeting, so write it the way you would give directions.
            </span>
          </label>
        )}

        {/* A phone meeting has no field. The number is read off the mentor's
            profile rather than copied onto the meeting row. */}
        {usesPhone && (
          <div className="meetings__field meetings__field--wide">
            <span className="meetings__label">Phone</span>
            <p className={'meetings__phone' + (phone ? '' : ' meetings__phone--missing')}>
              {phone
                ? `${selected?.mentor?.full_name ?? 'The mentor'} will call from ${phone}. Your mentee sees this on the meeting.`
                : `${selected?.mentor?.full_name ?? 'The mentor'} has no phone number saved, so the mentee will not know who to expect a call from. Add one on the profile page.`}
            </p>
          </div>
        )}
      </div>

      <div className="meetings__panel-actions">
        <button type="button" className="meetings__action" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="meetings__save" onClick={submit} disabled={!ready || saving}>
          {saving ? 'Scheduling' : 'Schedule meeting'}
        </button>
      </div>
    </div>
  )
}
