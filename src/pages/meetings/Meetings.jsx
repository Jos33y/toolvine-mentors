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
  createConvenedMeeting,
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
  modeUsesMentorPhone,
  mentorPhone,
  fromLocalInputValue,
  isPast,
  dayNumber,
  monthShort,
  opensForCompletionIn,
  meetingHeading,
  MEETING_FILTERS,
  DEFAULT_MEETING_FILTER,
  KIND_FILTERS,
  DEFAULT_KIND_FILTER,
  MEETING_STATUS,
  MEETING_KIND,
  MODE_ICONS,
  MODE_LABELS,
  STATUS_LABELS
} from '@/lib/meetings'
import { RequestPanel, RequestRow } from './MeetingRequests'
import { SchedulePanel } from './MeetingSchedule'
import { ConvenePanel } from './MeetingConvene'
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

  // Q21. One list, filtered by type. Kind is a second axis across the four
  // scopes rather than a fifth scope, because a convened meeting is still
  // upcoming or still past.
  const rawKind = searchParams.get('type')
  const kind = KIND_FILTERS.some((k) => k.key === rawKind) ? rawKind : DEFAULT_KIND_FILTER

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
  const [conveneOpen,  setConveneOpen]  = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await fetchMeetings({ scope: filter, kind }))
    } catch (e) {
      setError(friendlyMeetingError(e))
    } finally {
      setLoading(false)
    }
  }, [filter, kind])

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

  const setKind = (next) => {
    const params = new URLSearchParams(searchParams)
    if (next === DEFAULT_KIND_FILTER) params.delete('type')
    else params.set('type', next)
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

  // Two writes and no RPC, so the meeting can exist for a moment with nobody
  // on it. createConvenedMeeting comments the seam; that direction is the safe
  // one, since an attendeeless meeting is admin-only and can be filled in.
  //
  // No email. Q31 settled the same question for programmes: bell and banner,
  // no email, while email_events is broken. meeting_attendees_notify writes
  // the bell notice on every add.
  async function onConvene(form) {
    await createConvenedMeeting({
      title:           form.title,
      scheduledFor:    fromLocalInputValue(form.scheduledFor),
      durationMinutes: Number(form.durationMinutes),
      mode:            form.mode,
      externalLink:    form.externalLink,
      location:        form.location,
      attendees:       form.attendees,
      createdBy:       profile?.id ?? null,
      label:           form.title
    })

    setNotice(
      `Meeting convened. ${form.attendees.length} ${form.attendees.length === 1 ? 'person has' : 'people have'} been notified.`
    )
    setConveneOpen(false)
    setKind('admin')
    setFilter('upcoming')
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
      if (meeting.kind === MEETING_KIND.ADMIN) {
        setNotice('Meeting cancelled. Everyone on it has been notified.')
      } else {
        const mail = await sendMeetingEmail(meeting.id, 'cancelled')
        setNotice(
          'Meeting cancelled. ' +
          (mail.sent ? 'Both of you have been emailed.' : 'The notification email did not send.')
        )
      }
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
              onClick={() => { setPanelOpen(true); setRequestOpen(false); setConveneOpen(false); setNotice('') }}
            >
              <Icon name="plus" size={16} />
              <span>Schedule meeting</span>
            </button>
          )}
          {canRequest && !requestOpen && (
            <button
              type="button"
              className={canSchedule ? 'meetings__action' : 'meetings__new'}
              onClick={() => { setRequestOpen(true); setPanelOpen(false); setConveneOpen(false); setNotice('') }}
            >
              <Icon name="calendar" size={16} />
              <span>Request a meeting</span>
            </button>
          )}
          {/* Admin only. meeting_attendees_admin_insert is what enforces it;
              this is the second layer. */}
          {isAdmin && !conveneOpen && (
            <button
              type="button"
              className="meetings__action"
              onClick={() => { setConveneOpen(true); setPanelOpen(false); setRequestOpen(false); setNotice('') }}
            >
              <Icon name="pairings" size={16} />
              <span>Convene a meeting</span>
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

      {conveneOpen && (
        <ConvenePanel
          modes={modes}
          onCancel={() => setConveneOpen(false)}
          onSubmit={onConvene}
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

      {/* Absent on Requests: meetings_kind_status_check keeps every request
          state off a convened meeting, so the axis has nothing to filter. */}
      {!onRequests && (
        <nav className="meetings__kinds" aria-label="Filter by type">
          {KIND_FILTERS.map((k) => (
            <button
              key={k.key}
              type="button"
              className={'meetings__kind' + (kind === k.key ? ' meetings__kind--active' : '')}
              onClick={() => setKind(k.key)}
              aria-pressed={kind === k.key}
            >
              {k.label}
            </button>
          ))}
        </nav>
      )}

      {loading ? (
        <ul className="meetings__list" aria-busy="true">
          {[0, 1, 2].map((i) => <li key={i} className="meetings__row meetings__row--skel" />)}
        </ul>
      ) : rows.length === 0 ? (
        <EmptyPanel
          filter={filter}
          kind={kind}
          onClearKind={() => setKind(DEFAULT_KIND_FILTER)}
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
              viewerId={profile?.id ?? null}
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

/* ============ Row ============ */

function MeetingRow({ meeting, viewerId, canManage, busy, showStatus, isNext, onComplete, onCancel }) {
  const { scheduledFor, durationMinutes, mode, status, mentor, mentee, location, attendees } = meeting
  const convened = meeting.kind === MEETING_KIND.ADMIN
  const overdue  = status === MEETING_STATUS.SCHEDULED && isPast(scheduledFor)

  // Numbers on a convened meeting come from meeting_contacts on the detail
  // page, and 0049 confines that view to pairings. Nothing to read here.
  const phone = !convened && modeUsesMentorPhone(mode) ? mentorPhone(mentor) : null

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
          <span>
            {convened
              ? meetingHeading(meeting, viewerId)
              : `${mentor?.full_name ?? 'Mentor'} and ${mentee?.full_name ?? 'Mentee'}`}
          </span>
          {convened && <span className="meetings__kind-tag">Convened</span>}
        </p>

        {/* The title says what it is; this says who is in it. Truncated at
            three, because a row is not a roster. */}
        {convened && attendees?.length > 0 && (
          <p className="meetings__attendees">
            <Icon name="pairings" size={12} strokeWidth={1.75} />
            <span>{attendeeSummary(attendees)}</span>
          </p>
        )}

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

function EmptyPanel({ filter, kind, onClearKind, canSchedule, canRequest, onSchedule, onRequest }) {
  // A filtered empty list is not an empty list. Saying "nothing scheduled"
  // while a type filter is on teaches people the page is broken.
  if (kind && kind !== DEFAULT_KIND_FILTER) {
    return (
      <div className="meetings__empty">
        <p className="meetings__empty-title">
          {kind === MEETING_KIND.ADMIN ? 'No convened meetings here' : 'No pairing meetings here'}
        </p>
        <p className="meetings__empty-body">
          Nothing under this tab matches that type. There may be others.
        </p>
        <button type="button" className="meetings__save" onClick={onClearKind}>Show all types</button>
      </div>
    )
  }

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
  if (meeting.kind === MEETING_KIND.ADMIN) return meeting.title || 'Convened meeting'
  return `${meeting.mentor?.full_name} and ${meeting.mentee?.full_name}`
}

// Names, then a count for the rest. A missing name is dropped rather than
// rendered as a gap, because profiles_visible withholding a row is not the
// same as somebody having no name.
function attendeeSummary(attendees) {
  const named = attendees.map((a) => a.fullName).filter(Boolean)
  if (named.length === 0) return `${attendees.length} in the room`
  if (named.length <= 3) return named.join(', ')
  return `${named.slice(0, 3).join(', ')} and ${named.length - 3} more`
}
