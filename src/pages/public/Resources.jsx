import { Link } from 'react-router-dom'
import { Logo } from '@/components/shared/Logo/Logo'
import { RevealOnScroll } from '@/components/shared/RevealOnScroll/RevealOnScroll'
import './Resources.css'

/* ============ Data ============ */
/* Sample titles calibrated to brand voice. Replace with real
   curated content once the library is seeded post-launch. */

const FEATURED = {
  coverTag: 'BOOK REVIEW',
  coverTitle: 'The Fourth Dimension',
  coverAuthor: 'David Yonggi Cho',
  categoryTag: 'LEADERSHIP & MENTORSHIP',
  title: 'The Fourth Dimension, reviewed',
  author: 'Mentor Samuel Asawole',
  excerpt:
    'A book that reshapes how you think about prayer, purpose, and the unseen dimensions of leadership. Mentor Asawole unpacks Cho\u2019s framework and asks what it means for a mentor walking alongside someone younger in faith.'
}

const CATEGORIES = [
  {
    id: 'spiritual',
    title: 'Spiritual & Ministry',
    description: 'Devotional reflections, prayer guides, and ministry essays.',
    accent: 'var(--tv-primary)',
    count: 28,
    resources: ['The Posture of Pilate', 'Walking in the Spirit', 'Prayer as Daily Practice']
  },
  {
    id: 'professional',
    title: 'Professional & Careers',
    description: 'Career transitions, workplace ethics, calling and craft.',
    accent: 'var(--tv-accent)',
    count: 22,
    resources: ['Leaving the Job You Built', 'Ethics at the Crossroad', 'The Calling Behind the Career']
  },
  {
    id: 'relationship',
    title: 'Relationship & Marriage',
    description: 'What healthy relationships ask of us, in love and in season.',
    accent: 'var(--tv-primary)',
    count: 16,
    resources: ['The First Three Years', 'Learning to Listen Again', 'What Covenant Asks of Us']
  },
  {
    id: 'leadership',
    title: 'Leadership & Mentorship',
    description: 'The slow work of guiding, building, and being built.',
    accent: 'var(--tv-accent)',
    count: 24,
    resources: ['Slow Authority', 'Teaching Without Talking', 'The Mentor\u2019s Posture']
  },
  {
    id: 'health',
    title: 'Health & Fitness',
    description: 'The body as a discipline, not a project.',
    accent: 'var(--tv-primary)',
    count: 11,
    resources: ['Discipline of the Body', 'Rest as Resistance', 'The Stewardship of Health']
  },
  {
    id: 'finance',
    title: 'Finance & Other',
    description: 'Money, generosity, and the things money does not buy.',
    accent: 'var(--tv-accent)',
    count: 14,
    resources: ['What You Earn, What You Become', 'Generosity Before Margin', 'Tithing and the Modern Believer']
  }
]

const TOTAL = CATEGORIES.reduce((s, c) => s + c.count, 0)

const STATS = [
  { value: '127', label: 'Members reading' },
  { value: '14', label: 'Contributing authors' },
  { value: '6', label: 'Chapters, growing' }
]

/* ============ Component ============ */

export function Resources() {
  return (
    <div className="resources">
      <div className="resources__atmosphere" aria-hidden="true" />

      {/* ============ Hero — short, punchy ============ */}
      <header className="resources__hero">
        <div className="resources__watermark" aria-hidden="true">
          <Logo variant="mark" size={400} />
        </div>
        <p className="resources__eyebrow">THE LIBRARY</p>
        <h1 className="resources__title">Built by mentors. Ready when you are.</h1>
        <p className="resources__hero-meta">
          {TOTAL} RESOURCES&nbsp;&nbsp;&middot;&nbsp;&nbsp;6 CHAPTERS
        </p>
        <Link to="/auth/sign-up" className="resources__hero-link">
          Create your account to browse
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </header>

      {/* ============ Featured resource ============ */}
      <section className="resources__featured" aria-label="Featured resource">
        <RevealOnScroll threshold={0.15}>
          <div className="resources__featured-card">
            <div className="resources__featured-cover">
              <div className="resources__featured-cover-wm" aria-hidden="true">
                <Logo variant="mark-light" size={200} />
              </div>
              <p className="resources__featured-cover-tag">{FEATURED.coverTag}</p>
              <h3 className="resources__featured-cover-title">{FEATURED.coverTitle}</h3>
              <p className="resources__featured-cover-author">{FEATURED.coverAuthor}</p>
            </div>
            <div className="resources__featured-content">
              <p className="resources__featured-tag">{FEATURED.categoryTag}</p>
              <h2 className="resources__featured-content-title">
                <em>{FEATURED.coverTitle}</em>, reviewed
              </h2>
              <p className="resources__featured-author">{FEATURED.author}</p>
              <p className="resources__featured-excerpt">{FEATURED.excerpt}</p>
              <Link to="/auth/sign-up" className="resources__featured-link">
                Join to read
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* ============ Category grid ============ */}
      <section className="resources__grid" aria-label="Browse by chapter">
        <div className="resources__grid-header">
          <h2 className="resources__grid-title">Six chapters</h2>
          <p className="resources__grid-sub">Browse by what matters to you.</p>
        </div>
        <div className="resources__cards">
          {CATEGORIES.map((cat, i) => (
            <RevealOnScroll key={cat.id} delay={i * 60} threshold={0.12}>
              <article
                className="resources__card"
                style={{ '--card-accent': cat.accent }}
              >
                <div className="resources__card-head">
                  <h3 className="resources__card-title">{cat.title}</h3>
                  <span className="resources__card-count">{cat.count}</span>
                </div>
                <div className="resources__card-rule" aria-hidden="true" />
                <ul className="resources__card-list">
                  {cat.resources.map((r) => (
                    <li key={r} className="resources__card-item">{r}</li>
                  ))}
                </ul>
                <p className="resources__card-desc">{cat.description}</p>
              </article>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* ============ Social proof ============ */}
      <section className="resources__proof" aria-label="Community numbers">
        <RevealOnScroll threshold={0.3}>
          <div className="resources__proof-inner">
            {STATS.map((s) => (
              <div className="resources__stat" key={s.label}>
                <span className="resources__stat-number">{s.value}</span>
                <span className="resources__stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </RevealOnScroll>
      </section>

      {/* ============ CTA — dark section ============ */}
      <section className="resources__cta">
        <div className="resources__cta-grain" aria-hidden="true" />
        <div className="resources__cta-inner">
          <p className="resources__cta-asterism" aria-hidden="true">⁂</p>
          <h2 className="resources__cta-title">
            <em>Start reading.</em>
          </h2>
          <p className="resources__cta-body">
            Create your account. The library opens with it.
          </p>
          <Link to="/auth/sign-up" className="resources__cta-button">
            Create your account
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
