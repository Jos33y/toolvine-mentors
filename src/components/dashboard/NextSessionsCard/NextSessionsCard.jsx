import { Icon } from '@/components/shared/Icon/Icon'
import { formatSessionTime, dateStub } from '@/lib/format'
import './nextSessionsCard.css'

// Lead card: the answer to "what's next?". The soonest session sits in a
// prominent block; further sessions stack compactly below. Date stubs use
// brand teal so the lead row carries weight without resorting to a pastel
// icon system. Mode chips carry a small icon so the meeting mode is legible
// at a glance.
export function NextSessionsCard({ upcoming = [], loading }) {
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
        <SessionStub session={lead} variant="lead" />
      </div>

      {rest.length > 0 && (
        <ul className="next-sessions__rest">
          {rest.map((s) => (
            <li key={s.id} className="next-sessions__rest-item">
              <SessionStub session={s} variant="compact" />
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

function SessionStub({ session, variant }) {
  const stub   = dateStub(session.scheduled_for)
  const when   = formatSessionTime(session.scheduled_for)
  const who    = session.mentee?.full_name ?? 'Mentee'
  const isLead = variant === 'lead'

  return (
    <div className={`session-stub session-stub--${variant}`}>
      <div className="session-stub__date" aria-hidden="true">
        <span className="session-stub__day">{stub.day}</span>
        <span className="session-stub__mon">{stub.month}</span>
      </div>
      <div className="session-stub__body">
        <h3 className="session-stub__who">
          {isLead ? `Session with ${who}` : `with ${who}`}
        </h3>
        <p className="session-stub__when">
          <span>{when}</span>
          <ModeChip mode={session.mode} />
        </p>
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
