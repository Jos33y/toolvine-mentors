import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RevealOnScroll } from '@/components/shared/RevealOnScroll/RevealOnScroll'
import { fetchVisiblePartners, partnerLogoUrl } from '@/lib/partners'
import './Partners.css'

export function Partners() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [failed,  setFailed]  = useState(false)

  useEffect(() => {
    let alive = true

    fetchVisiblePartners()
      .then((data) => { if (alive) setRows(data) })
      .catch(() => { if (alive) setFailed(true) })
      .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [])

  return (
    <div className="partners">
      <header className="partners__hero">
        <p className="partners__eyebrow">PARTNERS</p>
        <h1 className="partners__title">
          <span className="partners__title-line">Working the</span>
          <em className="partners__title-italic">same soil.</em>
        </h1>
        <p className="partners__intro">
          Churches, schools, workplaces, and other initiatives that share the work with us.
        </p>
      </header>

      <div className="partners__divider" aria-hidden="true">
        <span className="partners__divider-rule" />
        <span className="partners__divider-mark">&#8258;</span>
        <span className="partners__divider-rule" />
      </div>

      <section className="partners__body" aria-label="Our partners">
        <div className="partners__inner">
          {loading ? (
            <ul className="partners__grid" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <li key={i} className="partners__card partners__card--skel" />
              ))}
            </ul>
          ) : failed ? (
            <p className="partners__state" role="alert">
              We could not load the partner list just now. Refresh the page, or write to us at
              {' '}
              <a href="mailto:hello@toolvinementors.com" className="partners__state-link">
                hello@toolvinementors.com
              </a>.
            </p>
          ) : rows.length === 0 ? (
            <div className="partners__state">
              <p className="partners__state-title">No partners listed yet.</p>
              <p>
                Organizations we work with will appear here as those relationships are
                confirmed. If yours should be among them, start a conversation.
              </p>
              <Link to="/get-involved" className="partners__state-link">
                Partner with us <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          ) : (
            <ul className="partners__grid">
              {rows.map((row, i) => (
                <li key={row.id} className="partners__cell">
                  <RevealOnScroll threshold={0.05} delay={Math.min(i * 60, 300)}>
                    <PartnerCard row={row} />
                  </RevealOnScroll>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="partners__close">
        <div className="partners__close-inner">
          <p className="partners__close-eyebrow">WORK WITH US</p>
          <p className="partners__close-body">
            If your organization is working toward the same end, there is room alongside us.
          </p>
          <Link to="/get-involved" className="partners__close-cta">
            Start a conversation <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>
    </div>
  )
}

/* ============ Card ============ */

function PartnerCard({ row }) {
  const logo = partnerLogoUrl(row.logo_path)

  const inner = (
    <>
      <span className="partners__logo">
        {logo
          ? <img src={logo} alt="" className="partners__logo-img" loading="lazy" />
          : <span className="partners__logo-fallback" aria-hidden="true">{row.name.slice(0, 1).toUpperCase()}</span>}
      </span>

      <span className="partners__card-text">
        <span className="partners__card-name">{row.name}</span>
        {row.description && (
          <span className="partners__card-desc">{row.description}</span>
        )}
        {row.website_url && (
          <span className="partners__card-host">
            {hostOf(row.website_url)} <span aria-hidden="true">&rarr;</span>
          </span>
        )}
      </span>
    </>
  )

  if (!row.website_url) {
    return <article className="partners__card">{inner}</article>
  }

  return (
    <a
      href={row.website_url}
      className="partners__card partners__card--link"
      target="_blank"
      rel="noopener noreferrer"
    >
      {inner}
    </a>
  )
}

function hostOf(url) {
  try { return new URL(url).host.replace(/^www\./, '') } catch { return url }
}
