import { Link } from 'react-router-dom'
import { Logo } from '@/components/shared/Logo/Logo'
import { pairedSinceLabel } from '@/lib/format'
import './mentorRelationCard.css'

const FOCUS_CAP = 3

export function MentorRelationCard({ profile, roles = [], pairing = null, loading = false }) {
  const onboarded        = profile?.onboarded === true
  const hasMentorRole    = roles.includes('mentor')
  const isPendingMentor  = onboarded && profile?.role_intent === 'mentor' && !hasMentorRole
  const isPendingUnknown = onboarded && profile?.role_undecided === true && !hasMentorRole

  const mentor = pairing?.mentor ?? null

  // State 1: not yet onboarded
  if (!onboarded) {
    return (
      <Frame variant="setup">
        <Head eyebrow="Your Mentor" title="Finish setting up" />
        <Body
          copy="A few details about you and your availability. Our team uses this to match you with the right person."
          sub="A few minutes is enough. You can revisit and edit later from your profile."
        />
        <Foot to="/onboarding" label="Complete your setup" />
      </Frame>
    )
  }

  // State 2: signed up as mentor, awaiting admin approval
  if (isPendingMentor) {
    return (
      <Frame variant="pending">
        <Head eyebrow="Application status" title="Mentor application under review" />
        <Body
          copy="Our team is reviewing your application. They will be in touch once a decision is made."
          sub="You will get an email when the decision is ready. Most applications are reviewed within a few days."
        />
        <Foot to="/profile" label="Review your details" />
      </Frame>
    )
  }

  // State 3: signed up undecided, awaiting role decision
  if (isPendingUnknown) {
    return (
      <Frame variant="pending">
        <Head eyebrow="Application status" title="Your role is being reviewed" />
        <Body
          copy="Our team will decide whether to pair you as a mentor or as a mentee."
          sub="You will get an email when the decision is ready. You can update your details from your profile in the meantime."
        />
        <Foot to="/profile" label="Review your details" />
      </Frame>
    )
  }

  // State 4: still reading. Held rather than showing "awaiting pairing" for a
  // beat and then replacing it, which would misinform a mentee who has one.
  if (loading) {
    return (
      <Frame variant="awaiting">
        <Head eyebrow="Your Mentor" title="Loading" />
        <div className="mentor-card__skeleton" aria-hidden="true" />
      </Frame>
    )
  }

  // State 5: onboarded, no active pairing
  if (!mentor) {
    return (
      <Frame variant="awaiting">
        <Head eyebrow="Your Mentor" title="Awaiting pairing" />
        <Body
          copy="Our team is matching you with a mentor based on the details you have shared."
          sub="You will get an email when the pairing is ready. Most mentees are matched within seven days."
        />
        <Foot to="/profile" label="Review your details" />
      </Frame>
    )
  }

  // State 6: paired
  const focus = pairing.focus ?? []
  const since = pairedSinceLabel(pairing.startedAt)

  return (
    <Frame variant="paired">
      <Head eyebrow="Your Mentor" title={mentor.full_name} />

      <div className="mentor-card__person">
        <Avatar name={mentor.full_name} photo={mentor.photo_url} />
        <div className="mentor-card__person-text">
          {mentor.display_title && (
            <p className="mentor-card__role">{mentor.display_title}</p>
          )}
          {since && <p className="mentor-card__since">Paired since {since}</p>}
        </div>
      </div>

      {focus.length > 0 ? (
        <ul className="mentor-card__focus" aria-label="Areas they mentor in">
          {focus.slice(0, FOCUS_CAP).map((f) => (
            <li key={f.categoryId} className="mentor-card__focus-tag">{f.label}</li>
          ))}
        </ul>
      ) : (
        // Not every mentor has set focus areas. Falling back to where they are
        // keeps the card informative rather than leaving a hole where the tags
        // would have been.
        placeOf(mentor) && (
          <p className="mentor-card__place">Based in {placeOf(mentor)}</p>
        )
      )}

      {mentor.is_active === false && (
        <p className="mentor-card__notice">
          This mentor is currently unavailable. Our team is aware and will be in touch.
        </p>
      )}

      <Foot to="/mentor" label="View your pairing" />
    </Frame>
  )
}

/* ============ Frame ============ */

function Frame({ variant, children }) {
  return (
    <article className={`mentor-card mentor-card--${variant}`}>
      {children}
      <div className="mentor-card__watermark" aria-hidden="true">
        <Logo variant="mark-mono" size={160} />
      </div>
    </article>
  )
}

function Head({ eyebrow, title }) {
  return (
    <header className="mentor-card__head">
      <p className="mentor-card__eyebrow">{eyebrow}</p>
      <h2 className="mentor-card__title">{title}</h2>
    </header>
  )
}

function Body({ copy, sub }) {
  return (
    <div className="mentor-card__body">
      <p className="mentor-card__copy">{copy}</p>
      {sub && <p className="mentor-card__sub">{sub}</p>}
    </div>
  )
}

// Link, not an anchor. A raw href drops out of the SPA and reloads the app.
function Foot({ to, label }) {
  return (
    <footer className="mentor-card__foot">
      <Link className="mentor-card__cta" to={to}>
        {label}
        <span className="mentor-card__cta-arrow" aria-hidden="true">&rarr;</span>
      </Link>
    </footer>
  )
}

function Avatar({ name, photo }) {
  if (photo) {
    return (
      <span className="mentor-card__avatar">
        <img src={photo} alt="" className="mentor-card__avatar-img" />
      </span>
    )
  }
  return (
    <span className="mentor-card__avatar mentor-card__avatar--initials" aria-hidden="true">
      {initials(name)}
    </span>
  )
}

function placeOf(mentor) {
  return [mentor?.location, mentor?.country].filter(Boolean).join(', ') || null
}

function initials(full) {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
