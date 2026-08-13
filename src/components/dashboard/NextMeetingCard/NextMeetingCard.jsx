import { Link } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import { meetingWhen } from '@/lib/format'
import { MODE_LABELS, mentorPhone, modeUsesMentorPhone, isPast } from '@/lib/meetings'
import './nextMeetingCard.css'

const MODE_ICONS = {
  external:     'externalLink',
  phone:        'phone',
  in_person:    'mapPin',
  native_video: 'video',
  native_audio: 'mic'
}

// The mentee's next session. Empty state has to know whether they are paired:
// telling someone with a mentor that they are waiting to be paired is worse
// than saying nothing.
export function NextMeetingCard({ meeting = null, paired = false, loading = false }) {
  if (loading) {
    return (
      <article className="next-meet next-meet--empty">
        <Head />
        <div className="next-meet__skeleton" aria-hidden="true" />
      </article>
    )
  }

  if (!meeting) {
    return (
      <article className="next-meet next-meet--empty">
        <Head title="Nothing scheduled yet" />
        <p className="next-meet__copy">
          {paired
            ? 'Your mentor will schedule your first session. The date, time, and join details will appear here.'
            : 'Once you are paired, your mentor will schedule your first session. The date, time, and join details will appear here.'}
        </p>
      </article>
    )
  }

  const { mode, mentor, location, externalLink, scheduledFor, durationMinutes } = meeting
  const phone   = modeUsesMentorPhone(mode) ? mentorPhone(mentor) : null
  const overdue = isPast(scheduledFor)

  return (
    <article className="next-meet">
      <Head title={meetingWhen(scheduledFor)} />

      <p className="next-meet__with">
        With {mentor?.full_name ?? 'your mentor'}
        <span className="next-meet__mode">
          <Icon name={MODE_ICONS[mode]} size={12} strokeWidth={1.75} />
          {MODE_LABELS[mode] ?? mode}
        </span>
        {durationMinutes ? <span className="next-meet__dur">{`${durationMinutes} min`}</span> : null}
      </p>

      {location && (
        <p className="next-meet__detail">
          <Icon name="mapPin" size={14} strokeWidth={1.75} />
          <span>{location}</span>
        </p>
      )}

      {phone && (
        <p className="next-meet__detail">
          <Icon name="phone" size={14} strokeWidth={1.75} />
          <span>{`${mentor?.full_name ?? 'Your mentor'} calls from ${phone}`}</span>
        </p>
      )}

      {overdue && (
        <p className="next-meet__overdue">
          This time has passed. Your mentor will mark what happened.
        </p>
      )}

      <div className="next-meet__actions">
        {externalLink && (
          <a
            className="next-meet__join"
            href={externalLink}
            target="_blank"
            rel="noreferrer noopener"
          >
            <Icon name="externalLink" size={14} />
            <span>Join</span>
          </a>
        )}
        <Link className="next-meet__link" to={`/meetings/${meeting.id}`}>
          Meeting details
        </Link>
      </div>
    </article>
  )
}

function Head({ title = 'Nothing scheduled yet' }) {
  return (
    <header className="next-meet__head">
      <p className="next-meet__eyebrow">Next meeting</p>
      <h2 className="next-meet__title">{title}</h2>
    </header>
  )
}
