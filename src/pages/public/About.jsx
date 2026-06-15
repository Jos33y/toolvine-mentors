import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import { Logo } from '@/components/shared/Logo/Logo'
import { RevealOnScroll } from '@/components/shared/RevealOnScroll/RevealOnScroll'
import michaelPhoto from '@/assets/portraits/michael-alade.jpg'
import abigailPhoto from '@/assets/portraits/abigail-alade.jpg'
import joyPhoto from '@/assets/portraits/joy-ajayi.jpg'
import './About.css'
import './About.vine.css'

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
    'In 2020, with the support of family, trusted friends, and mentees, ToolVine Mentors was officially established to connect Christian mentors and mentees for transformational impact through Christ-centered mentorship and leadership development.'
  ],
  quote: 'What started as informal guidance gradually grew into a deeper calling to mentorship.',
  vision: 'We connect at least a member of every Christian household to a mentor or to a mentee for impact.'
}

const TEAM = [
  { initials: 'AA', name: 'Abigail Jesutofunmi Alade',  role: 'Secretariat Lead',            photo: abigailPhoto, group: 'board' },
  { initials: 'JA', name: 'Joy Oluwaseun Ajayi',        role: 'Social Media Lead',           photo: joyPhoto,     group: 'board' },
  { initials: 'OO', name: 'Olamide Oluwaseyi Oladepo',  role: 'Recruitment & Training Lead', photo: null,         group: 'board' },
  { initials: 'AO', name: 'Adedayo Oreoluwa Adewole',   role: 'Programme Unit Lead',         photo: null,         group: 'board' },
  { initials: 'OA', name: 'Olayinka Ajayi',             role: 'Pathway Tracking Lead',       photo: null,         group: 'ops' },
  { initials: 'AJ', name: 'Mentor Adedoyin Jegede',     role: 'Welfare Lead',                photo: null,         group: 'ops' },
  { initials: 'KO', name: 'Kikelomo Olabamiji',         role: 'Admin, Initiative',           photo: null,         group: 'ops' }
]

const EDITORIAL_NAMES = [
  'Abigail Jesutofunmi Alade',
  'Ayobami Adeyinka',
  'Blessing Ayorinde',
  'Ayodele Enoch Oladiran',
  'Kikelomo Olabamiji',
  'Deborah Adeyemi',
  'Oluwafunmike Fajana'
]

const ISSUES = [
  {
    num: '06', date: 'MARCH 2026', featured: 'Mentor Yetunde Sorinola',
    coverline: 'On faith, career, and rising through delays',
    flipbook: 'https://heyzine.com/flip-book/1fa3ba745b.html',
    stories: [
      { type: 'EXCLUSIVE INTERVIEW', title: 'On faith, career, and the long climb to leadership', byline: 'Mentor Yetunde Sorinola',  subline: 'CFO, Egbin Power PLC',          quote: 'Faith has been my absolute compass. In seasons of uncertainty, my reliance on God gave me a shield and ordered my steps.' },
      { type: 'FEATURED ARTICLE',    title: 'The Leadership of Pontius Pilate',                   byline: 'Mentor Dayo Adewole',       subline: '',                               quote: 'Pilate chose peace over justice. Leaders often face the temptation to maintain harmony at the expense of truth.' },
      { type: 'SPEAKER SERIES',      title: 'From Desire to Reality',                             byline: 'Aramide Kayode',            subline: 'Founder, Talent Mike Academy',   quote: 'I had a choice to make. Driven by a deep conviction, I declined the investment banking job and signed up to teach in a rural community.' },
      { type: 'BOOK REVIEW',         title: 'The Fourth Dimension, by David Yonggi Cho',          byline: 'Mentor Samuel Asawole',     subline: 'reviewer',                       quote: 'Faith must be intentional and incubated. Spiritual breakthroughs often grow quietly before appearing outwardly.' }
    ]
  },
  {
    num: '05', date: 'DEC 2025', featured: 'Dr. Busayo Oladepo',
    coverline: 'Christmas Special',
    flipbook: 'https://heyzine.com/flip-book/93ba1ab5de.html',
    stories: [
      { type: 'EXCLUSIVE INTERVIEW', title: 'On faith, nursing, and breaking barriers as an immigrant', byline: 'Dr. Busayo Oladepo', subline: 'DNP, Nurse Practitioner', quote: 'Never let anyone define your worth or your potential.' },
      { type: 'SPEAKER SERIES',      title: 'Nurturing Mental Wellness and Healing in Uncertain Times', byline: 'Dr. Oluwatofunmi Eyekpegha', subline: '', quote: 'Mental wellness is not merely the absence of illness; it is the capacity to adapt, find meaning, and thrive.' },
      { type: 'FEATURED ARTICLE',    title: 'It Is Not Your Fault',                                     byline: 'Grace Ochigbo',      subline: 'Author',   quote: 'You are not God. You do not control all outcomes. Release yourself from guilt that never belonged to you.' },
      { type: 'BOOK REVIEW',         title: 'The 12 Week Year, by Brian P. Moran & Michael Lennington', byline: 'Ayodele Oladiran',   subline: 'reviewer', quote: 'Extraordinary results are often not the product of extraordinary talent, but of extraordinary focus applied over a short, intense period.' }
    ]
  },
  { num: '04', date: 'Q3 2025', featured: 'Archive', coverline: 'Past edition',  flipbook: null, stories: [] },
  { num: '03', date: 'Q2 2025', featured: 'Archive', coverline: 'Past edition',  flipbook: null, stories: [] },
  { num: '02', date: 'Q1 2025', featured: 'Archive', coverline: 'Past edition',  flipbook: null, stories: [] },
  { num: '01', date: 'Q4 2024', featured: 'Archive', coverline: 'First edition',
    flipbook: 'https://heyzine.com/flip-book/fd3044c0be.html', stories: [] }
]

