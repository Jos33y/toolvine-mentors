import { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { HeroStack } from '@/components/home/HeroStack/HeroStack'
import { Conviction } from '@/components/home/Conviction/Conviction'
import { Practices } from '@/components/home/Practices/Practices'
import { Community } from '@/components/home/Community/Community'
import { Pause } from '@/components/home/Pause/Pause'
import { TwoPaths } from '@/components/home/TwoPaths/TwoPaths'
import { WallOfWitness } from '@/components/home/WallOfWitness/WallOfWitness'
import { CinematicClose } from '@/components/home/CinematicClose/CinematicClose'

import './Home.css'

/* ============ Ambient light orb definitions ============ */

const ORBS = [
  { x: 0.22, y: 0.28, radius: 340, color: [217, 119, 6], opacity: 0.08, speed: 0.30, phase: 0 },
  { x: 0.72, y: 0.62, radius: 280, color: [20, 184, 166],  opacity: 0.06, speed: 0.22, phase: 1.8 },
  { x: 0.48, y: 0.45, radius: 400, color: [217, 119, 6], opacity: 0.05, speed: 0.18, phase: 3.2 },
  { x: 0.82, y: 0.20, radius: 260, color: [15, 118, 110],  opacity: 0.06, speed: 0.32, phase: 4.7 },
  { x: 0.12, y: 0.72, radius: 220, color: [252, 211, 77],  opacity: 0.04, speed: 0.26, phase: 2.4 },
]

export function Home() {
  const canvasRef = useRef(null)
  const inViewRef = useRef(true)

  // Ambient light canvas
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0, h = 0

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    let raf
    function loop(time) {
      ctx.clearRect(0, 0, w, h)
      for (const orb of ORBS) {
        const ox = orb.x * w + Math.sin(time * 0.001 * orb.speed + orb.phase) * 60
        const oy = orb.y * h + Math.cos(time * 0.001 * orb.speed * 0.7 + orb.phase) * 40
        const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, orb.radius)
        grad.addColorStop(0, `rgba(${orb.color[0]},${orb.color[1]},${orb.color[2]},${orb.opacity})`)
        grad.addColorStop(1, `rgba(${orb.color[0]},${orb.color[1]},${orb.color[2]},0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(ox, oy, orb.radius, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])

  return (
    <div className="home">

      <section className="hero" aria-labelledby="hero-tagline">
        {/* Ambient light layer */}
        <canvas className="hero__ambient" ref={canvasRef} aria-hidden="true" />

        <div className="hero__inner">

          <div className="hero__content">
            <div className="hero__colophon">
              <span className="hero__colophon-mark" aria-hidden="true">&#8258;</span>
              <span>Toolvine Mentors &amp; Leaders</span>
            </div>

            <h1 id="hero-tagline" className="hero__title">
              <span className="hero__title-line">Raising</span>
              <em className="hero__title-emphasis">Godly Mentors</em>
              <span className="hero__title-line">and Leaders</span>
            </h1>

            <p className="hero__body">
              Christian mentors and mentees, connected for transformational impact.
              No one is meant to walk alone.
            </p>

            <div className="hero__cta">
              <Link to="/auth/sign-up" className="hero__btn hero__btn--primary">
                Join ToolVine
              </Link>
              <Link to="/programs" className="hero__btn hero__btn--ghost">
                Explore Programs
              </Link>
            </div>
          </div>

          <div className="hero__media">
            <HeroStack />
          </div>

        </div>
      </section>

      <Conviction />
      <Practices />
      <Community />
      <Pause />
      <TwoPaths />
      <WallOfWitness />
      <CinematicClose />
    </div>
  )
}
