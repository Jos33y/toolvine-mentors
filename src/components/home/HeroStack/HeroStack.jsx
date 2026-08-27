import { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { recentEditions, heroFeatures, currentEdition } from '@/lib/vinethoughts'
import './HeroStack.css'

// The three most recent editions, read from the edition list.
//
// They used to be written into this file by hand, and all three were wrong.
// The seasons said Winter 2025, Spring 2026 and Summer 2026 against a list
// recording Q3 2025, DEC 2025 and MARCH 2026, and the line on each volume was
// one of the four official taglines rather than that issue's own cover line.
// The hero was showing a magazine that did not exist.

function VolumeMark() {
  return (
    <svg
      className="hero-stack__mark"
      viewBox="0 0 24 14"
      width="20"
      height="12"
      aria-hidden="true"
    >
      <path d="M 12 1 Q 3 7, 12 13" fill="currentColor" opacity="0.95" />
      <path d="M 12 1 Q 21 7, 12 13" fill="currentColor" opacity="0.55" />
    </svg>
  )
}

function Volume({ issue, numeral, year, season, tagline, features, modifier }) {
  return (
    <article className={`hero-stack__volume hero-stack__volume--${modifier}`}>
      <div className="hero-stack__art" aria-hidden="true">{numeral}</div>

      <header className="hero-stack__masthead">
        <div className="hero-stack__masthead-left">
          <VolumeMark />
          <p className="hero-stack__publication">Vinethoughts</p>
        </div>
        <div className="hero-stack__masthead-right">
          <p className="hero-stack__meta">Issue {issue}</p>
          <p className="hero-stack__meta hero-stack__meta--sub">{season}</p>
        </div>
      </header>

      <span className="hero-stack__divider" aria-hidden="true" />

      <p className="hero-stack__feature">{tagline}</p>

      <span className="hero-stack__divider" aria-hidden="true" />

      {features ? (
        <footer className="hero-stack__features">
          {features.map((f) => (
            <div key={f.title} className="hero-stack__feature-card">
              <p className="hero-stack__feature-label">{f.label}</p>
              <p className="hero-stack__feature-title">{f.title}</p>
              <p className="hero-stack__feature-author">{f.author}</p>
            </div>
          ))}
        </footer>
      ) : (
        <footer className="hero-stack__colophon">
          <p className="hero-stack__imprint">Toolvine &middot; {year}</p>
        </footer>
      )}
    </article>
  )
}

// Back to front, so the newest lands on top. recentEditions returns oldest
// first for exactly this reason.
const POSITIONS = ['back', 'mid', 'featured']

export function HeroStack() {
  const stackRef = useRef(null)
  const volumes  = recentEditions(3)
  const current  = currentEdition()

  // Cursor-aware 3D tilt (hover devices only)
  useEffect(() => {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!canHover || reduced) return

    const el = stackRef.current
    if (!el) return

    function handleMove(e) {
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      el.style.setProperty('--tilt-x', `${(-y * 6).toFixed(1)}deg`)
      el.style.setProperty('--tilt-y', `${(x * 6).toFixed(1)}deg`)
    }

    function handleLeave() {
      el.style.setProperty('--tilt-x', '0deg')
      el.style.setProperty('--tilt-y', '0deg')
    }

    el.addEventListener('mousemove', handleMove, { passive: true })
    el.addEventListener('mouseleave', handleLeave)
    return () => {
      el.removeEventListener('mousemove', handleMove)
      el.removeEventListener('mouseleave', handleLeave)
    }
  }, [])

  if (volumes.length === 0) return null

  return (
    <Link
      to="/resources"
      className="hero-stack"
      ref={stackRef}
      aria-label={`Read Vinethoughts, current Issue ${current?.num ?? ''}`}
    >
      {volumes.map((edition, i) => {
        const isFront = i === volumes.length - 1
        return (
          <Volume
            key={edition.num}
            issue={edition.num}
            numeral={edition.roman}
            year={yearOf(edition.date)}
            season={titleCase(edition.date)}
            tagline={edition.coverline}
            features={isFront ? heroFeatures(edition) : null}
            modifier={POSITIONS[i] ?? 'featured'}
          />
        )
      })}
    </Link>
  )
}

// The list stores dates in caps for the About rack. The volumes set them in
// sentence case, so they convert here rather than the list carrying the same
// date twice in two shapes.
function titleCase(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\b[a-z0-9]/g, (c) => c.toUpperCase())
}

// The colophon shows a year, and the dates are written as "Q3 2025" or
// "MARCH 2026". The trailing four digits are the year in both.
function yearOf(value) {
  const match = String(value ?? '').match(/\d{4}/)
  return match ? match[0] : ''
}
