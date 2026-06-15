import { useEffect, useRef, useState } from 'react'
import './RevealOnScroll.css'

/**
 * Fade-and-rise reveal triggered by IntersectionObserver.
 * Respects prefers-reduced-motion (shows immediately).
 *
 * Usage:
 *   <RevealOnScroll>...</RevealOnScroll>
 *   <RevealOnScroll delay={200}>...</RevealOnScroll>
 */
export function RevealOnScroll({ children, delay = 0, threshold = 0.15, className = '' }) {
  const ref = useRef(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setRevealed(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -10% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  const style = delay ? { transitionDelay: `${delay}ms` } : undefined

  return (
    <div
      ref={ref}
      className={`reveal ${revealed ? 'is-revealed' : ''} ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  )
}
