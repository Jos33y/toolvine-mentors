import { Link } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import { formatSessionTime, dateStub } from '@/lib/format'
import { isPast, MEETING_KIND } from '@/lib/meetings'
import './nextSessionsCard.css'

// Lead card: the answer to "what's next?". The soonest session sits in a
// prominent block; further sessions stack compactly below. Date stubs use
// brand teal so the lead row carries weight without resorting to a pastel
// icon system. Mode chips carry a small icon so the meeting mode is legible
// at a glance.
export function NextSessionsCard({ upcoming = [], loading, onComplete, busyId = null }) {
  if (loading) {
    return (
      <article className="next-sessions next-sessions--loading">
        <Header />
        <div className="next-sessions__skeleton" aria-hidden="true" />
      </article>
    )
  }

  if (upcoming.length === 0) {
    return (
      <article className="next-sessions next-sessions--empty">
        <Header />
        <p className="next-sessions__copy">
          No sessions scheduled. As you and your mentees agree on times, they will appear here, soonest first.
        </p>
      </article>
    )
  }

  const [lead, ...rest] = upcoming

  return (
    <article className="next-sessions">
      <Header />

      <div className="next-sessions__lead">
        <SessionStub
          session={lead}
          variant="lead"
          onComplete={onComplete}
          busy={busyId === lead.id}
        />
      </div>

      {rest.length > 0 && (
        <ul className="next-sessions__rest">
          {rest.map((s) => (
            <li key={s.id} className="next-sessions__rest-item">
              <SessionStub
                session={s}
                variant="compact"
                onComplete={onComplete}
                busy={busyId === s.id}
              />
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function Header() {
  return (
    <header className="next-sessions__head">
      <p className="next-sessions__eyebrow">Next up</p>
      <h2 className="next-sessions__title">Your upcoming sessions</h2>
    </header>
  )
}

function SessionStub({ session, variant, onComplete, busy }) {
  const stub   = dateStub(session.scheduled_for)
  const when   = formatSessionTime(session.scheduled_for)
  const isLead = variant === 'lead'

  // A convened meeting has no mentee of this mentor's in it, so it is named by
  // its title. Falling through to "Session with Mentee" would have read as a
  // pairing that does not exist.
  const convened = session.kind === MEETING_KIND.ADMIN
  const who      = session.mentee?.full_name ?? 'Mentee'
  const heading  = convened
    ? (session.title || 'Convened meeting')
    : (isLead ? `Session with ${who}` : `with ${who}`)
  // Marking complete before the session has happened is almost always a
  // misclick, so the control appears only once the time has passed.
  const canComplete = Boolean(onComplete) && !convened && isPast(session.scheduled_for)

  return (
    <div className={`session-stub session-stub--${variant}`}>
      <div className="session-stub__date" aria-hidden="true">
        <span className="session-stub__day">{stub.day}</span>
        <span className="session-stub__mon">{stub.month}</span>
      </div>
      <div className="session-stub__body">
        <h3 className="session-stub__who">{heading}</h3>
        <p className="session-stub__when">
          <span>{when}</span>
          <ModeChip mode={session.mode} />
        </p>
        <div className="session-stub__actions">
          <Link className="session-stub__link" to={`/meetings/${session.id}`}>Open</Link>
          {canComplete && (
            <button
              type="button"
              className="session-stub__done"
              onClick={() => onComplete(session)}
              disabled={busy}
            >
              {busy ? 'Saving' : 'Mark completed'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Modes: external, phone, in_person, native_video, native_audio.
const MODE_META = {
  external:     { label: 'Online',    icon: 'externalLink' },
  phone:        { label: 'Phone',     icon: 'phone' },
  in_person:    { label: 'In person', icon: 'mapPin' },
  native_video: { label: 'Video',     icon: 'video' },
  native_audio: { label: 'Audio',     icon: 'mic' }
}

function ModeChip({ mode }) {
  const meta = MODE_META[mode]
  if (!meta) return null
  return (
    <span className={`session-stub__mode session-stub__mode--${mode}`}>
      <Icon name={meta.icon} size={12} strokeWidth={1.75} className="session-stub__mode-icon" />
      {meta.label}
    </span>
  )
}
