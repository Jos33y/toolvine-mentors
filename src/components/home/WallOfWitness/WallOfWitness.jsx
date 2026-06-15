import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { RevealOnScroll } from '@/components/shared/RevealOnScroll/RevealOnScroll'
import './WallOfWitness.css'

/* ============ Fragments (Secretariat to replace before launch) ============ */

const LEFT = [
  { text: 'I came in afraid I had nothing to offer. My mentor reminded me I had been given more than I knew.', attr: 'Mentor A.' },
  { text: 'We meet on Tuesdays. We have not missed a Tuesday in two years.', attr: 'Mentor D.' },
  { text: 'The day my marriage almost broke, the first call I made was to my mentor. She prayed before she answered.', attr: 'Mentee F.' },
  { text: 'He told me, "You are not late. You are right on time." I needed someone to say that.', attr: 'Mentee K.' },
  { text: 'I started showing up. That is all I did at first. Showing up changed me.', attr: 'Mentor B.' },
  { text: 'My mentee asked me a question I did not know the answer to. We searched the scriptures together. I needed that as much as she did.', attr: 'Mentor R.' },
  { text: 'I did not know I was carrying so much until someone asked.', attr: 'Mentee J.' },
  { text: 'Iron really does sharpen iron. I have the marks to prove it.', attr: 'Mentor S.', featured: true },
  { text: 'She walked me through the year I almost gave up.', attr: 'Mentee O.' },
  { text: 'Mentoring is the closest thing I know to discipleship in real time.', attr: 'Mentor E.' },
  { text: 'I prayed for a mentor for three years. I am now praying for a mentee.', attr: 'Mentee P.' },
  { text: 'We do not always agree. We always show up.', attr: 'Mentor T.' },
]

const RIGHT = [
  { text: 'I joined to be mentored. I stayed to mentor.', attr: 'Mentor M.', featured: true },
  { text: 'He never gave me an answer. He gave me a process. I still use it.', attr: 'Mentee L.' },
  { text: 'There are things I only said out loud because my mentor asked.', attr: 'Mentee G.' },
  { text: 'She did not fix me. She walked with me while I let God do it.', attr: 'Mentee H.' },
  { text: 'I have been mentored for nine years. I have been mentoring for six.', attr: 'Mentor Y.' },
  { text: 'Mentorship is the only place I have learned to listen without preparing my reply.', attr: 'Mentor C.' },
  { text: "My mentor's prayer for me became my prayer for myself.", attr: 'Mentee Q.' },
  { text: 'I did not realize how alone I had been until I was not alone anymore.', attr: 'Mentee N.' },
  { text: 'He sharpens me by the questions he refuses to answer.', attr: 'Mentee V.' },
  { text: 'I have buried two seasons of striving since I started being mentored.', attr: 'Mentee W.' },
  { text: 'The first time I mentored someone, I understood what mine had been doing for me.', attr: 'Mentor I.' },
  { text: 'There is no version of my faith that holds up without this.', attr: 'Mentor U.' },
]

/* ============ Helpers ============ */

function getInitial(attr) {
  const parts = attr.split(' ')
  return parts[parts.length - 1].replace('.', '')
}

function isMentor(attr) {
  return attr.startsWith('Mentor')
}

/* ============ Card ============ */

function WitnessCard({ text, attr, featured }) {
  const initial = getInitial(attr)
  const mentor = isMentor(attr)

  return (
    <div className={`witness-card${featured ? ' witness-card--featured' : ''}`}>
      <p className="witness-card__text">{text}</p>
      {featured && <span className="witness-card__rule" aria-hidden="true" />}
      <div className="witness-card__meta">
        <span className={`witness-card__avatar${mentor ? ' witness-card__avatar--mentor' : ''}`}>
          {initial}
        </span>
        <p className="witness-card__attr">{attr}</p>
      </div>
    </div>
  )
}

/* ============ Column ============ */

function WitnessColumn({ fragments, direction }) {
  return (
    <div className="witness-col" data-direction={direction}>
      <div className="witness-col__track">
        {fragments.map((f, i) => <WitnessCard key={`a-${i}`} {...f} />)}
        {fragments.map((f, i) => <WitnessCard key={`b-${i}`} {...f} />)}
      </div>
    </div>
  )
}

/* ============ Branch Spine (organic, varied) ============ */

const BRANCHES = [
  { t: 0.08, side: 'left',  reach: 44 },
  { t: 0.19, side: 'right', reach: 38 },
  { t: 0.32, side: 'left',  reach: 50 },
  { t: 0.42, side: 'right', reach: 30 },
  { t: 0.56, side: 'left',  reach: 36 },
  { t: 0.68, side: 'right', reach: 48 },
  { t: 0.80, side: 'left',  reach: 28 },
  { t: 0.92, side: 'right', reach: 42 },
]

function BranchSpine({ visible }) {
  const H = 600, CX = 60
  return (
    <svg
      className={`spine${visible ? ' spine--visible' : ''}`}
      viewBox="0 0 120 600"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line
        className="spine__trunk"
        x1={CX} y1={0} x2={CX} y2={H}
        stroke="currentColor" strokeWidth="1"
      />
      {BRANCHES.map((b, i) => {
        const y = b.t * H
        const isLeft = b.side === 'left'
        const endX = isLeft ? CX - b.reach : CX + b.reach
        const cpX = isLeft ? CX - b.reach * 0.35 : CX + b.reach * 0.35
        return (
          <g key={i}>
            <path
              className="spine__branch"
              d={`M ${CX},${y} Q ${cpX},${y} ${endX},${y - 10}`}
              fill="none" stroke="currentColor" strokeWidth="1"
              style={{ animationDelay: `${600 + i * 60}ms` }}
            />
            <circle
              className="spine__node"
              cx={CX} cy={y} r="2"
              fill="currentColor"
              style={{ animationDelay: `${600 + i * 60}ms`, '--pulse-delay': `${i * 1}s` }}
            />
          </g>
        )
      })}
    </svg>
  )
}

/* ============ Section ============ */

export function WallOfWitness() {
  const [reduced, setReduced] = useState(false)
  const [spineVisible, setSpineVisible] = useState(false)
  const columnsRef = useRef(null)

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    if (reduced) { setSpineVisible(true); return }
    const el = columnsRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setSpineVisible(true); obs.disconnect() } },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [reduced])

  return (
    <section className={`witness${reduced ? ' witness--static' : ''}`} id="witness">
      <div className="witness__header">
        <RevealOnScroll>
          <p className="witness__eyebrow">Witnesses</p>
          <h2 className="witness__heading">We are not alone in this.</h2>
        </RevealOnScroll>
      </div>

      <div className="witness__columns" ref={columnsRef}>
        {reduced ? (
          <>
            <div className="witness-col witness-col--static">
              {LEFT.slice(0, 8).map((f, i) => <WitnessCard key={i} {...f} />)}
            </div>
            <div className="witness__spine"><BranchSpine visible={true} /></div>
            <div className="witness-col witness-col--static">
              {RIGHT.slice(0, 8).map((f, i) => <WitnessCard key={i} {...f} />)}
            </div>
          </>
        ) : (
          <>
            <WitnessColumn fragments={LEFT} direction="up" />
            <div className="witness__spine"><BranchSpine visible={spineVisible} /></div>
            <WitnessColumn fragments={RIGHT} direction="down" />
          </>
        )}
      </div>

      <div className="witness__footer">
        <p className="witness__caption">
          Voices from the ToolVine community. Initials only, per our convention.
        </p>
        <Link to="/auth/sign-up" className="witness__cta">
          Join them
          <span className="witness__cta-arrow" aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </section>
  )
}
