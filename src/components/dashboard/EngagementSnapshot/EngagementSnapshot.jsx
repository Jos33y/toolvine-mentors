import { Icon } from '@/components/shared/Icon/Icon'
import { useAdminStats } from '@/hooks/useAdminStats'
import './engagementSnapshot.css'

// Three trend panels arranged as inline columns inside one warm-cream card.
// Each panel's label carries a small leading icon so the three columns read
// as distinct categories without the visual noise of full badges. Hairline
// dividers between columns replace the embedded grey boxes of the prior
// design.
export function EngagementSnapshot() {
  const { trends, loading } = useAdminStats()

  // Data fields use `id` not `key` so the React key passed in JSX does not
  // collide with the same name inside the spread object.
  const panels = [
    { id: 'meetings', icon: 'check',    label: 'Meetings completed', trend: trends?.meetingsCompleted },
    { id: 'signups',  icon: 'user',     label: 'New sign-ups',       trend: trends?.newSignups },
    { id: 'pairings', icon: 'pairings', label: 'Active pairings',    trend: trends?.activePairings }
  ]

  return (
    <article className="admin-engage">
      <header className="admin-engage__head">
        <p className="admin-engage__eyebrow">Momentum</p>
        <h2 className="admin-engage__title">Where the platform is moving</h2>
      </header>

      <div className="admin-engage__panels">
        {panels.map((p) => (
          <TrendPanel
            key={p.id}
            icon={p.icon}
            label={p.label}
            trend={p.trend}
            loading={loading}
          />
        ))}
      </div>
    </article>
  )
}

function TrendPanel({ label, icon, trend, loading }) {
  const current    = trend?.current  ?? 0
  const previous   = trend?.previous ?? 0
  const comparison = trend?.label    ?? ''
  const delta      = current - previous
  const direction  = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const absDelta   = Math.abs(delta)

  return (
    <div className="admin-engage__panel">
      <span className="admin-engage__label">
        <Icon name={icon} size={12} />
        {label}
      </span>
      <span className="admin-engage__value">{loading ? '…' : current}</span>
      <span className={`admin-engage__delta admin-engage__delta--${direction}`}>
        {direction !== 'flat' && <DeltaArrow up={direction === 'up'} />}
        <span className="admin-engage__delta-text">
          {direction === 'flat' ? 'No change' : `${absDelta} ${comparison}`}
        </span>
      </span>
    </div>
  )
}

function DeltaArrow({ up }) {
  return (
    <svg
      width="12" height="12" viewBox="0 0 16 16"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" className="admin-engage__delta-arrow"
    >
      {up ? <path d="M8 13V3M3 8l5-5 5 5" /> : <path d="M8 3v10M3 8l5 5 5-5" />}
    </svg>
  )
}
