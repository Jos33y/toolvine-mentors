import { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './HeroStack.css'

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
            <div key={f.label} className="hero-stack__feature-card">
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

export function HeroStack() {
  const stackRef = useRef(null)

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

  return (
    <Link
      to="/resources"
      className="hero-stack"
      ref={stackRef}
      aria-label="Read Vinethoughts editorial, current Issue 06"
    >
      <Volume
        issue="04"
        numeral="IV"
        year="2025"
        season="Winter 2025"
        tagline="Mentorship for Kingdom Impact"
        modifier="back"
      />
      <Volume
        issue="05"
        numeral="V"
        year="2026"
        season="Spring 2026"
        tagline="Building Godly Leaders for Global Influence"
        modifier="mid"
      />
      <Volume
        issue="06"
        numeral="VI"
        year="2026"
        season="Summer 2026"
        tagline="Raising Christ-Centered Leaders Through Mentorship"
        modifier="featured"
        features={[
          {
            label: 'The Essay',
            title: 'The Leadership of Pontius Pilate',
            author: 'by Mentor Dayo Adewole',
          },
          {
            label: 'The Interview',
            title: 'Mentor Yetunde Sorinola',
            author: 'CFO, Egbin Power PLC',
          },
        ]}
      />
    </Link>
  )
}
