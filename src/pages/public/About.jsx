import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import { Logo } from '@/components/shared/Logo/Logo'
import { RevealOnScroll } from '@/components/shared/RevealOnScroll/RevealOnScroll'
import michaelPhoto from '@/assets/portraits/michael-alade.jpg'
import { BOARD as TEAM_BOARD, personFor, initialsFor } from '@/lib/team'
import { EDITIONS, archiveEditions, isCurrentEdition } from '@/lib/vinethoughts'
import { fetchPublicSchedule, nextBySlug, programmeWhenParts } from '@/lib/programmes'
import './About.css'
import './About.vine.css'

// Six-avatar teaser strip for the About team section. The five board members
// plus one team lead, so the strip mixes photos with initials exactly as the
// /team page does.
const TEAM_STRIP = [
  ...TEAM_BOARD.map((entry) => personFor(entry.id)),
  personFor('olayinka')
]

/* ============ Data ============ */

const VOICES = [
  {
    quote: 'Faith has been my absolute compass. In seasons of uncertainty, my reliance on God gave me a shield and ordered my steps.',
    name: 'Mentor Yetunde Sorinola',
    title: 'CFO, Egbin Power PLC',
    edition: 'Vol. 06'
  },
  {
    quote: 'Never let anyone define your worth or your potential.',
    name: 'Dr. Busayo Oladepo',
    title: 'DNP, Nurse Practitioner',
    edition: 'Vol. 05'
  },
  {
    quote: 'Pilate chose peace over justice. Leaders often face the temptation to maintain harmony at the expense of truth.',
    name: 'Mentor Dayo Adewole',
    title: '',
    edition: 'Vol. 06'
  },
  {
    quote: 'You are not God. You do not control all outcomes. And it is time to release yourself from guilt that never belonged to you.',
    name: 'Grace Ochigbo',
    title: 'Author',
    edition: 'Vol. 05'
  }
]

const FOUNDER = {
  photo: michaelPhoto,
  role: 'FOUNDER · LEAD MENTOR',
  name: 'Dr. Michael Abimbola Alade',
  paragraphs: [
    'Toolvine Mentors & Leaders Initiative was born from a calling that preceded the platform. From leading the University of Ibadan school fellowship between 2007 and 2009, to mentoring younger colleagues through his clinical career as a pediatric dentist, the work of guiding people was already underway.',
    'In 2021, with the support of family, trusted friends, and mentees, Toolvine Mentors was officially established to connect Christian mentors and mentees for transformational impact through Christ-centered mentorship and leadership development.'
  ],
  quote: 'What started as informal guidance gradually grew into a deeper calling to mentorship.'
}

// Draft mission awaiting client sign-off. Vision is the founder's stated
// statement, elevated to a proper section with equal weight to the mission.
const PURPOSE = {
  mission: 'To raise Christ-centered leaders through structured mentorship. Toolvine pairs experienced mentors with those coming after them, holds the record of the relationship, and equips both sides to walk in their calling with clarity.',
  vision: 'We connect at least a member of every Christian household to a mentor or to a mentee for impact.'
}

const EDITORIAL_NAMES = [
  'Abigail Jesutofunmi Alade',
  'Ayobami Adeyinka',
  'Blessing Ayorinde',
  'Ayodele Enoch Oladiran',
  'Kikelomo Olabamiji',
  'Deborah Adeyemi',
  'Oluwafunmike Fajana'
]

