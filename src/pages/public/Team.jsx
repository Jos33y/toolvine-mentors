import { Link } from 'react-router-dom'
import { Logo } from '@/components/shared/Logo/Logo'
import { RevealOnScroll } from '@/components/shared/RevealOnScroll/RevealOnScroll'
import { FOUNDER, BOARD, OPS, MENTORS, initialsFor } from '@/lib/team'
import './Team.css'

/* ============ Component ============ */

export function Team() {
  return (
    <div className="team">
      <div className="team__atmosphere" aria-hidden="true" />

      {/* ============ Hero ============ */}
      <header className="team__hero">
        <div className="team__watermark" aria-hidden="true">
          <Logo variant="mark" size={400} />
        </div>

        <p className="team__eyebrow">THE TEAM</p>
        <h1 className="team__title">
          <span className="team__title-line">The people</span>
          <em className="team__title-italic">who carry it.</em>
        </h1>
        <p className="team__intro">
          Toolvine is carried by a growing circle of leaders, mentors, and volunteers.
          This is who we are today.
        </p>
      </header>

      <div className="team__divider" aria-hidden="true">
        <span className="team__divider-rule" />
        <span className="team__divider-mark">&#8258;</span>
        <span className="team__divider-rule" />
      </div>

      {/* ============ Founder ============ */}
      <section className="team__founder" aria-label="The founder">
        <div className="team__founder-inner">
          <p className="team__section-eyebrow">THE FOUNDER</p>

          <RevealOnScroll threshold={0.2}>
            <div className="team__founder-card">
              {FOUNDER.photo ? (
                <img
                  src={FOUNDER.photo}
                  alt=""
                  className="team__founder-photo"
                />
              ) : (
                <span className="team__founder-photo team__founder-photo--initials" aria-hidden="true">
                  {initialsFor(FOUNDER.name)}
                </span>
              )}
              <div className="team__founder-text">
                <p className="team__founder-role">{FOUNDER.role}</p>
                <h2 className="team__founder-name">{FOUNDER.name}</h2>
                <p className="team__founder-brief">{FOUNDER.brief}</p>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ============ Board ============ */}
      <TeamSection
        eyebrow="THE BOARD"
        title="Our stewards."
        members={BOARD}
        gridMod="board"
      />

      {/* ============ Operations ============ */}
      <TeamSection
        eyebrow="OPERATIONS"
        title="The people who keep it moving."
        members={OPS}
        gridMod="ops"
      />

      {/* ============ Mentors ============ */}
      <TeamSection
        eyebrow="THE MENTORS"
        title="A growing circle."
        members={MENTORS}
        gridMod="mentors"
        compact
      />

      {/* ============ Close ============ */}
      <section className="team__close">
        <div className="team__close-inner">
          <p className="team__close-eyebrow">JOIN THE CIRCLE</p>
          <p className="team__close-body">
            Toolvine grows one relationship at a time.
            If you would like to walk this road with us, there is a place for you.
          </p>
          <div className="team__close-actions">
            <Link to="/auth/sign-up" className="team__close-primary">
              Get started <span aria-hidden="true">&rarr;</span>
            </Link>
            <Link to="/get-involved" className="team__close-secondary">
              Other ways to support
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ============ TeamSection ============
   Reusable section for board / ops / mentors. Renders eyebrow + title,
   then a grid of member cards. compact=true renders name only (used for
   the mentors grid where roles are not shown). */

function TeamSection({ eyebrow, title, members, gridMod, compact }) {
  return (
    <section className={`team__section team__section--${gridMod}`} aria-label={title}>
      <div className="team__section-inner">
        <div className="team__section-head">
          <p className="team__section-eyebrow">{eyebrow}</p>
          <h2 className="team__section-title">{title}</h2>
        </div>

        <div className={`team__grid team__grid--${gridMod}`}>
          {members.map((m, i) => (
            <RevealOnScroll key={m.name} threshold={0.05} delay={Math.min(i * 40, 400)}>
              <article className={`team__member${compact ? ' team__member--compact' : ''}`}>
                <div className="team__member-avatar-wrap">
                  {m.photo ? (
                    <img src={m.photo} alt="" className="team__member-avatar team__member-avatar--photo" />
                  ) : (
                    <span className="team__member-avatar team__member-avatar--initials" aria-hidden="true">
                      {initialsFor(m.name)}
                    </span>
                  )}
                </div>
                <div className="team__member-text">
                  <p className="team__member-name">{m.name}</p>
                  {!compact && m.role && (
                    <p className="team__member-role">{m.role}</p>
                  )}
                </div>
              </article>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}
