import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/shared/Logo/Logo'
import { RevealOnScroll } from '@/components/shared/RevealOnScroll/RevealOnScroll'
import { Icon } from '@/components/shared/Icon/Icon'
import { fetchPublicNewsletters, publishedLabel } from '@/lib/resources'
import { useAuth } from '@/stores/useAuth'
import { chapterOf } from '@/lib/chapters'
import './Resources.css'

/* ============ Data ============ */

/* Labels and descriptions are copied verbatim from mentoring_categories in the
   database, which is the source of truth. They are not fetched: that table is
   readable by authenticated users only, and this page serves visitors who have
   no account yet. If a category is edited there, edit it here too. */

const CATEGORIES = [
  {
    id: 'spiritual_ministry',
    title: 'Spiritual / Ministry',
    description: 'Walking with God, prayer, devotion, ministry calling.'
  },
  {
    id: 'professional_careers',
    title: 'Professional / Careers',
    description: 'Work decisions, career growth, vocation, the workplace.'
  },
  {
    id: 'relationship_marriage',
    title: 'Relationship / Marriage',
    description: 'Singleness, dating, marriage, family, parenting.'
  },
  {
    id: 'leadership_mentorship',
    title: 'Leadership / Mentorship',
    description: 'Leading others, building teams, raising the next generation.'
  },
  {
    id: 'health_fitness',
    title: 'Health / Fitness',
    description: 'Physical health, mental wellbeing, rhythms of rest.'
  },
  {
    id: 'finance_others',
    title: 'Finance / Others',
    description: 'Money, stewardship, generosity, and topics that do not fit elsewhere.'
  }
]

/* ============ Component ============ */

export function Resources() {
  const [letters, setLetters] = useState([])
  const [loaded,  setLoaded]  = useState(false)

  // The nav already renders Dashboard rather than Sign in for a signed-in
  // visitor. Without this the page told that same person to create the account
  // they were reading it with, twice.
  const profile = useAuth((s) => s.profile)
  const signedIn = Boolean(profile)

  // The one shelf a visitor can read without an account. Everything else in the
  // library needs a sign-in, which is what the anon policy on resources allows.
  useEffect(() => {
    let cancelled = false
    fetchPublicNewsletters()
      .then((rows) => { if (!cancelled) setLetters(rows) })
      .catch(() => { if (!cancelled) setLetters([]) })
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="resources">
      <div className="resources__atmosphere" aria-hidden="true" />

      {/* ============ Hero ============ */}
      <header className="resources__hero">
        <div className="resources__watermark" aria-hidden="true">
          <Logo variant="mark" size={400} />
        </div>
        <p className="resources__eyebrow">THE LIBRARY</p>
        <h1 className="resources__title">Built by mentors. Ready when you are.</h1>
        <p className="resources__hero-meta">OPEN TO EVERY MEMBER</p>
        <Link to={signedIn ? '/library' : '/auth/sign-up'} className="resources__hero-link">
          {signedIn ? 'Open the library' : 'Create your account to browse'}
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </header>

      {/* ============ Newsletter ============ */}
      {loaded && letters.length > 0 && (
        <section className="resources__letters" aria-label="Vinethoughts">
          <div className="resources__letters-head">
            <p className="resources__letters-eyebrow">VINETHOUGHTS</p>
            <h2 className="resources__letters-title">Our letter to the community</h2>
            <p className="resources__letters-sub">
              Interviews, reflections, and testimonies, published each quarter. Free to read,
              no account needed.
            </p>
          </div>

          <ul className="resources__letter-list">
            {letters.map((letter, i) => (
              <li key={letter.id} className={'resources__letter' + (i === 0 ? ' resources__letter--latest' : '')}>
                <div className="resources__letter-body">
                  {i === 0 && <p className="resources__letter-tag">Latest issue</p>}
                  <h3 className="resources__letter-title">{letter.title}</h3>
                  {publishedLabel(letter) && (
                    <p className="resources__letter-when">{publishedLabel(letter)}</p>
                  )}
                  {i === 0 && letter.description && (
                    <p className="resources__letter-desc">{letter.description}</p>
                  )}
                </div>
                {letter.external_url && (
                  <a
                    className="resources__letter-link"
                    href={letter.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Read it
                    <Icon name="externalLink" size={14} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ============ Category grid ============ */}
      <section className="resources__grid" aria-label="Browse by chapter">
        <div className="resources__grid-header">
          <h2 className="resources__grid-title">Six chapters</h2>
          <p className="resources__grid-sub">
            Every resource lands in one of these. Our team adds what is worth keeping,
            so the shelf stays short and stays useful.
          </p>
        </div>
        <div className="resources__cards">
          {CATEGORIES.map((cat, i) => {
            const { icon, tone } = chapterOf(cat.id)
            return (
              <RevealOnScroll key={cat.id} delay={i * 60} threshold={0.12}>
                <article className={`resources__card resources__card--${tone}`}>
                  <span className="resources__card-mark" aria-hidden="true">
                    <Icon name={icon} size={28} />
                  </span>
                  <h3 className="resources__card-title">{cat.title}</h3>
                  <p className="resources__card-desc">{cat.description}</p>
                </article>
              </RevealOnScroll>
            )
          })}
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="resources__cta">
        <div className="resources__cta-grain" aria-hidden="true" />
        <div className="resources__cta-inner">
          <p className="resources__cta-asterism" aria-hidden="true">&#8258;</p>
          <h2 className="resources__cta-title">
            <em>Start reading.</em>
          </h2>
          <p className="resources__cta-body">
            {signedIn
              ? 'Everything above, and the rest of the shelf, is waiting.'
              : 'Create your account. The library opens with it.'}
          </p>
          <Link to={signedIn ? '/library' : '/auth/sign-up'} className="resources__cta-button">
            {signedIn ? 'Open the library' : 'Create your account'}
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