const SOCIALS = [
  { label: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/toolvine_mentors_initiative' },
  { label: 'Facebook',  icon: 'facebook',  url: 'https://www.facebook.com/Toolvinementors' },
  { label: 'YouTube',   icon: 'youtube',   url: 'https://www.youtube.com/@ToolvineMentors' },
  { label: 'TikTok',    icon: 'tiktok',    url: 'https://www.tiktok.com/@toolvine_mentors' },
  { label: 'X',         icon: 'x',         url: 'https://x.com/toolvinementors' }
]

/* ============ Vinethoughts cover ============ */

function VineCover({ issue, featured }) {
  const isCurrent = isCurrentEdition(issue.num)
  const skyId = `cover-sky-${issue.num}${featured ? '-f' : ''}`

  return (
    <div className={`about__cover${featured ? ' about__cover--featured' : ''}${isCurrent ? ' about__cover--current' : ''}`}>
      <svg className="about__cover-sky" viewBox="0 0 360 480" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={skyId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a3d38" />
            <stop offset="60%" stopColor="#0F766E" />
            <stop offset="100%" stopColor="#094a44" />
          </linearGradient>
        </defs>
        <path d="M 0,0 L 360,0 L 360,128 Q 260,158 180,140 Q 90,118 0,148 Z" fill={`url(#${skyId})`} />
      </svg>

      <div className="about__cover-shimmer" aria-hidden="true" />

      <svg className="about__cover-vine about__cover-vine--tr" viewBox="0 0 100 160" aria-hidden="true">
        <g fill="none" stroke="#5EEAD4" strokeWidth="1.1" opacity="0.45">
          <path d="M 92,4 Q 78,28 68,55 Q 58,90 52,128 Q 48,148 42,160" />
        </g>
        <g fill="#5EEAD4" opacity="0.5">
          <ellipse cx="80" cy="22" rx="4.5" ry="10" transform="rotate(-30 80 22)" />
          <ellipse cx="70" cy="50" rx="5.5" ry="12" transform="rotate(-20 70 50)" />
          <ellipse cx="58" cy="88" rx="6.5" ry="13" transform="rotate(-12 58 88)" />
          <ellipse cx="50" cy="122" rx="7" ry="14" transform="rotate(-2 50 122)" />
        </g>
      </svg>

      <svg className="about__cover-vine about__cover-vine--bl" viewBox="0 0 120 180" aria-hidden="true">
        <g fill="none" stroke="#0F766E" strokeWidth="1.1" opacity="0.32">
          <path d="M 4,176 Q 24,142 36,112 Q 50,76 60,42 Q 70,16 96,6" />
        </g>
        <g fill="#0F766E" opacity="0.38">
          <ellipse cx="22" cy="148" rx="6.5" ry="14" transform="rotate(58 22 148)" />
          <ellipse cx="40" cy="112" rx="7.5" ry="15" transform="rotate(44 40 112)" />
          <ellipse cx="55" cy="72" rx="8" ry="16" transform="rotate(28 55 72)" />
          <ellipse cx="74" cy="34" rx="6.5" ry="13" transform="rotate(14 74 34)" />
        </g>
      </svg>

      <svg className="about__cover-vine about__cover-vine--br" viewBox="0 0 120 180" aria-hidden="true">
        <g fill="none" stroke="#0F766E" strokeWidth="1.1" opacity="0.32">
          <path d="M 116,176 Q 96,142 84,112 Q 70,76 60,42 Q 50,16 24,6" />
        </g>
        <g fill="#0F766E" opacity="0.38">
          <ellipse cx="98" cy="148" rx="6.5" ry="14" transform="rotate(-58 98 148)" />
          <ellipse cx="80" cy="112" rx="7.5" ry="15" transform="rotate(-44 80 112)" />
          <ellipse cx="65" cy="72" rx="8" ry="16" transform="rotate(-28 65 72)" />
          <ellipse cx="46" cy="34" rx="6.5" ry="13" transform="rotate(-14 46 34)" />
        </g>
      </svg>

      <div className="about__cover-mark">
        <Logo variant="mark-light" size={featured ? 18 : 12} />
        <span className="about__cover-mark-label">TOOLVINE</span>
      </div>

      <div className="about__cover-title">
        <h3 className="about__cover-masthead">Vinethoughts</h3>
        {featured && (
          <p className="about__cover-subtitle">
            <span className="about__cover-subtitle-rule" aria-hidden="true" />
            <em>Quarterly Newsletter</em>
            <span className="about__cover-subtitle-rule" aria-hidden="true" />
          </p>
        )}
        <p className="about__cover-date">{issue.date}</p>
      </div>

      <div className="about__cover-emblem" aria-hidden="true">
        <svg className="about__cover-emblem-disc" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="#0F766E" stroke="#FCD34D" strokeWidth="1.2" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(252, 211, 77, 0.35)" strokeWidth="0.5" />
        </svg>
        <span className="about__cover-emblem-prefix">Vol.</span>
        <span className="about__cover-emblem-num">{issue.num}</span>
      </div>

      {featured && issue.stories && issue.stories.length > 0 && (
        <div className="about__cover-feature">
          <p className="about__cover-feature-tag">FEATURED INTERVIEW</p>
          <p className="about__cover-feature-name">{issue.featured}</p>
          {issue.coverline && <p className="about__cover-feature-line">{issue.coverline}</p>}
        </div>
      )}

      <div className="about__cover-foot">EST. MMXXI &middot; TOOLVINE MENTORS</div>
    </div>
  )
}

/* ============ Portrait (founder): photo-led, no chrome, amber rule under ============ */

function Portrait({ person }) {
  return (
    <figure className="about__portrait">
      <div className="about__portrait-photo">
        <div className="about__portrait-light" aria-hidden="true" />
        <div className="about__portrait-img-wrap">
          <img src={person.photo} alt="" className="about__portrait-img" />
          <div className="about__portrait-img-overlay" aria-hidden="true" />
        </div>
      </div>
      <figcaption className="about__portrait-caption">
        <p className="about__portrait-role">{person.role}</p>
        <h2 className="about__portrait-name">{person.name}</h2>
      </figcaption>
    </figure>
  )
}

/* ============ Page ============ */

export function About() {
  const [heroIn, setHeroIn] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState(EDITIONS[0]?.num ?? '')
  const [nextMeeting, setNextMeeting] = useState(null)
  const rackRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setHeroIn(true), 120)
    return () => clearTimeout(t)
  }, [])

  // The next Family Meeting, derived from its rule rather than written down.
  // Failing leaves the block unrendered: a marketing page with no date is
  // better than one asserting a date that has moved.
  useEffect(() => {
    let cancelled = false
    fetchPublicSchedule()
      .then((rows) => {
        if (cancelled) return
        setNextMeeting(nextBySlug(rows).get('family_meeting') ?? null)
      })
      .catch((e) => console.warn('[about] next meeting unavailable:', e?.message || e))
    return () => { cancelled = true }
  }, [])

  const current = EDITIONS.find((i) => i.num === selectedIssue) || EDITIONS[0]
  const archive = archiveEditions(selectedIssue)

  function selectIssue(num) {
    setSelectedIssue(num)
    // Scroll rack into view so the visitor sees the updated stories panel
    rackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="about">

      {/* ============ 1. Hero: The Conviction ============ */}
      <header className={`about__hero${heroIn ? ' is-in' : ''}`}>
        <div className="about__hero-vesica" aria-hidden="true">
          <Logo variant="mark" size={400} />
        </div>

        <div className="about__hero-content">
          <p className="about__hero-eyebrow">ABOUT</p>

          <h1 className="about__hero-title">
            <span className="about__hero-word" style={{ '--d': '0ms' }}>No one should</span>
            <em className="about__hero-conviction" style={{ '--d': '160ms' }}>walk alone.</em>
          </h1>

          <p className="about__hero-body" style={{ '--d': '380ms' }}>
            Toolvine Mentors and Leaders Initiative connects Christian mentors
            and mentees for transformational impact through Christ-centered
            mentorship and leadership development. Founded 2021, Ibadan, Nigeria.
          </p>

          <figure className="about__hero-scripture" style={{ '--d': '560ms' }}>
            <div className="about__hero-scripture-rule" aria-hidden="true" />
            <blockquote>
              As iron sharpens iron, so one person sharpens another.
            </blockquote>
            <figcaption>(Proverbs 27:17)</figcaption>
          </figure>

          <div className="about__hero-meta" style={{ '--d': '720ms' }}>
            <span>EST. 2021</span>
            <span aria-hidden="true">&middot;</span>
            <span>IBADAN, NIGERIA</span>
          </div>
        </div>
      </header>

      {/* ============ 2. Voices (dark atmospheric) ============ */}
      <section className="about__voices" aria-label="Community voices">
        <div className="about__voices-glow" aria-hidden="true" />
        <div className="about__voices-grid-bg" aria-hidden="true" />
        <div className="about__voices-grain" aria-hidden="true" />

        <div className="about__voices-inner">
          <p className="about__voices-eyebrow">VOICES FROM VINETHOUGHTS</p>

          <div className="about__voices-quotes">
            {VOICES.map((v, i) => (
              <RevealOnScroll key={v.name} threshold={0.1} delay={i * 100}>
                <blockquote className="about__voice">
                  <span className="about__voice-mark" aria-hidden="true">&ldquo;</span>
                  <p className="about__voice-text">{v.quote}</p>
                  <footer className="about__voice-attr">
                    <span className="about__voice-rule" aria-hidden="true" />
                    <cite className="about__voice-name">{v.name}</cite>
                    {v.title && <span className="about__voice-title">{v.title}</span>}
                    <span className="about__voice-context">{v.edition}</span>
                  </footer>
                </blockquote>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 3. The Founder ============ */}
      <section className="about__founder" aria-label="The founder">
        <div className="about__founder-inner">
          <RevealOnScroll threshold={0.15}>
            <Portrait person={FOUNDER} />
          </RevealOnScroll>

          <div className="about__founder-content">
            <RevealOnScroll threshold={0.2} delay={120}>
              <div className="about__founder-prose">
                {FOUNDER.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              <figure className="about__founder-pullquote">
                <blockquote>
                  <span aria-hidden="true">&ldquo;</span>{FOUNDER.quote}<span aria-hidden="true">&rdquo;</span>
                </blockquote>
              </figure>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ============ 4. Purpose (Mission and Vision) ============ */}
      <section className="about__purpose" aria-label="Mission and Vision">
        <div className="about__purpose-inner">
          <div className="about__purpose-head">
            <p className="about__purpose-eyebrow">THE FOUNDATION</p>
            <h2 className="about__purpose-title">Mission and Vision.</h2>
          </div>

          <div className="about__purpose-grid">
            <RevealOnScroll threshold={0.2}>
              <div className="about__purpose-block about__purpose-block--mission">
                <p className="about__purpose-label">THE MISSION</p>
                <p className="about__purpose-body">{PURPOSE.mission}</p>
              </div>
            </RevealOnScroll>

            <div className="about__purpose-divider" aria-hidden="true" />

            <RevealOnScroll threshold={0.2} delay={120}>
              <div className="about__purpose-block about__purpose-block--vision">
                <p className="about__purpose-label">THE VISION</p>
                <p className="about__purpose-body">{PURPOSE.vision}</p>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ============ 4a. Support aside (small, quiet) ============ */}
      <aside className="about__support" aria-label="Other ways to support">
        <div className="about__support-inner">
          <RevealOnScroll threshold={0.3}>
            <p className="about__support-title">
              There are other ways to walk with us.
            </p>
            <p className="about__support-body">
              Volunteer, sponsor, invest, or partner with Toolvine.
            </p>
            <Link to="/get-involved" className="about__support-cta">
              Get involved <span aria-hidden="true">&rarr;</span>
            </Link>
          </RevealOnScroll>
        </div>
      </aside>

      {/* ============ 5. Vinethoughts ============ */}
      <section className="about__vine" aria-label="Vinethoughts">
        <div className="about__vine-inner">
          <div className="about__vine-head" ref={rackRef}>
            <p className="about__vine-eyebrow">THE PUBLICATION</p>
            <h2 className="about__vine-title">Vinethoughts</h2>
            <p className="about__vine-lede">
              The quarterly publication of the initiative.
              Six editions and counting. Click any cover to read.
            </p>
          </div>

          <div className="about__vine-rack">
            <RevealOnScroll threshold={0.1}>
              <div className="about__vine-featured">
                <VineCover issue={current} featured />
              </div>
            </RevealOnScroll>

            <div className="about__vine-stories">
              {current.stories.length > 0 ? (
                <>
                  <p className="about__vine-stories-head">INSIDE VOL. {current.num}</p>
                  <ul className="about__vine-stories-list">
                    {current.stories.map((s, i) => (
                      <RevealOnScroll key={s.title} threshold={0.1} delay={i * 80}>
                        <li className="about__story">
                          <p className="about__story-type">{s.type}</p>
                          <h3 className="about__story-title">{s.title}</h3>
                          <p className="about__story-byline">
                            <span>{s.byline}</span>
                            {s.subline && <span className="about__story-subline">{s.subline}</span>}
                          </p>
                          <p className="about__story-quote">
                            <span aria-hidden="true">&ldquo;</span>{s.quote}<span aria-hidden="true">&rdquo;</span>
                          </p>
                        </li>
                      </RevealOnScroll>
                    ))}
                  </ul>
                  {current.flipbook && (
                    <a
                      href={current.flipbook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="about__vine-read-link"
                    >
                      Read full edition <span aria-hidden="true">&rarr;</span>
                    </a>
                  )}
                </>
              ) : (
                <div className="about__vine-archive-note">
                  <p className="about__vine-archive-head">PAST EDITION</p>
                  <h3 className="about__vine-archive-title">Vol. {current.num} &middot; {current.date}</h3>
                  <p className="about__vine-archive-body">
                    {current.flipbook
                      ? 'Read this edition in full on Heyzine.'
                      : 'Past issues are archived. Browse from the resources area.'}
                  </p>
                  {current.flipbook ? (
                    <a
                      href={current.flipbook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="about__vine-archive-link"
                    >
                      Read on Heyzine <span aria-hidden="true">&rarr;</span>
                    </a>
                  ) : (
                    <Link to="/resources" className="about__vine-archive-link">
                      Browse past issues <span aria-hidden="true">&rarr;</span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="about__vine-strip" role="tablist" aria-label="Past issues">
            {archive.map((iss) => (
              <button
                key={iss.num}
                type="button"
                role="tab"
                aria-selected={iss.num === selectedIssue}
                className="about__vine-strip-btn"
                onClick={() => selectIssue(iss.num)}
              >
                <VineCover issue={iss} />
              </button>
            ))}
          </div>

          <p className="about__vine-credits">
            Edited by {EDITORIAL_NAMES[0]}.
            Contributors: {EDITORIAL_NAMES.slice(1).join(', ')}.
          </p>
        </div>
      </section>

      {/* ============ 6. The Team (avatar-strip teaser) ============ */}
      <section className="about__team" aria-label="The team">
        <div className="about__team-inner">
          <RevealOnScroll threshold={0.2}>
            <p className="about__team-eyebrow">THE TEAM</p>
            <h2 className="about__team-title">The people who carry it.</h2>

            <ul className="about__team-strip" aria-label="A few of the people">
              {TEAM_STRIP.map((p, i) => (
                <li
                  key={p.name}
                  className="about__team-strip-item"
                  style={{ zIndex: TEAM_STRIP.length - i }}
                  title={p.name}
                >
                  {p.photo ? (
                    <img src={p.photo} alt="" className="about__team-strip-avatar about__team-strip-avatar--photo" />
                  ) : (
                    <span className="about__team-strip-avatar about__team-strip-avatar--initials" aria-hidden="true">
                      {initialsFor(p.name)}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            <p className="about__team-body">
              Dr. Alade chairs a board of five. Seven teams keep the work moving, and the mentors walk with the mentees.
            </p>

            <Link to="/team" className="about__team-cta">
              Meet the team <span aria-hidden="true">&rarr;</span>
            </Link>
          </RevealOnScroll>
        </div>
      </section>

      {/* ============ 7. Invitation ============ */}
      <section className="about__invite" aria-label="Get involved">
        <div className="about__invite-inner">
          <p className="about__invite-asterism" aria-hidden="true">&lowast;&lowast;&lowast;</p>

          {nextMeeting && (
            <div className="about__invite-meeting">
              <p className="about__invite-meeting-eyebrow">NEXT FAMILY MEETING</p>
              <p className="about__invite-meeting-date">{meetingDate(nextMeeting)}</p>
              {/* No mode line. programme_schedule_public withholds the location
                  on purpose, so this page cannot know whether it is online and
                  will not guess. */}
              <p className="about__invite-meeting-time">
                {programmeWhenParts(nextMeeting)?.time} {programmeWhenParts(nextMeeting)?.zone}
              </p>
            </div>
          )}

          <p className="about__invite-line">
            Come to one meeting. See if this is for you.
          </p>

          <Link to="/auth/sign-up" className="about__invite-btn">
            Get started <span aria-hidden="true">&rarr;</span>
          </Link>

          <div className="about__invite-socials">
            <p className="about__invite-socials-eyebrow">FIND US</p>
            <ul className="about__invite-socials-list">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    <Icon name={s.icon} size={16} strokeWidth={1.5} />
                    <span>{s.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <p className="about__invite-colophon">
            Toolvine Mentors and Leaders Initiative &middot; Est. 2021 &middot; Ibadan, Nigeria
          </p>
        </div>
      </section>
    </div>
  )
}

// Long form, matching the tone of the block it sits in: "Sunday, 20 September
// 2026" rather than a numeral rail.
function meetingDate(occurrence) {
  if (!occurrence?.occurs_on) return ''
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  }).format(new Date(`${occurrence.occurs_on}T12:00:00Z`))
}
