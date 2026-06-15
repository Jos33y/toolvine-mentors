import { useRef, useState, useEffect } from 'react'
import './Pause.css'
import { RevealOnScroll } from '@/components/shared/RevealOnScroll/RevealOnScroll'

/* ============ Ambient particle factory ============ */

const AMBER = [217, 119, 6]

function createParticle() {
  return {
    x: Math.random(),
    y: Math.random(),
    size: 2 + Math.random() * 3,
    opacity: 0.06 + Math.random() * 0.08,
    driftX: (Math.random() - 0.5) * 0.00004,
    driftY: (Math.random() - 0.5) * 0.00003,
    pulsePhase: Math.random() * Math.PI * 2,
    pulseSpeed: 0.6 + Math.random() * 0.8,
  }
}

export function Pause() {
  const canvasRef = useRef(null)
  const inViewRef = useRef(false)
  const sectionRef = useRef(null)
  const [isStatic, setIsStatic] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lowMem = (navigator.deviceMemory || 8) < 4
    if (reduced || lowMem) setIsStatic(true)
  }, [])

  // Viewport tracking
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { inViewRef.current = e.isIntersecting },
      { threshold: 0.05 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Particle animation
  useEffect(() => {
    if (isStatic) return
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

    const count = window.innerWidth < 760 ? 6 : 10
    const particles = Array.from({ length: count }, createParticle)
    let raf

    function loop(time) {
      if (!inViewRef.current) { raf = requestAnimationFrame(loop); return }
      ctx.clearRect(0, 0, w, h)

      for (const p of particles) {
        p.x += p.driftX
        p.y += p.driftY
        if (p.x < -0.05) p.x = 1.05
        if (p.x > 1.05) p.x = -0.05
        if (p.y < -0.05) p.y = 1.05
        if (p.y > 1.05) p.y = -0.05

        const pulse = Math.sin(time * 0.001 * p.pulseSpeed + p.pulsePhase) * 0.4 + 0.6
        const opacity = p.opacity * pulse

        ctx.beginPath()
        ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${AMBER[0]},${AMBER[1]},${AMBER[2]},${opacity})`
        ctx.fill()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [isStatic])

  return (
    <section className="pause" ref={sectionRef} id="pause">
      <canvas className="pause__ambient" ref={canvasRef} aria-hidden="true" />

      <div className="pause__inner">
        <RevealOnScroll>

          <header className="pause__header">
            <p className="pause__eyebrow">Reflection</p>
            <h2 className="pause__title">
              Two questions, depending<br />on where you are.
            </h2>
          </header>

          <span className="pause__divider" aria-hidden="true" />

          <div className="pause__spread">
            <article className="pause__path">
              <span className="pause__rule" aria-hidden="true" />
              <p className="pause__role">For the one seeking a mentor</p>
              <p className="pause__question">
                Where in your faith would another voice change everything?
              </p>
            </article>

            <article className="pause__path">
              <span className="pause__rule" aria-hidden="true" />
              <p className="pause__role">For the one ready to mentor</p>
              <p className="pause__question">
                Whose growth could you guard with your time this year?
              </p>
            </article>
          </div>

        </RevealOnScroll>
      </div>
    </section>
  )
}
