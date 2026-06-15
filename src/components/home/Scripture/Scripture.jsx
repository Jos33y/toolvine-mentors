import { useRef, useState, useEffect } from 'react'
import './Scripture.css'

export function Scripture({ verse, reference }) {
  const figRef = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = figRef.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setVisible(true); return }

    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.4 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const words = verse.split(' ')

  return (
    <figure
      className={`scripture${visible ? ' scripture--visible' : ''}`}
      ref={figRef}
    >
      <span className="scripture-quote" aria-hidden="true">&ldquo;</span>
      <blockquote className="scripture-verse" aria-label={verse}>
        {words.map((word, i) => (
          <span
            key={i}
            className="scripture-word"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {word}{' '}
          </span>
        ))}
      </blockquote>
      <figcaption className="scripture-ref">{reference}</figcaption>
    </figure>
  )
}
