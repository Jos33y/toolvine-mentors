import { Logo } from '@/components/shared/Logo/Logo'
import './mentorRelationCard.css'

export function MentorRelationCard({ profile, roles = [] }) {
  // Block C will provide pairing data. Until then we drive the card from
  // profile state + role membership.
  const pairing = null

  const onboarded       = profile?.onboarded === true
  const hasMentorRole   = roles.includes('mentor')
  const isPendingMentor = onboarded && profile?.role_intent === 'mentor' && !hasMentorRole
  const isPendingUnknown = onboarded && profile?.role_undecided === true && !hasMentorRole

  // State 1: not yet onboarded
  if (!onboarded) {
    return (
      <Frame variant="setup">
        <Head eyebrow="Your Mentor" title="Finish setting up" />
        <Body
          copy="A few details about you and your availability. Our team uses this to match you with the right person."
          sub="A few minutes is enough. You can revisit and edit later from your profile."
        />
        <Foot href="/onboarding" label="Complete your setup" />
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
        <Foot href="/profile" label="Review your details" />
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
        <Foot href="/profile" label="Review your details" />
      </Frame>
    )
  }

  // State 4: onboarded, no active pairing, awaiting match as a mentee
  if (!pairing) {
    return (
      <Frame variant="awaiting">
        <Head eyebrow="Your Mentor" title="Awaiting pairing" />
        <Body
          copy="Our team is matching you with a mentor based on the details you have shared."
          sub="You will get an email when the pairing is ready. Most mentees are matched within seven days."
        />
        <Foot href="/profile" label="Review your details" />
      </Frame>
    )
  }

  // State 5: paired view lands with Block C
  return null
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

function Foot({ href, label }) {
  return (
    <footer className="mentor-card__foot">
      <a className="mentor-card__cta" href={href}>
        {label}
        <span className="mentor-card__cta-arrow" aria-hidden="true">→</span>
      </a>
    </footer>
  )
}