const SOCIALS = [
  { label: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/toolvine_mentors_initiative' },
  { label: 'Facebook',  icon: 'facebook',  url: 'https://www.facebook.com/Toolvinementors' },
  { label: 'YouTube',   icon: 'youtube',   url: 'https://www.youtube.com/@ToolvineMentors' },
  { label: 'TikTok',    icon: 'tiktok',    url: 'https://www.tiktok.com/@toolvine_mentors' },
  { label: 'X',         icon: 'x',         url: 'https://x.com/toolvinementors' }
]

const NEXT_MEETING = {
  date: 'Friday, 12 September 2026',
  time: '7:00 PM WAT',
  mode: 'Online'
}

/* ============ Vinethoughts cover ============ */

function VineCover({ issue, featured }) {
  const isCurrent = issue.num === '06'
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

      <div className="about__cover-foot">EST. MMXX &middot; TOOLVINE MENTORS</div>
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
  const [selectedIssue, setSelectedIssue] = useState('06')
  const rackRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setHeroIn(true), 120)
    return () => clearTimeout(t)
  }, [])

  const current = ISSUES.find(i => i.num === selectedIssue) || ISSUES[0]
  const archive = ISSUES.filter(i => i.num !== selectedIssue)

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
            mentorship and leadership development. Founded 2020, Lagos, Nigeria.
          </p>

          <figure className="about__hero-scripture" style={{ '--d': '560ms' }}>
            <div className="about__hero-scripture-rule" aria-hidden="true" />
            <blockquote>
              As iron sharpens iron, so one person sharpens another.
            </blockquote>
            <figcaption>(Proverbs 27:17)</figcaption>
          </figure>

          <div className="about__hero-meta" style={{ '--d': '720ms' }}>
            <span>EST. 2020</span>
            <span aria-hidden="true">&middot;</span>
            <span>LAGOS, NIGERIA</span>
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

              <figure className="about__founder-vision">
                <figcaption>THE VISION</figcaption>
                <blockquote>{FOUNDER.vision}</blockquote>
              </figure>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ============ 4. Vinethoughts ============ */}
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

      {/* ============ 5. The Team (compact masthead) ============ */}
      <section className="about__team" aria-label="The team">
        <div className="about__team-inner">
          <div className="about__team-head">
            <p className="about__team-eyebrow">THE TEAM</p>
            <h2 className="about__team-title">The people who carry it.</h2>
          </div>

          {['board', 'ops'].map((group) => {
            const heading = group === 'board' ? 'Board' : 'Unit Heads & Administrative'
            const members = TEAM.filter(t => t.group === group)
            return (
              <div key={group} className="about__team-group">
                <h3 className="about__team-group-heading">{heading}</h3>
                <div className="about__team-roster">
                  {members.map((p, i) => (
                    <RevealOnScroll key={p.name} threshold={0.1} delay={i * 60}>
                      <div className="about__member">
                        {p.photo ? (
                          <img src={p.photo} alt="" className="about__member-avatar about__member-avatar--photo" />
                        ) : (
                          <span className="about__member-avatar" aria-hidden="true">{p.initials}</span>
                        )}
                        <div className="about__member-text">
                          <p className="about__member-name">{p.name}</p>
                          <p className="about__member-role">{p.role}</p>
                        </div>
                      </div>
                    </RevealOnScroll>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ============ 6. Invitation ============ */}
      <section className="about__invite" aria-label="Get involved">
        <div className="about__invite-inner">
          <p className="about__invite-asterism" aria-hidden="true">&lowast;&lowast;&lowast;</p>

          <div className="about__invite-meeting">
            <p className="about__invite-meeting-eyebrow">NEXT FAMILY MEETING</p>
            <p className="about__invite-meeting-date">{NEXT_MEETING.date}</p>
            <p className="about__invite-meeting-time">
              {NEXT_MEETING.time} &middot; {NEXT_MEETING.mode}
            </p>
          </div>

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
            Toolvine Mentors &amp; Leaders Initiative &middot; Est. 2020 &middot; Lagos, Nigeria
          </p>
        </div>
      </section>
    </div>
  )
}
