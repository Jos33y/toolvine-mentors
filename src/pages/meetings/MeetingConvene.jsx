import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/shared/Icon/Icon'
import { friendlyAttendeeError } from '@/lib/meetingAttendees'
import { fetchActivePeople, roleLabelsFor, incompleteLabelsFor } from '@/lib/people'
import {
  modeNeedsLink,
  modeNeedsLocation,
  fromLocalInputValue,
  defaultMeetingSlot,
  isPast,
  friendlyMeetingError,
  DURATION_MIN,
  DURATION_MAX,
  DEFAULT_DURATION,
  MODE_ICONS
} from '@/lib/meetings'

// Q19. A meeting that is not a mentoring session: a mentor and a mentee
// brought in to work out what went wrong, or a room full of mentors. It has a
// title because there is no pairing to name it, and it has attendees because
// there is nobody the schema can infer.
//
// Admin only. meeting_attendees_admin_insert is what enforces that; this panel
// is not rendered for anyone else.
export function ConvenePanel({ modes, currentUserId, onCancel, onSubmit }) {
  const [people,  setPeople]  = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')
  const [search,  setSearch]  = useState('')

  const [form, setForm] = useState({
    title:           '',
    scheduledFor:    defaultMeetingSlot(),
    durationMinutes: String(DEFAULT_DURATION),
    mode:            'external',
    externalLink:    '',
    location:        ''
  })

  // profileId to canWriteNotes. Presence in the map is attendance; the value
  // is whether they keep the record.
  const [picked, setPicked] = useState(() => new Map())

  useEffect(() => {
    let cancelled = false
    fetchActivePeople()
      .then((rows) => { if (!cancelled) { setPeople(rows); setLoading(false) } })
      .catch((e) => { if (!cancelled) { setErr(friendlyAttendeeError(e)); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  function toggle(id) {
    setPicked((prev) => {
      const next = new Map(prev)
      if (next.has(id)) next.delete(id)
      else next.set(id, false)
      return next
    })
  }

  function toggleNotes(id) {
    setPicked((prev) => {
      if (!prev.has(id)) return prev
      const next = new Map(prev)
      next.set(id, !next.get(id))
      return next
    })
  }

  const needsLink     = modeNeedsLink(form.mode)
  const needsLocation = modeNeedsLocation(form.mode)
  const past = isPast(fromLocalInputValue(form.scheduledFor))

  const duration    = Number(form.durationMinutes)
  const durationBad = !Number.isFinite(duration) || duration < DURATION_MIN || duration > DURATION_MAX

  const attendees = useMemo(
    () => [...picked.entries()].map(([profileId, canWriteNotes]) => ({ profileId, canWriteNotes })),
    [picked]
  )

  // Anybody already picked stays visible while the search narrows the rest.
  // Filtering somebody out of view after they were chosen makes the count at
  // the foot disagree with the list above it.
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return people
    return people.filter((p) =>
      picked.has(p.id)
      || (p.full_name || '').toLowerCase().includes(q)
      || (p.email || '').toLowerCase().includes(q)
    )
  }, [people, picked, search])

  const keepers = attendees.filter((a) => a.canWriteNotes).length

  // meetings_kind_title_check refuses a blank title, so the form refuses one
  // first rather than letting the write fail after the click.
  const ready = form.title.trim().length > 0
    && form.scheduledFor
    && !durationBad
    && attendees.length > 0
    && (!needsLink || form.externalLink.trim())
    && (!needsLocation || form.location.trim())

  async function submit() {
    if (!ready) return
    setSaving(true)
    setErr('')
    try {
      await onSubmit({ ...form, attendees })
    } catch (e) {
      setErr(friendlyMeetingError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="meetings__panel">
      <h2 className="meetings__panel-title">Convene a meeting</h2>
      <p className="meetings__panel-hint">
        For anything that is not a mentoring session. Give it a title and pick who is in the room.
      </p>

      {err && <p className="meetings__form-error" role="alert">{err}</p>}

      <div className="meetings__fields">
        <label className="meetings__field meetings__field--wide">
          <span className="meetings__label">Title</span>
          <input
            type="text"
            className="meetings__input"
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Review with the mentor team"
            maxLength={120}
            autoFocus
          />
        </label>

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
              That time has already passed. Fine if you are recording something that happened.
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
          </label>
        )}

        <fieldset className="meetings__field meetings__field--wide">
          <legend className="meetings__label">Who is in the room</legend>
          <p className="meetings__hint">
            Everyone here sees the meeting and its action items. Mark who keeps the notes.
            Anyone not marked cannot read them.
          </p>

          {people.length > 8 && (
            <input
              type="search"
              className="meetings__input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              autoComplete="off"
            />
          )}

          {loading ? (
            <div className="meetings__row meetings__row--skel" aria-busy="true" />
          ) : people.length === 0 ? (
            <p className="meetings__hint">No active accounts to add.</p>
          ) : shown.length === 0 ? (
            <p className="meetings__hint">Nobody matches that. Clear the search to see everyone.</p>
          ) : (
            <ul className="convene__people">
              {shown.map((p) => {
                const on = picked.has(p.id)
                return (
                  <li className={'convene__person' + (on ? ' convene__person--on' : '')} key={p.id}>
                    <label className="convene__pick">
                      <input
                        type="checkbox"
                        className="convene__box"
                        checked={on}
                        onChange={() => toggle(p.id)}
                      />
                      <span className="convene__name">
                        {p.full_name}
                        {/* You can attend a meeting you convene, so the row
                            stays. Unmarked it reads as somebody else. */}
                        {p.id === currentUserId && <span className="convene__you"> (you)</span>}
                      </span>
                      {/* Two active accounts share the name Adedoyin Olajumoke
                          Jegede. Without a second line there is no way to pick
                          the right one, and picking the wrong one is silent. */}
                      <span className="convene__title">{p.display_title || p.email}</span>

                      {/* Which side of the table they sit on. All of their
                          roles, not just the highest: somebody who is both a
                          mentor and a mentee is the person most likely to be
                          placed in the wrong room. */}
                      <span className="convene__roles">
                        {roleLabelsFor(p.roles).map((label) => (
                          <span
                            key={label}
                            className={`convene__role convene__role--${label.toLowerCase()}`}
                          >
                            {label}
                          </span>
                        ))}
                        {/* Said rather than hidden. Somebody who has not
                            finished is often the reason for the meeting, so
                            they stay in the list and sort to the bottom. */}
                        {incompleteLabelsFor(p).map((label) => (
                          <span key={label} className="convene__role convene__role--warn">
                            {label}
                          </span>
                        ))}
                      </span>
                    </label>

                    {/* Only offered once somebody is in the room. A note
                        keeper who is not attending is not a thing. */}
                    {on && (
                      <button
                        type="button"
                        className={'convene__notes' + (picked.get(p.id) ? ' convene__notes--on' : '')}
                        onClick={() => toggleNotes(p.id)}
                        aria-pressed={picked.get(p.id) === true}
                      >
                        <Icon name="check" size={12} strokeWidth={2} />
                        <span>Keeps notes</span>
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <p className="meetings__hint">
            {attendees.length === 0
              ? 'Pick at least one person.'
              : `${attendees.length} in the room, ${keepers} keeping notes.`}
          </p>
        </fieldset>
      </div>

      <div className="meetings__panel-actions">
        <button type="button" className="meetings__action" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="meetings__save" onClick={submit} disabled={!ready || saving}>
          {saving ? 'Creating' : 'Convene meeting'}
        </button>
      </div>
    </div>
  )
}
