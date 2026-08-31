import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { RevealOnScroll } from '@/components/shared/RevealOnScroll/RevealOnScroll'
import { fetchPublicTestimonies } from '@/lib/testimonies'
import './WallOfWitness.css'

// Reads testimonies_public, which is approved rows and four columns. The
// twenty-four hardcoded fragments are gone: they carried a comment saying the
// Secretariat would replace them before launch, Volume 5 has no testimonies
// and Volume 7 has one, so twenty-four could not have come from the editions.
// 0051 moved them into the moderation queue as pending. What renders here is
// what somebody has approved.
//
// The drifting columns are gone too, and not only because they had no pause
// control on touch. Two counter-scrolling tracks need enough cards to fill a
// 600px loop, and the honest count for the next several months is one, plus
// whatever members submit. A composition that needs twenty-four cards to read
// as anything is the wrong composition for a wall that has one.
//
// A vine instead. Cards alternate off a central stem, each on its own branch.
// It reads at one card and it reads at sixty, it needs no infinite motion, and
// on a phone the stem moves to the edge rather than half the content being
// deleted.

const STAGGER_MS = 90
const STAGGER_CAP = 12

export function WallOfWitness() {
  const [rows,    setRows]    = useState([])
  const [state,   setState]   = useState('loading')
  const [visible, setVisible] = useState(false)
  const [reduced, setReduced] = useState(false)

  const vineRef = useRef(null)

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchPublicTestimonies({ limit: 60 })
      .then((data) => {
        if (cancelled) return
        setRows(data)
        setState('ready')
      })
      .catch(() => {
        // A marketing section that cannot load its content renders nothing
        // rather than an error nobody reading the home page can act on.
        if (!cancelled) setState('failed')
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (reduced) { setVisible(true); return undefined }
    const el = vineRef.current
    if (!el) return undefined

    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [reduced, state])

  if (state === 'failed') return null

  // Featured first, then newest, which is the order the view returns. The
  // featured one takes the serif treatment wherever it lands.
  const cards = rows

  return (
    <section className={'witness' + (reduced ? ' witness--static' : '')} id="witness">
      <div className="witness__header">
        <RevealOnScroll>
          <p className="witness__eyebrow">Witnesses</p>
          <h2 className="witness__heading">We are not alone in this.</h2>
        </RevealOnScroll>
      </div>

      {state === 'loading' ? (
        <div className="witness__loading" aria-busy="true">
          <span className="witness__loading-stem" aria-hidden="true" />
          <span className="witness__loading-card" aria-hidden="true" />
          <span className="witness__loading-card" aria-hidden="true" />
        </div>
      ) : cards.length === 0 ? (
        <div className="witness__empty">
          <p className="witness__empty-body">
            The first testimonies are being gathered. When members share what mentoring
            has done for them, and they have agreed to it being read, they appear here.
          </p>
        </div>
      ) : (
        <div
          className={'witness__vine' + (visible ? ' witness__vine--in' : '')}
          ref={vineRef}
        >
          <span className="witness__stem" aria-hidden="true" />

          <ul className="witness__list">
            {cards.map((t, i) => (
              <WitnessCard
                key={t.id}
                testimony={t}
                side={i % 2 === 0 ? 'left' : 'right'}
                index={Math.min(i, STAGGER_CAP)}
              />
            ))}
          </ul>
        </div>
      )}

      <div className="witness__footer">
        <p className="witness__caption">{captionFor(cards.length)}</p>
        <Link to="/auth/sign-up" className="witness__cta">
          <span>Join them</span>
          <span className="witness__cta-arrow" aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </section>
  )
}

/* ============ Card ============ */

function WitnessCard({ testimony, side, index }) {
  const { display_name: name, role_label: role, body, is_featured: featured } = testimony
  const mentor = role === 'mentor'

  return (
    <li
      className={
        'witness-card' +
        ` witness-card--${side}` +
        (featured ? ' witness-card--featured' : '')
      }
      style={{ '--stagger': `${index * STAGGER_MS}ms` }}
    >
      <span className="witness-card__node" aria-hidden="true" />
      <span className="witness-card__branch" aria-hidden="true" />

      <blockquote className="witness-card__quote">
        <p className="witness-card__text">{body}</p>
      </blockquote>

      <div className="witness-card__meta">
        <span className={'witness-card__avatar' + (mentor ? ' witness-card__avatar--mentor' : '')}>
          {initialOf(name)}
        </span>
        <p className="witness-card__attr">{name}</p>
      </div>
    </li>
  )
}

/* ============ Helpers ============ */

// The wall shows a name and a role and nothing else. Names arrive as the
// person chose them, usually a first name, sometimes the Vinethoughts form
// like "Mentor A."
function initialOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '\u00B7'
  const last = parts[parts.length - 1].replace(/\./g, '')
  return (last[0] || '\u00B7').toUpperCase()
}

// The old caption said "Voices from the Toolvine community. Initials only, per
// our convention." over fragments nobody had verified. It says less now, and
// what it says is true.
function captionFor(count) {
  if (count === 1) return 'One voice so far. More as they are shared.'
  return 'Shared by members and by our quarterly Vinethoughts, with their permission.'
}
