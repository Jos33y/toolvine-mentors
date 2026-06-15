import { useRef, useState, useEffect } from 'react'
import './CinematicClose.css'

/* ============ Constants ============ */

// Cool ash RGB for canvas drawing (matches --tv-sidebar-text #CBD5E1).
// Particles read as dust/atmosphere on dark slate.
const PARTICLE = [203, 213, 225]

/* ============ Device capability ============ */

function isLowPower() {
  const mem = navigator.deviceMemory || 8
  const cores = navigator.hardwareConcurrency || 4
  return mem < 4 || cores < 4
}

function getParticleCount() {
  const w = window.innerWidth
  if (w < 760) return 75
  if (w < 1024) return 150
  return 300
}

/* ============ Particle factory ============ */

function createParticle() {
  // Depth: 0 = background (small, slow), 1 = mid, 2 = foreground (large, fast)
  const r = Math.random()
  const depth = r < 0.5 ? 0 : r < 0.8 ? 1 : 2

  // Brightness: 0 = dim, 1 = medium, 2 = bright
  const b = Math.random()
  const brightness = b < 0.45 ? 0 : b < 0.8 ? 1 : 2

  const sizes = [1.2, 2.2, 3.5]
  // Light grey reads brighter than amber on dark slate; opacities tuned down.
  const opacities = [0.12, 0.28, 0.5]

  return {
    x: Math.random(),
    y: Math.random(),
    depth,
    size: sizes[depth] + Math.random() * 0.6,
    baseOpacity: opacities[brightness],
    driftX: (Math.random() - 0.5) * 0.00008 * (depth + 1),
    driftY: (Math.random() - 0.5) * 0.00006 * (depth + 1),
    pulsePhase: Math.random() * Math.PI * 2,
    // Gives ~3s to ~8s cycle
    pulseSpeed: 0.8 + Math.random() * 1.2,
    // Stagger entrance: each particle "lights up" at a different time
    entranceDelay: Math.random() * 0.8,
  }
}

/* ============ Component ============ */

export function CinematicClose() {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const inViewRef = useRef(false)
  const [visible, setVisible] = useState(false)
  const [isStatic, setIsStatic] = useState(false)

  // Check device capabilities on mount
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || isLowPower()) setIsStatic(true)
  }, [])

  // Entrance trigger (fires once)
  useEffect(() => {
    if (isStatic) { setVisible(true); return }
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.25 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [isStatic])

  // Track whether section is in viewport (pause animation when off-screen)
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

  // Particle animation (Canvas 2D)
  useEffect(() => {
    if (!visible || isStatic) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0
    let h = 0

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const particles = Array.from({ length: getParticleCount() }, createParticle)
    const entranceStart = performance.now()
    const entranceDuration = 1200
    const parallaxAmps = [4, 8, 12]
    let raf

    function loop(time) {
      if (!inViewRef.current) { raf = requestAnimationFrame(loop); return }

      ctx.clearRect(0, 0, w, h)
      const elapsed = time - entranceStart
      const entranceProgress = Math.min(elapsed / entranceDuration, 1)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]

        // Drift
        p.x += p.driftX
        p.y += p.driftY
        if (p.x < -0.03) p.x = 1.03
        if (p.x > 1.03) p.x = -0.03
        if (p.y < -0.03) p.y = 1.03
        if (p.y > 1.03) p.y = -0.03

        // Pulse
        const pulse = Math.sin(time * 0.001 * p.pulseSpeed + p.pulsePhase) * 0.3 + 0.7

        // Entrance stagger
        const entrance = Math.max(0, Math.min((entranceProgress - p.entranceDelay) / 0.2, 1))
        if (entrance <= 0) continue

        const opacity = p.baseOpacity * pulse * entrance

        // Cursor parallax per depth tier
        const amp = parallaxAmps[p.depth]
        const px = p.x * w + mouseRef.current.x * amp
        const py = p.y * h + mouseRef.current.y * amp

        ctx.beginPath()
        ctx.arc(px, py, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${PARTICLE[0]},${PARTICLE[1]},${PARTICLE[2]},${opacity})`
        ctx.fill()
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [visible, isStatic])

  // Cursor tracking (hover devices only) — feeds particle parallax via mouseRef
  useEffect(() => {
    if (isStatic) return
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!canHover) return

    function handleMouse(e) {
      const section = sectionRef.current
      if (!section) return
      const rect = section.getBoundingClientRect()
      mouseRef.current.x = (e.clientX / window.innerWidth) - 0.5
      mouseRef.current.y = ((e.clientY - rect.top) / rect.height) - 0.5
    }

    window.addEventListener('mousemove', handleMouse, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [isStatic])

  // Render static particles once for reduced-motion / low-power
  useEffect(() => {
    if (!isStatic || !visible) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.parentElement.getBoundingClientRect()
    const w = rect.width
    const h = rect.height
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const particles = Array.from({ length: getParticleCount() }, createParticle)
    for (const p of particles) {
      ctx.beginPath()
      ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${PARTICLE[0]},${PARTICLE[1]},${PARTICLE[2]},${p.baseOpacity})`
      ctx.fill()
    }
  }, [isStatic, visible])

  const cls = [
    'cc',
    visible && 'cc--visible',
    isStatic && 'cc--static',
  ].filter(Boolean).join(' ')

  return (
    <section className={cls} ref={sectionRef} aria-label="Closing benediction">
      {/* Ambient color wash */}
      <div className="cc__wash" aria-hidden="true" />

      {/* Particle field */}
      <canvas className="cc__particles" ref={canvasRef} aria-hidden="true" />

      {/* Grain texture */}
      <div className="cc__grain" aria-hidden="true" />

      {/* Typography */}
      <div className="cc__inner">

        {/* Beat 1: Scripture */}
        <div className="cc__beat cc__beat--scripture">
          <span className="cc__glyph" aria-hidden="true">&ldquo;</span>
          <p className="cc__eyebrow">John 15 : 5</p>
          <h2 className="cc__verse">
            <span className="cc__verse-line cc__verse-line--1">
              I am the vine.
            </span>
            <span className="cc__verse-line cc__verse-line--2">
              You are the branches.
            </span>
          </h2>
        </div>

        {/* Beat 2: Benediction */}
        <div className="cc__beat cc__beat--bened">
          <span className="cc__rule" aria-hidden="true" />
          <div className="cc__bened-lines">
            <p className="cc__bened-line">Walk with us.</p>
            <p className="cc__bened-line">Walk with another.</p>
            <p className="cc__bened-line">This is how leaders are raised.</p>
          </div>
        </div>

        {/* Beat 3: Attribution */}
        <div className="cc__beat cc__beat--attr">
          <p className="cc__brand">Toolvine Mentors &amp; Leaders Initiative</p>
          <p className="cc__source">John 15. The vine and the branches.</p>
        </div>

      </div>
    </section>
  )
}
