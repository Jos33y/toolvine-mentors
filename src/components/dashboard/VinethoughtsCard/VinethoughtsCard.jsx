import './vinethoughtsCard.css'

// Source of truth: pages/public/About.jsx ISSUES[0]. Keep in sync when a
// new edition is published. A future block can centralise this in src/lib/.
const CURRENT = {
  number:    '06',
  date:      'March 2026',
  featured:  'Mentor Yetunde Sorinola',
  coverline: 'On faith, career, and rising through delays',
  flipbook:  'https://heyzine.com/flip-book/1fa3ba745b.html'
}

export function VinethoughtsCard() {
  return (
    <article className="vine-card">
      <header className="vine-card__head">
        <p className="vine-card__eyebrow">Vinethoughts</p>
      </header>

      <div className="vine-card__cover" aria-hidden="true">
        <span className="vine-card__cover-label">Vol.</span>
        <span className="vine-card__cover-num">{CURRENT.number}</span>
      </div>

      <div className="vine-card__body">
        <p className="vine-card__date">{CURRENT.date}</p>
        <p className="vine-card__coverline">{CURRENT.coverline}</p>
        <p className="vine-card__featured">Featuring {CURRENT.featured}</p>
      </div>

      <footer className="vine-card__foot">
        <a
          className="vine-card__cta"
          href={CURRENT.flipbook}
          target="_blank"
          rel="noopener noreferrer"
        >
          Read this edition
          <span className="vine-card__cta-arrow" aria-hidden="true">→</span>
        </a>
      </footer>
    </article>
  )
}
