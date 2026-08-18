import { useRef } from 'react'
import './Practices.css'
import { RevealOnScroll } from '@/components/shared/RevealOnScroll/RevealOnScroll'

/* ============ Data ============ */

const PRACTICES = [
  {
    numeral: 'I.',
    headline: 'We pair.',
    body: 'Each mentee is matched with a mentor for an intentional season. Pairings are formed by our team with care, not by an algorithm. The work is the relationship.',
    expanded: 'Each pairing is hand-selected by our team. No algorithms. The work is the relationship.',
  },
  {
    numeral: 'II.',
    headline: 'We walk together.',
    body: 'Pairings meet in their own rhythm. The community gathers in Family Meetings and Toolvine Prays. No one walks this alone. No one mentors in isolation.',
    expanded: 'Family Meetings, Toolvine Prays, and one-on-one sessions. Every rhythm matters.',
  },
  {
    numeral: 'III.',
    headline: 'We keep the record.',
    body: 'Reflections, check-ins, and prayer requests are held in a system of record. Growth becomes visible over time. What is shared in trust stays in trust.',
    expanded: 'From the first pairing to today. Nothing lost to memory.',
  }
]

/* ============ Component ============ */

export function Practices() {
  const sectionRef = useRef(null)

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
            {PRACTICES.map((p) => (
              <article key={p.numeral} className="practice">
                <div className="practice__head">
                  <span className="practice__numeral" aria-hidden="true">{p.numeral}</span>
                  <span className="practice__rule" aria-hidden="true" />
                </div>
                <h3 className="practice__headline">{p.headline}</h3>
                <p className="practice__body">{p.body}</p>
                <p className="practice__expanded">{p.expanded}</p>
              </article>
            ))}
          </div>

        </RevealOnScroll>
      </div>
    </section>
  )
}
