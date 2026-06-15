import './Community.css'
import { Link } from 'react-router-dom'
import { RevealOnScroll } from '@/components/shared/RevealOnScroll/RevealOnScroll'

const MASTHEAD = [
  {
    initials: 'AA',
    name: 'Abigail Jesutofunmi Alade',
    role: 'Secretariat Lead · Editor, Vinethoughts'
  },
  {
    initials: 'KO',
    name: 'Kikelomo Olabamiji',
    role: 'Administrator'
  }
]

/* ============ Mini Vinethoughts cover ============ */

function VinethoughtsCover() {
  return (
    <div className="vt-cover">
      <Link to="/resources" className="vt-cover__card" aria-label="Read Vinethoughts Issue 06">
        <span className="vt-cover__numeral" aria-hidden="true">VI</span>
        <div className="vt-cover__content">
          <div className="vt-cover__masthead">
            <svg className="vt-cover__mark" viewBox="0 0 24 14" width="16" height="10" aria-hidden="true">
              <path d="M 12 1 Q 3 7, 12 13" fill="currentColor" opacity="0.95" />
              <path d="M 12 1 Q 21 7, 12 13" fill="currentColor" opacity="0.55" />
            </svg>
            <span className="vt-cover__name">Vinethoughts</span>
          </div>
          <span className="vt-cover__rule" aria-hidden="true" />
          <p className="vt-cover__meta">Issue 06 · Summer 2026</p>
          <p className="vt-cover__tagline">Raising Christ-Centered Leaders Through Mentorship</p>
        </div>
      </Link>
      <div className="vt-cover__links">
        <Link to="/resources" className="community__aside-link">Read the current edition &rarr;</Link>
        <Link to="/about#leadership" className="community__aside-link">Meet the board on About &rarr;</Link>
      </div>
    </div>
  )
}

export function Community() {
  return (
    <section className="community" id="community">
      <div className="community__inner">
        <RevealOnScroll>

          <header className="community__head">
            <p className="community__eyebrow">From the community</p>
            <h2 className="community__title">
              The people behind the work.
            </h2>
          </header>

          <span className="community__divider" aria-hidden="true" />

          {/* Quote + Vinethoughts cover side by side */}
          <div className="community__spread">
            <figure className="community__quote">
              <span className="community__quote-mark" aria-hidden="true">&ldquo;</span>
              <blockquote className="community__quote-text">
                What started as informal guidance gradually grew into a deeper calling to mentorship.
              </blockquote>
              <figcaption className="community__attribution">
                <div className="community__avatar community__avatar--lg" aria-hidden="true">
                  <span className="community__initials community__initials--lg">MA</span>
                </div>
                <div className="community__attribution-text">
                  <span className="community__attribution-name">Dr. Michael Abimbola Alade</span>
                  <span className="community__attribution-role">Founder &amp; Lead Mentor</span>
                </div>
              </figcaption>
            </figure>

            <VinethoughtsCover />
          </div>

          <span className="community__ornament" aria-hidden="true">&#8258;</span>

          <div className="community__masthead">
            <p className="community__masthead-label">Carried day to day by</p>
            <div className="community__masthead-row">
              {MASTHEAD.map((person) => (
                <div key={person.name} className="community__person">
                  <div className="community__avatar" aria-hidden="true">
                    <span className="community__initials">{person.initials}</span>
                  </div>
                  <div className="community__person-text">
                    <span className="community__person-name">{person.name}</span>
                    <span className="community__person-role">{person.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </RevealOnScroll>
      </div>
    </section>
  )
}
