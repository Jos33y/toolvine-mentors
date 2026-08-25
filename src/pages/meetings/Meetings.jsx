import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import { useFlag } from '@/hooks/useFlag'
import { isOn, FLAG_KEYS } from '@/lib/flags'
import { Icon } from '@/components/shared/Icon/Icon'
import { meetingWhen, timeOfDay } from '@/lib/format'
import {
  fetchMeetings,
  fetchSchedulablePairings,
  fetchRequestablePairing,
  countPendingRequests,
  createMeeting,
  completeMeeting,
  cancelMeeting,
  requestMeeting,
  acceptMeetingRequest,
  rejectMeetingRequest,
  withdrawMeetingRequest,
  sendMeetingEmail,
  friendlyMeetingError,
  availableModes,
  requestableModes,
  modeNeedsLink,
  modeNeedsLocation,
  modeUsesMentorPhone,
  mentorPhone,
  fromLocalInputValue,
  isPast,
  dayNumber,
  monthShort,
  defaultMeetingSlot,
  opensForCompletionIn,
  MEETING_FILTERS,
  DEFAULT_MEETING_FILTER,
  MEETING_STATUS,
  MODE_ICONS,
  MODE_LABELS,
  STATUS_LABELS,
  DURATION_MIN,
  DURATION_MAX,
  DEFAULT_DURATION
} from '@/lib/meetings'
import { RequestPanel, RequestRow } from './MeetingRequests'
import './meetings.css'

