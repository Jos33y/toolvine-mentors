import { currentEdition } from '@/lib/vinethoughts'
import './vinethoughtsCard.css'

// Reads the edition list rather than holding a copy of it. The copy here said
// March 2026 while the home hero said Summer 2026 about the same issue, which
// is what a hand-sync comment buys you.

export function VinethoughtsCard() {
  const current = currentEdition()
  if (!current) return null

  return (
    <article className="vine-card">
      <header className="vine-card__head">
        <p className="vine-card__eyebrow">Vinethoughts</p>
      </header>

      <div className="vine-card__cover" aria-hidden="true">
        <span className="vine-card__cover-label">Vol.</span>
        <span className="vine-card__cover-num">{current.num}</span>
      </div>

      <div className="vine-card__body">
        <p className="vine-card__date">{titleCase(current.date)}</p>
        <p className="vine-card__coverline">{current.coverline}</p>
        <p className="vine-card__featured">Featuring {current.featured}</p>
      </div>

      <footer className="vine-card__foot">
        <a
          className="vine-card__cta"
          href={current.flipbook}
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

// The list stores dates as MARCH 2026 because the About rack sets them in
// caps. This card sets them in sentence case, so it converts rather than the
// list carrying the same date twice in two shapes.
function titleCase(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
}
