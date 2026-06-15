import { Link } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import { useSiteInsights } from '@/hooks/useSiteInsights'
import './siteInsightsCard.css'

// Three inline panels inside one warm-cream card. Same visual language as
// EngagementSnapshot: mono-caps labels with leading icons, hairline dividers
// between panels, no embedded boxes. The triplet answers one question:
// where the public site is winning attention this week.
export function SiteInsightsCard() {
  const { visits, topPaths, funnel, loading } = useSiteInsights({ days: 7 })

  // Defensive reads so the card renders cleanly while the hook is loading
  // or while any single signal returns null.
  const current   = visits?.current  ?? 0
  const previous  = visits?.previous ?? 0
  const delta     = current - previous
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const absDelta  = Math.abs(delta)

  const paths       = (topPaths ?? []).slice(0, 3)
  const visitTotal  = funnel?.visits  ?? 0
  const signupTotal = funnel?.signups ?? 0

  const hasData = current > 0 || paths.length > 0 || visitTotal > 0

  return (
    <article className="admin-insights">
      <header className="admin-insights__head">
        <p className="admin-insights__eyebrow">Visitor signals</p>
        <h2 className="admin-insights__title">Who's visiting the site</h2>
      </header>

      {hasData ? (
        <div className="admin-insights__panels">
          <div className="admin-insights__panel">
            <span className="admin-insights__label">
              <Icon name="users" size={12} />
              Visits this week
            </span>
            <span className="admin-insights__value">{loading ? '…' : current}</span>
            <span className={`admin-insights__delta admin-insights__delta--${direction}`}>
              {direction !== 'flat' && <DeltaArrow up={direction === 'up'} />}
              <span className="admin-insights__delta-text">
                {direction === 'flat' ? 'No change' : `${absDelta} vs last week`}
              </span>
            </span>
          </div>

          <div className="admin-insights__panel">
            <span className="admin-insights__label">
              <Icon name="dashboard" size={12} />
              Top paths
            </span>
            {paths.length > 0 ? (
              <ul className="admin-insights__paths">
                {paths.map((p) => (
                  <li key={p.path} className="admin-insights__path-row">
                    <code className="admin-insights__path">{p.path}</code>
                    <span className="admin-insights__path-count">{p.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="admin-insights__empty-cell">No traffic yet</span>
            )}
          </div>

          <div className="admin-insights__panel">
            <span className="admin-insights__label">
              <Icon name="user" size={12} />
              Visit to sign-up
            </span>
            <span className="admin-insights__funnel">
              <span className="admin-insights__funnel-num">{visitTotal}</span>
              <FunnelArrow />
              <span className="admin-insights__funnel-num admin-insights__funnel-num--primary">
                {signupTotal}
              </span>
            </span>
            <span className="admin-insights__delta admin-insights__delta--flat">
              <span className="admin-insights__delta-text">past 7 days</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="admin-insights__empty">
          <span className="admin-insights__empty-icon">
            <Icon name="dashboard" size={20} />
          </span>
          <p className="admin-insights__empty-text">
            No site traffic recorded yet. Numbers appear here as visitors arrive.
          </p>
        </div>
      )}

      <footer className="admin-insights__foot">
        <Link to="/admin/insights" className="admin-insights__link">
          View full insights
          <Arrow />
        </Link>
      </footer>
    </article>
  )
}

function DeltaArrow({ up }) {
  return (
    <svg
      width="10" height="10" viewBox="0 0 16 16"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" className="admin-insights__delta-arrow"
    >
      {up ? <path d="M8 13V3M3 8l5-5 5 5" /> : <path d="M8 3v10M3 8l5 5 5-5" />}
    </svg>
  )
}

function FunnelArrow() {
  return (
    <svg
      width="14" height="10" viewBox="0 0 14 10"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" className="admin-insights__funnel-arrow"
    >
      <path d="M1 5h11m-4-4l4 4-4 4" />
    </svg>
  )
}

function Arrow() {
  return (
    <svg
      width="12" height="12" viewBox="0 0 12 12"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 6h10m-4-4l4 4-4 4" />
    </svg>
  )
}
