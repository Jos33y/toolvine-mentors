import { useRef, useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Logo } from '@/components/shared/Logo/Logo'
import { Icon } from '@/components/shared/Icon/Icon'
import { SOCIALS } from '@/lib/socials'
import './PublicFooter.css'

/* ============ Per-page content ============ */

const ANTIPHONS = [
  { text: 'As iron sharpens iron.', ref: 'Proverbs 27:17' },
  { text: 'Apart from me, you can do nothing.', ref: 'John 15:5' },
  { text: 'Encourage one another daily.', ref: 'Hebrews 3:13' },
  { text: 'Go and make disciples.', ref: 'Matthew 28:19' },
]

// Deterministic pick per pathname (stable per page, varies across pages)
function getAntiphon(path) {
  const hash = path.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0)
  return ANTIPHONS[Math.abs(hash) % ANTIPHONS.length]
}

const SIGNALS = [
  '127 pairs walking together',
  'Family Meeting \u00b7 Sept 12 \u00b7 7pm WAT',
  'Vinethoughts Issue 06 \u00b7 Summer 2026',
  'Reading from Proverbs this season',
  '1,840 meetings logged in 2025',
]

/* ============ Drift particle factory ============ */

const AMBER = [217, 119, 6]

function createDriftParticle() {
  return {
    x: Math.random(),
    y: Math.random() * 0.45,
    size: 1 + Math.random() * 1.4,
    opacity: 0.06 + Math.random() * 0.14,
    driftX: (Math.random() - 0.5) * 0.00003,
    driftY: (Math.random() - 0.3) * 0.00002,
  }
}

/* ============ Component ============ */

export function PublicFooter() {
  const { pathname } = useLocation()
  const footerRef = useRef(null)
  const canvasRef = useRef(null)
  const markRef = useRef(null)
  const inViewRef = useRef(false)

  const [isStatic, setIsStatic] = useState(false)
  const [signalIdx, setSignalIdx] = useState(0)
  const [fading, setFading] = useState(false)

  const antiphon = getAntiphon(pathname)

  // Reduced motion / low power check
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lowMem = (navigator.deviceMemory || 8) < 4
    if (reduced || lowMem) setIsStatic(true)
  }, [])

  // Viewport tracking (pause canvas when off-screen)
  useEffect(() => {
    const el = footerRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { inViewRef.current = e.isIntersecting },
      { threshold: 0.05 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Drift particles (Canvas 2D)
  useEffect(() => {
    if (isStatic) return
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

    const count = window.innerWidth < 760 ? 20 : 50
    const particles = Array.from({ length: count }, createDriftParticle)
    let raf

    function loop() {
      if (!inViewRef.current) { raf = requestAnimationFrame(loop); return }
      ctx.clearRect(0, 0, w, h)

      for (const p of particles) {
        p.x += p.driftX
        p.y += p.driftY
        if (p.x < -0.02) p.x = 1.02
        if (p.x > 1.02) p.x = -0.02
        if (p.y > 0.55) p.y = -0.02
        if (p.y < -0.02) p.y = 0.5

        ctx.beginPath()
        ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${AMBER[0]},${AMBER[1]},${AMBER[2]},${p.opacity})`
        ctx.fill()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [isStatic])

  // Pulse strip cycling
  useEffect(() => {
    if (isStatic) return
    const id = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setSignalIdx((i) => (i + 1) % SIGNALS.length)
        setFading(false)
      }, 400)
    }, 6000)
    return () => clearInterval(id)
  }, [isStatic])

  // Cursor proximity on mark (hover devices only)
  useEffect(() => {
    if (isStatic) return
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!canHover) return

    function handleMouse(e) {
      const mark = markRef.current
      if (!mark) return
      const rect = mark.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 200) {
        const t = 1 - dist / 200
        const angle = Math.atan2(dx, -dy)
        mark.style.setProperty('--mark-rot', `${(Math.sin(angle) * t * 3).toFixed(1)}deg`)
        mark.style.setProperty('--mark-glow', t.toFixed(2))
      } else {
        mark.style.setProperty('--mark-rot', '0deg')
        mark.style.setProperty('--mark-glow', '0')
      }
    }

    const footer = footerRef.current
    if (!footer) return
    footer.addEventListener('mousemove', handleMouse, { passive: true })
    return () => footer.removeEventListener('mousemove', handleMouse)
  }, [isStatic])

  return (
    <footer className="pf" ref={footerRef}>
      {/* Layer 1: Ground (grain + gradient via CSS) */}
      <div className="pf__ground" aria-hidden="true" />

      {/* Layer 2: Drift particles */}
      <canvas className="pf__drift" ref={canvasRef} aria-hidden="true" />

      <div className="pf__inner">

        {/* Masthead: brand lockup + interactive mark */}
        <div className="pf__masthead">
          <div className="pf__brand">
            <div className="pf__mark" ref={markRef}>
              <Logo variant="mark" size={48} />
            </div>
            <div className="pf__brand-text">
              <p className="pf__brand-name">Toolvine Mentors</p>
              <p className="pf__brand-sub">&amp; Leaders Initiative</p>
            </div>
          </div>
        </div>

        {/* Layer 5: Pulse strip */}
        <div className="pf__pulse" aria-live="polite">
          <span className="pf__pulse-rule" aria-hidden="true" />
          <p className={`pf__signal${fading ? ' pf__signal--out' : ''}`}>
            {SIGNALS[signalIdx]}
          </p>
          <span className="pf__pulse-rule" aria-hidden="true" />
        </div>

        {/* Layer 6: Nav columns */}
        <nav className="pf__nav" aria-label="Footer">
          <div className="pf__col">
            <p className="pf__col-label">Platform</p>
            <div className="pf__col-links">
              <Link to="/programs">Programs</Link>
              <Link to="/how-it-works">How it Works</Link>
              <Link to="/resources">Resources</Link>
            </div>
          </div>
          <div className="pf__col">
            <p className="pf__col-label">About</p>
            <div className="pf__col-links">
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>
            </div>
          </div>
          <div className="pf__col">
            <p className="pf__col-label">Legal</p>
            <div className="pf__col-links">
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
              <Link to="/community-guidelines">Community Guidelines</Link>
            </div>
          </div>
        </nav>

        {/* Social strip */}
        <div className="pf__socials">
          {SOCIALS.map((s) => (
            <a
              key={s.platform}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="pf__social-link"
            >
              <Icon name={s.icon} size={16} strokeWidth={1.5} />
              <span>{s.label}</span>
            </a>
          ))}
        </div>

        {/* Colophon */}
        <div className="pf__colophon">
          <a href="mailto:hello@toolvinementors.com" className="pf__colophon-email">
            hello@toolvinementors.com
          </a>
          <p>Founded 2020. Headquartered in Lagos, Nigeria.</p>
          <p>&copy; {new Date().getFullYear()} Toolvine Mentors &amp; Leaders Initiative. All rights reserved.</p>
        </div>

        {/* Closing antiphon */}
        <p className="pf__antiphon">
          <em>{antiphon.text}</em>
          <span className="pf__antiphon-ref"> ({antiphon.ref})</span>
        </p>

      </div>
    </footer>
  )
}
