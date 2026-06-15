import { useRef, useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import menteePortrait from '@/assets/panels/mentee-portrait.jpg'
import mentorPortrait from '@/assets/panels/mentor-portrait.jpg'
import './TwoPaths.css'

/* ============ Panel data ============ */

const MENTEE = {
  key: 'mentee',
  headline: 'Seeking a mentor',
  fragment: 'You were not meant to walk alone.',
  story: 'Every leader started here, with questions, with hunger, with the courage to ask someone to walk alongside them.',
  cta: 'Find your mentor',
  ctaTo: '/auth/sign-up',
  testimonial: 'My mentor helped me see that God had purpose in a season I could not understand alone. Three months in, I stopped trying to carry it all.',
  attribution: 'Mentee D.',
  portrait: menteePortrait,
  portraitPosition: 'center 25%',
}

const MENTOR = {
  key: 'mentor',
  headline: 'Ready to mentor',
  fragment: 'What you carry is what someone else needs.',
  story: 'The years you have walked with God prepared you for this. Someone is waiting for the wisdom you hold.',
  cta: 'Become a mentor',
  ctaTo: '/mentor-interest',
  testimonial: 'Mentoring sharpened me as much as it helped my mentees. Articulating what I believe deepened my own walk with God.',
  attribution: 'Mentor A.',
  portrait: mentorPortrait,
  portraitPosition: 'center 35%',
}

/* ============ Clip-path configurations (15deg diagonal) ============ */

const CLIPS = {
  equal: {
    mentee: 'polygon(0 0, 58% 0, 42% 100%, 0 100%)',
    mentor: 'polygon(58.4% 0, 100% 0, 100% 100%, 42.4% 100%)',
  },
  hoverMentee: {
    mentee: 'polygon(0 0, 78% 0, 62% 100%, 0 100%)',
    mentor: 'polygon(78.4% 0, 100% 0, 100% 100%, 62.4% 100%)',
  },
  hoverMentor: {
    mentee: 'polygon(0 0, 38% 0, 22% 100%, 0 100%)',
    mentor: 'polygon(38.4% 0, 100% 0, 100% 100%, 22.4% 100%)',
  },
  full: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
}

export function TwoPaths() {
  const sectionRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [mobileExpanded, setMobileExpanded] = useState(null)
  const hoverTl = useRef(null)
  const selectTl = useRef(null)
  const prefersReduced = useRef(false)
  const isMobile = useRef(false)

  useEffect(() => {
    prefersReduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mq = window.matchMedia('(max-width: 759px)')
    isMobile.current = mq.matches
    const handler = (e) => { isMobile.current = e.matches }
    mq.addEventListener('change', handler)

    if (!isMobile.current && !prefersReduced.current) {
      const s = sectionRef.current
      gsap.set(s.querySelectorAll('[data-panel]'), (i) => ({
        clipPath: i === 0 ? CLIPS.equal.mentee : CLIPS.equal.mentor,
      }))
      gsap.set(s.querySelectorAll('.paths__reveal'), { autoAlpha: 0, y: 16 })
      gsap.set(s.querySelectorAll('.paths__overlay-content'), { autoAlpha: 0, y: 24 })
      gsap.set(s.querySelectorAll('.paths__close'), { autoAlpha: 0 })
    }

    // Viewport tracking for Ken Burns pause
    const viewObs = new IntersectionObserver(
      ([e]) => { sectionRef.current?.classList.toggle('paths--inview', e.isIntersecting) },
      { threshold: 0.1 }
    )
    if (sectionRef.current) viewObs.observe(sectionRef.current)

    return () => {
      mq.removeEventListener('change', handler)
      viewObs.disconnect()
      if (hoverTl.current) hoverTl.current.kill()
      if (selectTl.current) selectTl.current.kill()
    }
  }, [])

  useEffect(() => {
    if (!selected) return
    const handler = (e) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [selected])

  const q = (sel) => sectionRef.current?.querySelector(sel)
  const qa = (sel) => sectionRef.current?.querySelectorAll(sel)

  const handleHover = useCallback((side) => {
    if (prefersReduced.current || isMobile.current || selected) return
    if (hoverTl.current) hoverTl.current.kill()

    const mentee = q('[data-panel="mentee"]')
    const mentor = q('[data-panel="mentor"]')
    const tl = gsap.timeline({ defaults: { duration: 0.6, ease: 'power3.out' } })
    hoverTl.current = tl

    if (side === 'mentee') {
      tl.to(mentee, { clipPath: CLIPS.hoverMentee.mentee }, 0)
        .to(mentor, { clipPath: CLIPS.hoverMentee.mentor }, 0)
        .to(mentor.querySelector('.paths__dim'), { opacity: 0.55 }, 0)
        .to(mentee.querySelector('.paths__dim'), { opacity: 0 }, 0)
        .to(mentee.querySelector('.paths__reveal'), { autoAlpha: 1, y: 0 }, 0.12)
        .to(mentee.querySelector('.paths__portrait-img'), { scale: 1.06, duration: 4, ease: 'none' }, 0)
    } else if (side === 'mentor') {
      tl.to(mentor, { clipPath: CLIPS.hoverMentor.mentor }, 0)
        .to(mentee, { clipPath: CLIPS.hoverMentor.mentee }, 0)
        .to(mentee.querySelector('.paths__dim'), { opacity: 0.55 }, 0)
        .to(mentor.querySelector('.paths__dim'), { opacity: 0 }, 0)
        .to(mentor.querySelector('.paths__reveal'), { autoAlpha: 1, y: 0 }, 0.12)
        .to(mentor.querySelector('.paths__portrait-img'), { scale: 1.06, duration: 4, ease: 'none' }, 0)
    } else {
      tl.to(mentee, { clipPath: CLIPS.equal.mentee }, 0)
        .to(mentor, { clipPath: CLIPS.equal.mentor }, 0)
        .to(qa('.paths__dim'), { opacity: 0 }, 0)
        .to(qa('.paths__reveal'), { autoAlpha: 0, y: 16 }, 0)
        .to(qa('.paths__portrait-img'), { scale: 1, duration: 0.6 }, 0)
    }
  }, [selected])

  const handleSelect = useCallback((side) => {
    if (isMobile.current) {
      setMobileExpanded((prev) => (prev === side ? null : side))
      return
    }
    if (prefersReduced.current || selected) {
      if (selected === side) handleClose()
      return
    }

    setSelected(side)
    if (hoverTl.current) hoverTl.current.kill()
    document.body.style.overflow = 'hidden'

    const panel = q(`[data-panel="${side}"]`)
    const other = q(`[data-panel="${side === 'mentee' ? 'mentor' : 'mentee'}"]`)

    const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } })
    selectTl.current = tl

    tl.to(panel, { clipPath: CLIPS.full, duration: 0.8 }, 0)
      .to(other, { autoAlpha: 0, duration: 0.4 }, 0)
      .to(panel.querySelector('.paths__content'), { autoAlpha: 0, duration: 0.3 }, 0.1)
      .to(q('.paths__header'), { autoAlpha: 0, y: -20, duration: 0.4 }, 0)
      .to(panel.querySelector('.paths__overlay-content'), { autoAlpha: 1, y: 0, duration: 0.5 }, 0.5)
      .to(panel.querySelector('.paths__close'), { autoAlpha: 1, duration: 0.3 }, 0.6)

    setTimeout(() => panel.querySelector('.paths__close')?.focus(), 700)
  }, [selected])

  const handleClose = useCallback(() => {
    if (!selected) return
    const side = selected
    const panel = q(`[data-panel="${side}"]`)
    const other = q(`[data-panel="${side === 'mentee' ? 'mentor' : 'mentee'}"]`)

    if (selectTl.current) selectTl.current.kill()

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: () => {
        setSelected(null)
        document.body.style.overflow = ''
      },
    })

    tl.to(panel.querySelector('.paths__overlay-content'), { autoAlpha: 0, y: 24, duration: 0.3 }, 0)
      .to(panel.querySelector('.paths__close'), { autoAlpha: 0, duration: 0.2 }, 0)
      .to(panel.querySelector('.paths__content'), { autoAlpha: 1, duration: 0.3 }, 0.2)
      .to(panel, { clipPath: CLIPS.equal[side], duration: 0.6 }, 0.2)
      .to(other, { autoAlpha: 1, duration: 0.4 }, 0.3)
      .to(q('.paths__header'), { autoAlpha: 1, y: 0, duration: 0.4 }, 0.3)
  }, [selected])

  const renderPanel = (data, side) => (
    <div
      className={`paths__panel paths__panel--${side}`}
      data-panel={side}
      data-mobile-expanded={mobileExpanded === side || undefined}
      onMouseEnter={() => handleHover(side)}
      onMouseLeave={() => handleHover(null)}
      onClick={() => handleSelect(side)}
      role="button"
      tabIndex={0}
      aria-label={`${data.headline} — ${data.fragment}`}
      onKeyDown={(e) => e.key === 'Enter' && handleSelect(side)}
    >
      <div className="paths__portrait">
        <img
          className="paths__portrait-img"
          src={data.portrait}
          alt=""
          aria-hidden="true"
          style={{ objectPosition: data.portraitPosition }}
        />
      </div>

      <div className="paths__gradient" aria-hidden="true" />
      <div className="paths__dim" aria-hidden="true" />

      <div className={`paths__content paths__content--${side}`}>
        <h3 className="paths__headline">{data.headline}</h3>
        <p className="paths__fragment">{data.fragment}</p>

        <div className="paths__reveal">
          <div className="paths__reveal-inner">
            <p className="paths__story">{data.story}</p>
            <Link to={data.ctaTo} className="paths__cta" onClick={(e) => e.stopPropagation()}>
              {data.cta}
            </Link>
          </div>
        </div>
      </div>

      <div className="paths__overlay-content">
        <blockquote className="paths__testimonial">
          <p>{data.testimonial}</p>
          <footer className="paths__testimonial-attr">{data.attribution}</footer>
        </blockquote>
        <Link to={data.ctaTo} className="paths__cta paths__cta--lg" onClick={(e) => e.stopPropagation()}>
          {data.cta}
        </Link>
      </div>

      <button
        className="paths__close"
        onClick={(e) => { e.stopPropagation(); handleClose() }}
        aria-label="Close preview"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="1.5" fill="none">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )

  return (
    <section className="paths" id="invitation" ref={sectionRef} data-selected={selected || undefined}>
      <div className="paths__header">
        <p className="paths__eyebrow">An invitation</p>
        <h2 className="paths__title">Two paths. Same vine.</h2>
      </div>

      <div className="paths__split">
        {renderPanel(MENTEE, 'mentee')}
        {renderPanel(MENTOR, 'mentor')}
      </div>
    </section>
  )
}
