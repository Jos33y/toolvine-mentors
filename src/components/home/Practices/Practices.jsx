import { useRef, useState, useEffect } from 'react'
import './Practices.css'
import { RevealOnScroll } from '@/components/shared/RevealOnScroll/RevealOnScroll'

/* ============ Data ============ */

const PRACTICES = [
  {
    numeral: 'I.',
    headline: 'We pair.',
    body: 'Each mentee is matched with a mentor for an intentional season. Pairings are formed by our team with care, not by an algorithm. The work is the relationship.',
    expanded: 'Each pairing is hand-selected by our team. No algorithms. The work is the relationship.',
    stat: { value: 127, label: 'pairings active this season' },
  },
  {
    numeral: 'II.',
    headline: 'We walk together.',
    body: 'Pairings meet in their own rhythm. The community gathers in Family Meetings and ToolVine Prays. No one walks this alone. No one mentors in isolation.',
    expanded: 'Family Meetings, ToolVine Prays, and one-on-one sessions. Every rhythm matters.',
    stat: { value: 1840, label: 'meetings logged in 2025' },
  },
  {
    numeral: 'III.',
    headline: 'We keep the record.',
    body: 'Reflections, check-ins, and prayer requests are held in a system of record. Growth becomes visible over time. What is shared in trust stays in trust.',
    expanded: 'From the first pairing in 2020 to today. Nothing lost to memory.',
    stat: { value: 6, label: 'years of continuous record-keeping' },
  }
]

/* ============ Helpers ============ */

function formatNumber(n) {
  return n.toLocaleString('en-US')
}

// Eased count-up: fast start, slow finish
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

/* ============ Component ============ */

export function Practices() {
  const sectionRef = useRef(null)
  const [counts, setCounts] = useState(PRACTICES.map(() => 0))
  const [counting, setCounting] = useState(false)

  // Trigger count-up when section enters viewport
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setCounts(PRACTICES.map((p) => p.stat.value))
      return
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counting) {
          setCounting(true)
          obs.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [counting])

  // Animate counters
  useEffect(() => {
    if (!counting) return
    const duration = 1200
    const stagger = 200
    const start = performance.now()
    let raf

    function tick(now) {
      const next = PRACTICES.map((p, i) => {
        const elapsed = now - start - i * stagger
        if (elapsed <= 0) return 0
        const t = Math.min(elapsed / duration, 1)
        return Math.round(easeOutCubic(t) * p.stat.value)
      })
      setCounts(next)
      if (next.every((v, i) => v >= PRACTICES[i].stat.value)) return
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [counting])

  return (
    <section className="practices" id="practices" ref={sectionRef}>
      {/* Ambient pulse layer */}
      <div className="practices__pulse" aria-hidden="true" />
      {/* Woven texture layer */}
      <div className="practices__weave" aria-hidden="true" />

      <span className="practices__watermark" aria-hidden="true">{'&'}</span>

      <div className="practices__inner">
        <RevealOnScroll>

          <header className="practices__head">
            <p className="practices__eyebrow">The practices</p>
            <h2 className="practices__title">
              Three things we do, in every season, with every pair.
            </h2>
          </header>

          <span className="practices__divider" aria-hidden="true" />

          <div className="practices__grid">
            {PRACTICES.map((p, i) => (
              <article key={p.numeral} className="practice">
                <div className="practice__head">
                  <span className="practice__numeral" aria-hidden="true">{p.numeral}</span>
                  <span className="practice__rule" aria-hidden="true" />
                </div>
                <h3 className="practice__headline">{p.headline}</h3>
                <p className="practice__body">{p.body}</p>
                <p className="practice__expanded">{p.expanded}</p>
                <div className="practice__stat">
                  <span className="practice__stat-value">{formatNumber(counts[i])}</span>
                  <span className="practice__stat-label">{p.stat.label}</span>
                </div>
              </article>
            ))}
          </div>

        </RevealOnScroll>
      </div>
    </section>
  )
}
