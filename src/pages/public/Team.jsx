import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/shared/Logo/Logo'
import { RevealOnScroll } from '@/components/shared/RevealOnScroll/RevealOnScroll'
import {
  FOUNDER,
  BOARD,
  TEAMS,
  ADMIN,
  MENTORS,
  personFor,
  appearsMoreThanOnce,
  initialsFor
} from '@/lib/team'
import './Team.css'

/* ============ Component ============ */

export function Team() {
  // Which person is under the cursor. Four of the six team leads also sit on
  // the board, so hovering one appearance marks the others.
  const [activeId, setActiveId] = useState(null)

  const linkProps = useCallback((id) => {
    if (!appearsMoreThanOnce(id)) return {}
    return {
      onMouseEnter: () => setActiveId(id),
      onMouseLeave: () => setActiveId(null)
    }
  }, [])

  const isLinked = (id) => (activeId === id ? ' is-linked' : '')

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
          A board of five, six teams, and a growing circle of mentors.
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
            <div
              className={`team__founder-card${isLinked(FOUNDER.id)}`}
              {...linkProps(FOUNDER.id)}
            >
              <span className="team__link-mark" aria-hidden="true" />

              {FOUNDER.photo ? (
                <img src={FOUNDER.photo} alt="" className="team__founder-photo" />
              ) : (
                <span
                  className="team__founder-photo team__founder-photo--initials"
                  aria-hidden="true"
                >
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
      <section className="team__section team__section--board" aria-label="The board">
        <div className="team__section-inner">
          <div className="team__section-head">
            <p className="team__section-eyebrow">THE BOARD</p>
            <h2 className="team__section-title">Our stewards.</h2>
            <p className="team__section-note">
              Five members steward the direction of the initiative.
            </p>
          </div>

          <ul className="team__roster">
            {BOARD.map(({ id, boardRole }, i) => {
              const person = personFor(id)
              return (
                <li key={id} className="team__roster-item">
                  <RevealOnScroll threshold={0.05} delay={Math.min(i * 60, 300)}>
                    <div
                      className={`team__roster-row${isLinked(id)}`}
                      {...linkProps(id)}
                    >
                      <span className="team__link-mark" aria-hidden="true" />
                      <Avatar person={person} size="roster" />
                      <p className="team__roster-name">{person.name}</p>
                      <p className="team__roster-role">{boardRole}</p>
                    </div>
                  </RevealOnScroll>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      {/* ============ Teams and administration ============ */}
      <section className="team__section team__section--teams" aria-label="The teams">
        <div className="team__section-inner">
          <div className="team__section-head">
            <p className="team__section-eyebrow">THE TEAMS</p>
            <h2 className="team__section-title">Carried day to day.</h2>
            <p className="team__section-note">
              Six teams keep the work moving, each one led by a mentor.
            </p>
          </div>

          <ol className="team__ledger">
            {TEAMS.map((team, i) => {
              const lead = personFor(team.leadId)
              return (
                <li key={team.name} className="team__ledger-item">
                  <RevealOnScroll threshold={0.05} delay={Math.min(i * 50, 300)}>
                    <div
                      className={`team__ledger-row${isLinked(team.leadId)}`}
                      {...linkProps(team.leadId)}
                    >
                      <span className="team__link-mark" aria-hidden="true" />
                      <span className="team__ledger-index" aria-hidden="true">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p className="team__ledger-name">{team.name}</p>
                      <div className="team__ledger-lead">
                        <Avatar person={lead} size="ledger" />
                        <span className="team__ledger-lead-name">{lead.name}</span>
                      </div>
                    </div>
                  </RevealOnScroll>
                </li>
              )
            })}
          </ol>

          <div className="team__admin">
            <p className="team__admin-label">ADMINISTRATION</p>
            <div
              className={`team__admin-row${isLinked(ADMIN.id)}`}
              {...linkProps(ADMIN.id)}
            >
              <Avatar person={personFor(ADMIN.id)} size="ledger" />
              <div className="team__admin-text">
                <p className="team__admin-name">{personFor(ADMIN.id).name}</p>
                <p className="team__admin-role">{ADMIN.role}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ Mentors ============ */}
      <section className="team__section team__section--mentors" aria-label="The mentors">
        <div className="team__section-inner">
          <div className="team__section-head">
            <p className="team__section-eyebrow">THE MENTORS</p>
            <h2 className="team__section-title">A growing circle.</h2>
          </div>

          <div className="team__grid team__grid--mentors">
            {MENTORS.map((m, i) => (
              <RevealOnScroll key={m.name} threshold={0.05} delay={Math.min(i * 40, 400)}>
                <article className="team__member team__member--compact">
                  <div className="team__member-avatar-wrap">
                    <Avatar person={m} size="member" />
                  </div>
                  <div className="team__member-text">
                    <p className="team__member-name">{m.name}</p>
                  </div>
                </article>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

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

/* ============ Avatar ============ */
// Photo where supplied, initials otherwise. Decorative in every position,
// since the person's name is always written out beside it.

function Avatar({ person, size }) {
  const base = `team__avatar team__avatar--${size}`

  if (person.photo) {
    return <img src={person.photo} alt="" className={`${base} team__avatar--photo`} />
  }

  return (
    <span className={`${base} team__avatar--initials`} aria-hidden="true">
      {initialsFor(person.name)}
    </span>
  )
}
