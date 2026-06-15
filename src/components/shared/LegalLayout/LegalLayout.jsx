import { Children, cloneElement, isValidElement, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './LegalLayout.css'

/* ============ LegalSection ============ */
// Container for one numbered section. Number is injected by LegalLayout.

export function LegalSection({ id, title, num, children }) {
  return (
    <section
      id={id}
      data-legal-section
      className="legal__section"
      aria-labelledby={`${id}-title`}
    >
      {num && <p className="legal__section-num">{num}</p>}
      <h2 id={`${id}-title`} className="legal__section-title">{title}</h2>
      <div className="legal__section-body">{children}</div>
    </section>
  )
}

/* ============ LegalLayout ============ */

export function LegalLayout({ eyebrow, title, intro, lastUpdated, children }) {
  // Walk children once to (a) build the TOC, (b) inject section numbers.
  const items = []
  let index = 0
  const processed = Children.map(children, (child) => {
    if (isValidElement(child) && child.type === LegalSection) {
      index += 1
      const num = String(index).padStart(2, '0')
      items.push({ id: child.props.id, title: child.props.title, num })
      return cloneElement(child, { num })
    }
    return child
  })

  const [activeId, setActiveId] = useState(items[0]?.id ?? '')

  // Highlight the topmost visible section in the TOC as the page scrolls.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sections = document.querySelectorAll('[data-legal-section]')
    if (!sections.length) return

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (!visible.length) return
        const topmost = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b
        )
        setActiveId(topmost.target.id)
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    )
    sections.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])

  return (
    <article className="legal">

      {/* Hero */}
      <header className="legal__hero">
        {eyebrow && <p className="legal__eyebrow">{eyebrow}</p>}
        <h1 className="legal__title">{title}</h1>
        {intro && <p className="legal__intro"><em>{intro}</em></p>}
        {lastUpdated && (
          <p className="legal__meta">Last updated &middot; {lastUpdated}</p>
        )}
      </header>

      {/* Body: TOC + prose */}
      <div className="legal__body">

        {/* Mobile TOC: collapsible */}
        <details className="legal__toc-mobile">
          <summary className="legal__toc-summary">Contents</summary>
          <ol className="legal__toc-list">
            {items.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="legal__toc-link">
                  <span className="legal__toc-num">{item.num}</span>
                  <span className="legal__toc-text">{item.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </details>

        {/* Desktop TOC: sticky rail */}
        <aside className="legal__toc-desktop" aria-label="Contents">
          <p className="legal__toc-label">Contents</p>
          <ol className="legal__toc-list">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={`legal__toc-link${activeId === item.id ? ' is-active' : ''}`}
                >
                  <span className="legal__toc-num">{item.num}</span>
                  <span className="legal__toc-text">{item.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </aside>

        {/* Prose */}
        <div className="legal__prose">
          {processed}
        </div>
      </div>

      {/* Close */}
      <footer className="legal__close">
        <p className="legal__close-line">
          <em>Questions? We would rather you ask.</em>
        </p>
        <Link to="/contact" className="legal__close-link">
          Contact us
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </footer>

    </article>
  )
}