export function Meetings() {
  const profile = useAuth((s) => s.profile)
  const roles   = useAuth((s) => s.roles)
  const nativeCalls = useFlag(FLAG_KEYS.NATIVE_CALLS_ENABLED)

  const isAdmin     = roles.includes('admin')
  const canSchedule = isAdmin || roles.includes('mentor')

  const [searchParams, setSearchParams] = useSearchParams()
  const rawFilter = searchParams.get('filter')
  const filter = MEETING_FILTERS.some((f) => f.key === rawFilter) ? rawFilter : DEFAULT_MEETING_FILTER

  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [notice,  setNotice]  = useState('')
  const [busyId,  setBusyId]  = useState(null)

  const [pairings,     setPairings]     = useState([])
  const [ownPairing,   setOwnPairing]   = useState(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [panelOpen,    setPanelOpen]    = useState(false)
  const [requestOpen,  setRequestOpen]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await fetchMeetings({ scope: filter }))
    } catch (e) {
      setError(friendlyMeetingError(e))
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!canSchedule) return
    fetchSchedulablePairings()
      .then(setPairings)
      .catch((e) => setError(friendlyMeetingError(e)))
  }, [canSchedule])

  // The pairing the viewer can request against, which is the one where they
  // are the mentee. Someone holding mentor and mentee at once gets both a
  // Schedule control and a Request control, because both are true of them.
  useEffect(() => {
    if (!profile?.id) return
    fetchRequestablePairing(profile.id)
      .then(setOwnPairing)
      .catch((e) => setError(friendlyMeetingError(e)))
  }, [profile?.id])

  const refreshPendingCount = useCallback(() => {
    countPendingRequests()
      .then(setPendingCount)
      .catch(() => setPendingCount(0))
  }, [])

  useEffect(() => { refreshPendingCount() }, [refreshPendingCount])

  const setFilter = (next) => {
    const params = new URLSearchParams(searchParams)
    if (next === DEFAULT_MEETING_FILTER) params.delete('filter')
    else params.set('filter', next)
    setSearchParams(params, { replace: true })
  }

  const modes    = useMemo(() => availableModes(isOn(nativeCalls)), [nativeCalls])
  const askModes = useMemo(() => requestableModes(), [])

  const canRequest = Boolean(ownPairing)
  const onRequests = filter === 'requests'

  async function onSchedule(form) {
    const pairing = pairings.find((p) => p.id === form.pairingId)
    const meeting = await createMeeting({
      pairingId:       form.pairingId,
      scheduledFor:    fromLocalInputValue(form.scheduledFor),
      durationMinutes: Number(form.durationMinutes),
      mode:            form.mode,
      externalLink:    form.externalLink,
      location:        form.location,
      createdBy:       profile?.id ?? null,
      asAdmin:         isAdmin,
      label:           `${pairing?.mentor?.full_name} and ${pairing?.mentee?.full_name}`
    })

    const mail = await sendMeetingEmail(meeting.id, 'scheduled')
    setNotice(
      `Meeting scheduled with ${pairing?.mentee?.full_name ?? 'your mentee'}. ` +
      (mail.sent ? 'Both of you have been emailed.' : 'The notification email did not send.')
    )
    setPanelOpen(false)
    setFilter('upcoming')
    await load()
  }

  // meeting-notify sends this one to the mentor only. The bell fires from the
  // database trigger either way, so a failed send costs the notice line and
  // nothing else.
  async function onRequest(form) {
    const meeting = await requestMeeting({
      pairingId:       ownPairing.id,
      scheduledFor:    fromLocalInputValue(form.scheduledFor),
      durationMinutes: Number(form.durationMinutes),
      mode:            form.mode,
      externalLink:    form.externalLink,
      location:        form.location,
      note:            form.note
    })

    const mentorName = ownPairing.mentor?.full_name ?? 'your mentor'
    const mail = await sendMeetingEmail(meeting.id, 'requested')

    setNotice(
      `Request sent to ${mentorName}. ` +
      (mail.sent ? 'They have been emailed. ' : '') +
      'They can accept it or decline with a reason, and you can withdraw it until they answer.'
    )
    setRequestOpen(false)
    setFilter('requests')
    refreshPendingCount()
    await load()
  }

  async function onComplete(meeting) {
    setBusyId(meeting.id)
    try {
      await completeMeeting(meeting.id, { asAdmin: isAdmin, label: labelFor(meeting) })
      setNotice('Meeting marked as completed.')
      await load()
    } catch (e) {
      setError(friendlyMeetingError(e))
    } finally {
      setBusyId(null)
    }
  }

  async function onCancel(meeting) {
    setBusyId(meeting.id)
    try {
      await cancelMeeting(meeting.id, { asAdmin: isAdmin, label: labelFor(meeting) })
      const mail = await sendMeetingEmail(meeting.id, 'cancelled')
      setNotice(
        'Meeting cancelled. ' +
        (mail.sent ? 'Both of you have been emailed.' : 'The notification email did not send.')
      )
      await load()
    } catch (e) {
      setError(friendlyMeetingError(e))
    } finally {
      setBusyId(null)
    }
  }

  async function onAccept(meeting) {
    setBusyId(meeting.id)
    setError('')
    try {
      await acceptMeetingRequest(meeting.id)
      const mail = await sendMeetingEmail(meeting.id, 'scheduled')
      setNotice(
        `Accepted. It is now a scheduled meeting with ${meeting.mentee?.full_name ?? 'your mentee'}. ` +
        (mail.sent ? 'Both of you have been emailed.' : 'The notification email did not send.')
      )
      refreshPendingCount()
      await load()
    } catch (e) {
      setError(friendlyMeetingError(e))
    } finally {
      setBusyId(null)
    }
  }

  async function onReject(meeting, reason) {
    setBusyId(meeting.id)
    setError('')
    try {
      await rejectMeetingRequest(meeting.id, reason)
      setNotice(
        `Declined. ${meeting.mentee?.full_name ?? 'Your mentee'} can read your reason and ask again.`
      )
      refreshPendingCount()
      await load()
    } catch (e) {
      setError(friendlyMeetingError(e))
    } finally {
      setBusyId(null)
    }
  }

  async function onWithdraw(meeting) {
    setBusyId(meeting.id)
    setError('')
    try {
      await withdrawMeetingRequest(meeting.id)
      setNotice('Request withdrawn. You can ask for another time whenever you are ready.')
      refreshPendingCount()
      await load()
    } catch (e) {
      setError(friendlyMeetingError(e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="meetings">
      <header className="meetings__head">
        <div>
          <p className="meetings__eyebrow">Sessions</p>
          <h1 className="meetings__title">Meetings</h1>
          <p className="meetings__lede">{ledeFor({ canSchedule, canRequest })}</p>
        </div>
        <div className="meetings__head-actions">
          {canSchedule && !panelOpen && (
            <button
              type="button"
              className="meetings__new"
              onClick={() => { setPanelOpen(true); setRequestOpen(false); setNotice('') }}
            >
              <Icon name="plus" size={16} />
              <span>Schedule meeting</span>
            </button>
          )}
          {canRequest && !requestOpen && (
            <button
              type="button"
              className={canSchedule ? 'meetings__action' : 'meetings__new'}
              onClick={() => { setRequestOpen(true); setPanelOpen(false); setNotice('') }}
            >
              <Icon name="calendar" size={16} />
              <span>Request a meeting</span>
            </button>
          )}
        </div>
      </header>

      {error  && <div className="meetings__alert" role="alert">{error}</div>}
      {notice && <div className="meetings__notice" role="status">{notice}</div>}

      {panelOpen && (
        <SchedulePanel
          pairings={pairings}
          modes={modes}
          onCancel={() => setPanelOpen(false)}
          onSubmit={onSchedule}
        />
      )}

      {requestOpen && ownPairing && (
        <RequestPanel
          pairing={ownPairing}
          modes={askModes}
          onCancel={() => setRequestOpen(false)}
          onSubmit={onRequest}
        />
      )}

      <nav className="meetings__filters" aria-label="Filter meetings">
        {MEETING_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={'meetings__filter' + (filter === f.key ? ' meetings__filter--active' : '')}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
          >
            {f.label}
            {/* Only on Requests, and only when something is actually waiting.
                A badge reading zero is a badge nobody learns to trust. */}
            {f.key === 'requests' && pendingCount > 0 && (
              <span className="meetings__filter-count">{pendingCount}</span>
            )}
          </button>
        ))}
      </nav>

      {loading ? (
        <ul className="meetings__list" aria-busy="true">
          {[0, 1, 2].map((i) => <li key={i} className="meetings__row meetings__row--skel" />)}
        </ul>
      ) : rows.length === 0 ? (
        <EmptyPanel
          filter={filter}
          canSchedule={canSchedule}
          canRequest={canRequest}
          onSchedule={panelOpen ? null : () => setPanelOpen(true)}
          onRequest={requestOpen ? null : () => setRequestOpen(true)}
        />
      ) : onRequests ? (
        <ul className="meetings__list">
          {rows.map((m) => (
            <RequestRow
              key={m.id}
              meeting={m}
              viewerId={profile?.id ?? null}
              canAnswer={isAdmin || m.mentor?.id === profile?.id}
              busy={busyId === m.id}
              onAccept={() => onAccept(m)}
              onReject={(reason) => onReject(m, reason)}
              onWithdraw={() => onWithdraw(m)}
            />
          ))}
        </ul>
      ) : (
        <ul className="meetings__list">
          {rows.map((m, i) => (
            <MeetingRow
              key={m.id}
              meeting={m}
              canManage={canSchedule}
              busy={busyId === m.id}
              showStatus={filter === 'past'}
              isNext={filter === 'upcoming' && i === 0}
              onComplete={() => onComplete(m)}
              onCancel={() => onCancel(m)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

/* ============ Schedule panel ============ */

function SchedulePanel({ pairings, modes, onCancel, onSubmit }) {
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

/* ============ Row ============ */

function MeetingRow({ meeting, canManage, busy, showStatus, isNext, onComplete, onCancel }) {
  const { scheduledFor, durationMinutes, mode, status, mentor, mentee, location } = meeting
  const overdue = status === MEETING_STATUS.SCHEDULED && isPast(scheduledFor)
  const phone   = modeUsesMentorPhone(mode) ? mentorPhone(mentor) : null

  // Completing a meeting that has not happened is a misclick, and D16 makes it
  // expensive: only an admin can undo it. Cancel is the opposite and stays
  // available throughout, because cancelling is what you do to something that
  // has not happened yet.
  const canComplete = canManage && status === MEETING_STATUS.SCHEDULED && isPast(scheduledFor)
  const canCancel   = canManage && status === MEETING_STATUS.SCHEDULED
  const opensIn     = canCancel && !canComplete ? opensForCompletionIn(scheduledFor) : null

  const cls = [
    'meetings__row',
    status === MEETING_STATUS.CANCELLED ? 'meetings__row--muted' : '',
    isNext ? 'meetings__row--next' : ''
  ].filter(Boolean).join(' ')

  return (
    <li className={cls}>
      {/* Day, month, and clock in one block, so the eye lands on when before
          it lands on who. Top-aligned, because the body varies in height. */}
      <div className="meetings__when" aria-hidden="true">
        <span className="meetings__when-day">{dayNumber(scheduledFor)}</span>
        <span className="meetings__when-mon">{monthShort(scheduledFor)}</span>
        <span className="meetings__when-time">{timeOfDay(scheduledFor)}</span>
      </div>

      <div className="meetings__body">
        <p className="meetings__who">
          {isNext && <span className="meetings__next">Next up</span>}
          <span>{mentor?.full_name ?? 'Mentor'} and {mentee?.full_name ?? 'Mentee'}</span>
        </p>

        <p className="meetings__meta">
          <span>{meetingWhen(scheduledFor)}</span>
          {durationMinutes ? <span className="meetings__dot">{`${durationMinutes} min`}</span> : null}
          <span className="meetings__mode-chip">
            <Icon name={MODE_ICONS[mode]} size={12} strokeWidth={1.75} />
            {MODE_LABELS[mode] ?? mode}
          </span>
        </p>

        {location && (
          <p className="meetings__where">
            <Icon name="mapPin" size={12} strokeWidth={1.75} />
            <span>{location}</span>
          </p>
        )}
        {phone && (
          <p className="meetings__where">
            <Icon name="phone" size={12} strokeWidth={1.75} />
            <span>{`${mentor?.full_name ?? 'Your mentor'} calls from ${phone}`}</span>
          </p>
        )}
        {overdue && (
          <p className="meetings__overdue">
            <Icon name="alert" size={12} strokeWidth={1.75} />
            <span>This time has passed. Mark what happened.</span>
          </p>
        )}
      </div>

      {/* The tab already says scheduled or cancelled. Only Past holds rows in
          more than one state, so only Past needs the pill. */}
      {showStatus && (
        <span className={`meetings__status meetings__status--${status}`}>
          {STATUS_LABELS[status] ?? status}
        </span>
      )}

      <div className="meetings__actions">
        {/* Status leads, actions follow. The chip is the rule shown as time,
            and it holds the position the completion control will take. */}
        {canCancel && !canComplete && (
          <span className="meetings__locked" title="Completion opens after the session time">
            <Icon name="clock" size={12} strokeWidth={1.75} />
            <span>{opensIn ? `Completes ${opensIn}` : 'Completes after the session'}</span>
          </span>
        )}
        {canComplete && (
          <button type="button" className="meetings__action" onClick={onComplete} disabled={busy}>
            Mark completed
          </button>
        )}
        <Link className="meetings__action" to={`/meetings/${meeting.id}`}>Open</Link>
        {canCancel && (
          <button
            type="button"
            className="meetings__action meetings__action--danger"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
        )}
      </div>
    </li>
  )
}

/* ============ Empty ============ */

function EmptyPanel({ filter, canSchedule, canRequest, onSchedule, onRequest }) {
  const copy = {
    upcoming: {
      title: 'Nothing scheduled',
      body: canSchedule
        ? 'Schedule a session under one of your active pairings and it appears here, soonest first.'
        : canRequest
          ? 'Your mentor schedules your sessions. You can also ask for a time and they will accept or decline.'
          : 'Your mentor will schedule your next session. You will receive an email when it is set.'
    },
    requests: {
      title: 'No requests',
      body: canRequest
        ? 'Ask your mentor for a time and it waits here until they answer. Declined and withdrawn requests stay here too.'
        : 'When a mentee asks you for a time it lands here. Accepting turns it into a scheduled meeting.'
    },
    past: {
      title: 'No past meetings',
      body: 'Once a session has happened it moves here, whether it was marked completed or not.'
    },
    cancelled: {
      title: 'Nothing cancelled',
      body: 'Cancelled sessions stay on the record rather than disappearing. None so far.'
    }
  }[filter]

  return (
    <div className="meetings__empty">
      <p className="meetings__empty-title">{copy.title}</p>
      <p className="meetings__empty-body">{copy.body}</p>
      {filter === 'upcoming' && canSchedule && onSchedule && (
        <button type="button" className="meetings__save" onClick={onSchedule}>Schedule meeting</button>
      )}
      {filter === 'requests' && canRequest && onRequest && (
        <button type="button" className="meetings__save" onClick={onRequest}>Request a meeting</button>
      )}
    </div>
  )
}

/* ============ Helpers ============ */

function ledeFor({ canSchedule, canRequest }) {
  if (canSchedule && canRequest) {
    return 'Every session under your pairings, on both sides. Schedule the ones you lead, ask for the ones you attend.'
  }
  if (canSchedule) {
    return 'Every session under your pairings. Schedule the next one, mark what happened, and keep the record straight.'
  }
  if (canRequest) {
    return 'Every session with your mentor, soonest first. Your mentor schedules these, and you can ask for a time yourself.'
  }
  return 'Every session with your mentor, soonest first. Your mentor schedules these and marks them once you have met.'
}

function labelFor(meeting) {
  return `${meeting.mentor?.full_name} and ${meeting.mentee?.full_name}`
}
