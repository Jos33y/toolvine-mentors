import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import { useFlag } from '@/hooks/useFlag'
import { isOn, FLAG_KEYS } from '@/lib/flags'
import { Icon } from '@/components/shared/Icon/Icon'
import { meetingWhen } from '@/lib/format'
import { MeetingRecord } from './MeetingRecord'
import {
  fetchMeeting,
  completeMeeting,
  cancelMeeting,
  reopenMeeting,
  rescheduleMeeting,
  sendMeetingEmail,
  availableModes,
  modeNeedsLink,
  modeNeedsLocation,
  toLocalInputValue,
  fromLocalInputValue,
  DURATION_MIN,
  DURATION_MAX,
  friendlyMeetingError,
  counterpartTime,
  mentorPhone,
  modeUsesMentorPhone,
  isPast,
  opensForCompletionIn,
  MODE_LABELS,
  STATUS_LABELS
} from '@/lib/meetings'
import './meeting.css'

const MODE_ICONS = {
  external:     'externalLink',
  phone:        'phone',
  in_person:    'mapPin',
  native_video: 'video',
  native_audio: 'mic'
}

export function Meeting() {
  const { id } = useParams()
  const navigate = useNavigate()

  const profile = useAuth((s) => s.profile)
  const roles   = useAuth((s) => s.roles)

  const isAdmin  = roles.includes('admin')
  const isMentor = roles.includes('mentor')

  const [meeting, setMeeting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [notice,  setNotice]  = useState('')
  const [busy,    setBusy]    = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [editing, setEditing] = useState(false)

  const nativeCalls = useFlag(FLAG_KEYS.NATIVE_CALLS_ENABLED)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setMeeting(await fetchMeeting(id))
    } catch (e) {
      setError(friendlyMeetingError(e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <section className="meeting">
        <BackLink />
        <div className="meeting__panel meeting__panel--skeleton" aria-busy="true" />
      </section>
    )
  }

  if (!meeting) {
    return (
      <section className="meeting">
        <BackLink />
        <div className="meeting__empty">
          <p className="meeting__empty-title">That meeting is not here</p>
          <p className="meeting__empty-body">
            It may have been removed, or it belongs to a pairing you are not part of.
          </p>
          <Link className="meeting__cta" to="/meetings">Back to meetings</Link>
        </div>
      </section>
    )
  }

  const { mentor, mentee, status, mode, scheduledFor, durationMinutes, location, externalLink } = meeting

  // The mentee is the counterpart when you are the mentor, and the other way
  // round. An admin is neither, so they see both people's local time.
  const viewerIsMentor = profile?.id === mentor?.id
  const viewerIsMentee = profile?.id === mentee?.id
  const canManage = isAdmin || (isMentor && viewerIsMentor)

  const phone   = modeUsesMentorPhone(mode) ? mentorPhone(mentor) : null
  const overdue = status === 'scheduled' && isPast(scheduledFor)

  // A meeting is completed after it happens, not before. D16 makes the mistake
  // expensive, since only an admin can undo it. Cancel is the opposite and
  // stays available throughout, because cancelling is what you do to something
  // that has not happened yet.
  const canComplete = canManage && status === 'scheduled' && isPast(scheduledFor)
  const canCancel   = canManage && status === 'scheduled'

  async function run(action) {
    setBusy(true)
    setError('')
    try {
      const label = `${mentor?.full_name} and ${mentee?.full_name}`
      if (action === 'complete') {
        await completeMeeting(meeting.id, { asAdmin: isAdmin, label })
        setNotice('Marked as completed. This meeting is now part of the record.')
      } else if (action === 'cancel') {
        await cancelMeeting(meeting.id, { asAdmin: isAdmin, label })
        const mail = await sendMeetingEmail(meeting.id, 'cancelled')
        setNotice(
          'Cancelled. It stays on the record rather than disappearing. ' +
          (mail.sent ? 'Both of you have been emailed.' : 'The notification email did not send.')
        )
      } else if (action === 'reopen') {
        await reopenMeeting(meeting.id, label)
        setNotice('Reopened and back to scheduled.')
      }
      setConfirm(null)
      await load()
    } catch (e) {
      setError(friendlyMeetingError(e))
      setConfirm(null)
    } finally {
      setBusy(false)
    }
  }

  // The old time is what makes the notice worth sending, so it comes back
  // from the write rather than being read again afterwards.
  async function onReschedule(form) {
    const label = `${mentor?.full_name} and ${mentee?.full_name}`
    const { before } = await rescheduleMeeting(
      meeting.id,
      {
        scheduled_for:    fromLocalInputValue(form.scheduledFor),
        duration_minutes: Number(form.durationMinutes),
        mode:             form.mode,
        external_link:    form.externalLink,
        location:         form.location
      },
      { asAdmin: isAdmin, label }
    )

    const mail = await sendMeetingEmail(meeting.id, 'rescheduled', before.scheduledFor)
    setNotice(
      'Meeting moved. ' +
      (mail.sent ? 'Both of you have been emailed.' : 'The notification email did not send.')
    )
    setEditing(false)
    await load()
  }

  return (
    <section className="meeting">
      <BackLink />

      <header className="meeting__head">
        <div className="meeting__head-text">
          <p className="meeting__eyebrow">Meeting</p>
          <h1 className="meeting__title">{meetingWhen(scheduledFor)}</h1>
        </div>
        <span className={`meeting__status meeting__status--${status}`}>
          {STATUS_LABELS[status] ?? status}
        </span>
      </header>

      {error  && <div className="meeting__alert"  role="alert">{error}</div>}
      {notice && <div className="meeting__notice" role="status">{notice}</div>}

      {overdue && (
        <div className="meeting__warn" role="note">
          This time has passed and the meeting is still marked as scheduled.
          {canManage ? ' Mark what happened so the record stays true.' : ' Your mentor will update it.'}
        </div>
      )}

      {editing && (
        <ReschedulePanel
          meeting={meeting}
          modes={availableModes(isOn(nativeCalls))}
          onCancel={() => setEditing(false)}
          onSubmit={onReschedule}
        />
      )}

      <article className="meeting__panel">
        <div className="meeting__people">
          <Person person={mentor} role="Mentor" you={viewerIsMentor} />
          <span className="meeting__join" aria-hidden="true"><Icon name="pairings" size={18} /></span>
          <Person person={mentee} role="Mentee" you={viewerIsMentee} />
        </div>

        <dl className="meeting__facts">
          <Fact label="How" value={
            <span className="meeting__mode">
              <Icon name={MODE_ICONS[mode]} size={14} strokeWidth={1.75} />
              {MODE_LABELS[mode] ?? mode}
            </span>
          } />
          <Fact label="Length" value={durationMinutes ? `${durationMinutes} minutes` : null} />
          <Fact label="Your time" value={meetingWhen(scheduledFor)} />
        </dl>

        {/* D19. Only rendered when the other person actually has a timezone
            saved. Five of twelve profiles do not, and showing a Lagos time for
            someone in the UK is worse than showing nothing. */}
        <CounterpartClock
          scheduledFor={scheduledFor}
          mentor={mentor}
          mentee={mentee}
          viewerIsMentor={viewerIsMentor}
          viewerIsMentee={viewerIsMentee}
          viewerWhen={meetingWhen(scheduledFor)}
        />

        {externalLink && (
          <div className="meeting__block">
            <h2 className="meeting__block-title">Joining link</h2>
            <a
              className="meeting__link"
              href={externalLink}
              target="_blank"
              rel="noreferrer noopener"
            >
              <Icon name="externalLink" size={16} />
              <span>{externalLink}</span>
            </a>
          </div>
        )}

        {location && (
          <div className="meeting__block">
            <h2 className="meeting__block-title">Where</h2>
            <p className="meeting__where">
              <Icon name="mapPin" size={16} />
              <span>{location}</span>
            </p>
          </div>
        )}

        {modeUsesMentorPhone(mode) && (
          <div className="meeting__block">
            <h2 className="meeting__block-title">Phone</h2>
            <p className={'meeting__where' + (phone ? '' : ' meeting__where--missing')}>
              <Icon name="phone" size={16} />
              <span>
                {phone
                  ? `${mentor?.full_name ?? 'Your mentor'} calls from ${phone}`
                  : `${mentor?.full_name ?? 'Your mentor'} has no phone number saved yet`}
              </span>
            </p>
          </div>
        )}

        {canManage && (
          <footer className="meeting__actions">
            {canComplete && (
              <button
                type="button"
                className="meeting__cta"
                onClick={() => run('complete')}
                disabled={busy}
              >
                Mark completed
              </button>
            )}
            {/* Moving a meeting keeps its row, its id, and anything attached
                to it. Cancelling and re-creating loses all three. */}
            {canCancel && !editing && (
              <button
                type="button"
                className="meeting__action"
                onClick={() => { setEditing(true); setNotice('') }}
                disabled={busy}
              >
                Reschedule
              </button>
            )}
            {/* The rule shown as time. It occupies the slot the completion
                control will take, so the footer reads as a state rather than
                as a button row missing its first button. */}
            {canCancel && !canComplete && (
              <span className="meeting__locked">
                <Icon name="clock" size={14} strokeWidth={1.75} />
                <span className="meeting__locked-text">
                  Completes {opensForCompletionIn(scheduledFor) ?? 'after the session'}
                </span>
              </span>
            )}
            {canCancel && (
              <button
                type="button"
                className="meeting__action meeting__action--danger"
                onClick={() => setConfirm('cancel')}
                disabled={busy}
              >
                Cancel meeting
              </button>
            )}
            {/* D17. Correcting a mistakenly completed meeting is an admin
                action, not a toggle the mentor can reach. */}
            {status === 'completed' && isAdmin && (
              <button
                type="button"
                className="meeting__action"
                onClick={() => setConfirm('reopen')}
                disabled={busy}
              >
                Reopen this meeting
              </button>
            )}
            {status === 'completed' && !isAdmin && (
              <p className="meeting__final">
                Completed meetings are part of the record. An admin can correct one that was marked by mistake.
              </p>
            )}
          </footer>
        )}
      </article>

      {/* Notes are absent from the DOM for a mentee, not disabled or emptied.
          RLS blocks them at the database too; this is the second layer. */}
      <MeetingRecord
        meetingId={meeting.id}
        canWriteNotes={canManage}
        canManageItems={canManage}
        authorId={profile?.id ?? null}
        mentor={mentor}
        mentee={mentee}
        viewerId={profile?.id ?? null}
      />

      {confirm && (
        <ConfirmDialog
          kind={confirm}
          meeting={meeting}
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => run(confirm)}
        />
      )}
    </section>
  )
}

