import { Link } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import { useMenteePairing } from '@/hooks/useMenteePairing'
import { Icon } from '@/components/shared/Icon/Icon'
import { pairedSinceLabel, pairingRangeLabel } from '@/lib/format'
import './mentor.css'

export function Mentor() {
  const profile = useAuth((s) => s.profile)
  const { pairing, loading, error } = useMenteePairing(profile?.id ?? null)

  const mentor  = pairing?.mentor ?? null
  const history = pairing?.history ?? []

  return (
    <section className="my-mentor">
      <header className="my-mentor__head">
        <p className="my-mentor__eyebrow">Your pairing</p>
        <h1 className="my-mentor__title">Your mentor</h1>
      </header>

      {error && (
        <div className="my-mentor__alert" role="alert">
          We could not load your pairing. Reload the page, or contact our team if it keeps happening.
        </div>
      )}

      {loading ? (
        <div className="my-mentor__panel my-mentor__panel--skeleton" aria-busy="true" />
      ) : mentor ? (
        <MentorPanel mentor={mentor} focus={pairing.focus} startedAt={pairing.startedAt} />
      ) : (
        <Awaiting onboarded={profile?.onboarded === true} />
      )}

      {history.length > 0 && (
        <section className="my-mentor__history" aria-labelledby="my-mentor-history">
          <h2 className="my-mentor__history-title" id="my-mentor-history">Past pairings</h2>
          <p className="my-mentor__history-lede">
            Every mentor you have been paired with stays on your record.
          </p>
          <ul className="my-mentor__history-list">
            {history.map((h) => (
              <li key={h.id} className="my-mentor__history-row">
                <span className="my-mentor__history-name">
                  {h.mentor?.full_name ?? 'A former mentor'}
                </span>
                <span className="my-mentor__history-range">
                  {pairingRangeLabel(h.startedAt, h.endedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  )
}

/* ============ Paired ============ */

function MentorPanel({ mentor, focus = [], startedAt }) {
  const since = pairedSinceLabel(startedAt)

  return (
    <article className="my-mentor__panel">
      <div className="my-mentor__identity">
        <Avatar name={mentor.full_name} photo={mentor.photo_url} />
        <div className="my-mentor__identity-text">
          <h2 className="my-mentor__name">{mentor.full_name}</h2>
          {mentor.display_title && (
            <p className="my-mentor__role">{mentor.display_title}</p>
          )}
          {since && <p className="my-mentor__since">Paired since {since}</p>}
        </div>
      </div>

      {mentor.is_active === false && (
        <p className="my-mentor__notice">
          This mentor is currently unavailable. Our team is aware and will be in touch about what happens next.
        </p>
      )}

      {focus.length > 0 && (
        <div className="my-mentor__block">
          <h3 className="my-mentor__block-title">What they mentor in</h3>
          <ul className="my-mentor__tags">
            {focus.map((f) => (
              <li key={f.categoryId} className="my-mentor__tag">{f.label}</li>
            ))}
          </ul>
        </div>
      )}

      <dl className="my-mentor__facts">
        <Fact label="Email" value={mentor.email} />
        <Fact label="Based in" value={placeOf(mentor)} />
        <Fact label="Time zone" value={mentor.timezone} />
      </dl>

      <footer className="my-mentor__foot">
        <Link className="my-mentor__cta" to="/meetings">
          <Icon name="calendar" size={16} />
          <span>Your meetings</span>
        </Link>
      </footer>
    </article>
  )
}

function Fact({ label, value }) {
  if (!value) return null
  return (
    <div className="my-mentor__fact">
      <dt className="my-mentor__fact-label">{label}</dt>
      <dd className="my-mentor__fact-value">{value}</dd>
    </div>
  )
}

/* ============ Unpaired ============ */

function Awaiting({ onboarded }) {
  if (!onboarded) {
    return (
      <div className="my-mentor__empty">
        <p className="my-mentor__empty-title">Finish setting up first</p>
        <p className="my-mentor__empty-body">
          Our team pairs you once your profile is complete. It takes a few minutes.
        </p>
        <Link className="my-mentor__cta" to="/onboarding">
          <span>Complete your setup</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="my-mentor__empty">
      <p className="my-mentor__empty-title">You have not been paired yet</p>
      <p className="my-mentor__empty-body">
        Our team is matching you with a mentor based on what you said you want guidance on.
        You will receive an email when the pairing is ready.
      </p>
      <Link className="my-mentor__cta" to="/profile">
        <span>Review your details</span>
      </Link>
    </div>
  )
}

/* ============ Helpers ============ */

function Avatar({ name, photo }) {
  if (photo) {
    return (
      <span className="my-mentor__avatar">
        <img src={photo} alt="" className="my-mentor__avatar-img" />
      </span>
    )
  }
  return (
    <span className="my-mentor__avatar my-mentor__avatar--initials" aria-hidden="true">
      {initials(name)}
    </span>
  )
}

function placeOf(mentor) {
  return [mentor.location, mentor.country].filter(Boolean).join(', ') || null
}

function initials(full) {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
