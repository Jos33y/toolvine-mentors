import { Link } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import { usePendingActions } from '@/hooks/usePendingActions'
import './pendingActionsCard.css'

// Admin's to-do list. Each row identified by a leading icon badge that
// reads at a glance before the eye reaches the count or label. Icon
// choices: user for review, mail for messages, clock for stalled (time
// passing), alert for unverified (warning state), pairings for unpaired.
// Zero rows are hidden so the card shrinks to what is actually outstanding.
export function PendingActionsCard() {
  const { counts, total, loading } = usePendingActions()

  const rows = [
    { key: 'pending',    icon: 'user',     count: counts.pendingReviews,     label: 'Mentors awaiting review',           href: '/admin/users?bucket=pending' },
    { key: 'messages',   icon: 'mail',     count: counts.newSubmissions,     label: 'Unread contact submissions',        href: '/admin/submissions' },
    { key: 'stalled',    icon: 'clock',    count: counts.stalledOnboardings, label: 'Stalled onboardings (over 14 days)', href: '/admin/users?filter=onboarding_stalled' },
    { key: 'unverified', icon: 'alert',    count: counts.unverifiedOver72h,  label: 'Unverified emails (over 72 hours)', href: '/admin/users?filter=unverified' },
    { key: 'unpaired',   icon: 'pairings', count: counts.unpairedOver30d,    label: 'Mentees unpaired (over 30 days)',   href: '/admin/users?filter=unpaired' }
  ].filter((r) => r.count > 0)

  return (
    <article className="admin-pending">
      <header className="admin-pending__head">
        <p className="admin-pending__eyebrow">Awaiting you</p>
        <h2 className="admin-pending__title">What needs your attention</h2>
      </header>

      {loading ? (
        <p className="admin-pending__loading">Checking…</p>
      ) : total === 0 ? (
        <div className="admin-pending__empty">
          <span className="admin-pending__empty-icon" aria-hidden="true">
            <Icon name="check" size={18} />
          </span>
          <p className="admin-pending__empty-text">Nothing waiting on you. All clear.</p>
        </div>
      ) : (
        <ul className="admin-pending__list">
          {rows.map((r) => (
            <li key={r.key} className="admin-pending__row">
              <Link to={r.href} className="admin-pending__link">
                <span className="admin-pending__row-icon" aria-hidden="true">
                  <Icon name={r.icon} size={16} />
                </span>
                <span className="admin-pending__count">{r.count}</span>
                <span className="admin-pending__label">{r.label}</span>
                <span className="admin-pending__arrow" aria-hidden="true">
                  <Icon name="chevronRight" size={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
