import { Icon } from '@/components/shared/Icon/Icon'
import { useAdminStats } from '@/hooks/useAdminStats'
import './adminStatsRow.css'

// Four headline numbers. Number on top, icon badge + label at the bottom.
// The badge gives each cell a visual identifier you can recognise before
// reading: alert for pending, users for active, pairings for the work,
// calendar for the week ahead. The action stat (Pending Review) gets the
// amber accent on number, badge background, badge icon, and label.
//
// Mentors and mentees no longer have their own cells; the breakdown sits
// under Active Members, keeping the headline row uncramped at 13" widths.
export function AdminStatsRow() {
  const { stats, loading } = useAdminStats()
  const display = (n) => loading ? '\u2026' : String(n ?? 0)

  const breakdown = stats
    ? `${stats.mentorsCount} mentors \u00B7 ${stats.menteesCount} mentees`
    : null

  const cells = [
    {
      key:    'pending',
      icon:   'alert',
      label:  'Pending review',
      value:  stats?.pendingReviews,
      action: true
    },
    {
      key:       'active',
      icon:      'users',
      label:     'Active members',
      value:     stats?.activeMembers,
      breakdown
    },
    {
      key:   'pairs',
      icon:  'pairings',
      label: 'Active pairings',
      value: stats?.activePairings
    },
    {
      key:   'meetings',
      icon:  'calendar',
      label: 'Meetings this week',
      value: stats?.meetingsThisWeek
    }
  ]

  return (
    <ul className="admin-stats">
      {cells.map((c) => (
        <li key={c.key} className={`admin-stats__item${c.action ? ' admin-stats__item--action' : ''}`}>
          <span className="admin-stats__value">{display(c.value)}</span>
          {c.breakdown && (
            <span className="admin-stats__breakdown">{loading ? '\u00A0' : c.breakdown}</span>
          )}
          <span className="admin-stats__head">
            <span className="admin-stats__head-icon" aria-hidden="true">
              <Icon name={c.icon} size={14} />
            </span>
            <span className="admin-stats__label">{c.label}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