/* ============ Reschedule ============ */

function ReschedulePanel({ meeting, modes, onCancel, onSubmit }) {
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
        Both of you are emailed with the old time and the new one. Everything else about the
        meeting stays as it is.
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

/* ============ Pieces ============ */

function BackLink() {
  return (
    <Link className="meeting__back" to="/meetings">
      <Icon name="chevronRight" size={14} />
      <span>All meetings</span>
    </Link>
  )
}

function Person({ person, role, you }) {
  if (!person) return null
  return (
    <span className="meeting__person">
      <span className="meeting__avatar" aria-hidden="true">
        {person.photo_url
          ? <img src={person.photo_url} alt="" className="meeting__avatar-img" />
          : initials(person.full_name)}
      </span>
      <span className="meeting__person-text">
        <span className="meeting__person-role">{you ? `${role} (you)` : role}</span>
        <span className="meeting__person-name">{person.full_name}</span>
        <span className="meeting__person-mail">{person.email}</span>
      </span>
    </span>
  )
}

function CounterpartClock({ scheduledFor, mentor, mentee, viewerIsMentor, viewerIsMentee, viewerWhen }) {
  const others = []

  if (viewerIsMentor && mentee) others.push(mentee)
  else if (viewerIsMentee && mentor) others.push(mentor)
  else { if (mentor) others.push(mentor); if (mentee) others.push(mentee) }

  // Compared on the rendered clock time rather than the zone name, because two
  // zones that agree today are the same fact to the reader. A row that repeats
  // the viewer's own time teaches people to ignore the block.
  const viewerClock = clockOf(viewerWhen)

  const rows = others
    .map((p) => ({ name: p.full_name, when: counterpartTime(scheduledFor, p.timezone) }))
    .filter((r) => r.when && clockOf(r.when) !== viewerClock)

  if (rows.length === 0) return null

  return (
    <div className="meeting__block">
      <h2 className="meeting__block-title">Their local time</h2>
      <ul className="meeting__clocks">
        {rows.map((r) => (
          <li key={r.name} className="meeting__clock">
            <Icon name="clock" size={14} strokeWidth={1.75} />
            <span className="meeting__clock-name">{r.name}</span>
            <span className="meeting__clock-when">{r.when}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Fact({ label, value }) {
  if (!value) return null
  return (
    <div className="meeting__fact">
      <dt className="meeting__fact-label">{label}</dt>
      <dd className="meeting__fact-value">{value}</dd>
    </div>
  )
}

function ConfirmDialog({ kind, meeting, busy, onCancel, onConfirm }) {
  const cancelling = kind === 'cancel'
  const who = meeting.mentee?.full_name ?? 'your mentee'

  return (
    <div className="meeting__overlay" role="dialog" aria-modal="true" aria-labelledby="meeting-confirm">
      <div className="meeting__dialog">
        <h2 className="meeting__dialog-title" id="meeting-confirm">
          {cancelling ? `Cancel this meeting with ${who}?` : 'Reopen this meeting?'}
        </h2>
        <p className="meeting__dialog-body">
          {cancelling
            ? 'It stays on the record as cancelled rather than disappearing. You can schedule a new one at any time.'
            : 'It goes back to scheduled and its completion time is cleared. Use this only when it was marked completed by mistake.'}
        </p>
        <div className="meeting__dialog-actions">
          <button type="button" className="meeting__action" onClick={onCancel} disabled={busy}>
            Keep as is
          </button>
          <button
            type="button"
            className={'meeting__cta' + (cancelling ? ' meeting__cta--danger' : '')}
            onClick={onConfirm}
            disabled={busy}
            autoFocus
          >
            {busy ? 'Working' : cancelling ? 'Cancel meeting' : 'Reopen'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Pulls "9:05 AM" out of either long form so the two can be compared.
function clockOf(label) {
  const m = String(label || '').match(/(\d{1,2}:\d{2}\s*[AP]M)/i)
  return m ? m[1].toUpperCase().replace(/\s+/g, ' ') : null
}

function initials(full) {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
