import { Link } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import { useAdminActivity } from '@/hooks/useAdminActivity'
import { templateForAction } from '@/lib/adminActivity'
import './activityLogCard.css'

// Last eight admin actions. Subscribed to admin_actions realtime via the
// hook so a second admin's action shows up within ~1 second. Empty state
// uses a centered icon-in-circle pattern rather than a grey box so it reads
// as a calm "yet to begin" message instead of a missing-image placeholder.
export function ActivityLogCard() {
  const { rows, loading } = useAdminActivity({ limit: 8 })

  return (
    <article className="admin-activity">
      <header className="admin-activity__head">
        <div className="admin-activity__head-text">
          <p className="admin-activity__eyebrow">Recent</p>
          <h2 className="admin-activity__title">What just happened</h2>
        </div>
        <Link to="/admin/activity" className="admin-activity__more">
          View all
          <Icon name="chevronRight" size={14} />
        </Link>
      </header>

      {loading ? (
        <p className="admin-activity__loading">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="admin-activity__empty">
          <span className="admin-activity__empty-icon" aria-hidden="true">
            <Icon name="clock" size={18} />
          </span>
          <p>No activity yet. As you and your team work, actions appear here.</p>
        </div>
      ) : (
        <ul className="admin-activity__list">
          {rows.map((row) => <ActivityRow key={row.id} row={row} />)}
        </ul>
      )}
    </article>
  )
}

function ActivityRow({ row }) {
  const actorName   = row.actor?.full_name || 'Someone'
  const targetLabel = row.target_label    || ''
  const template    = templateForAction(row.action)

  const slot = template.indexOf('{target}')
  const before = slot >= 0 ? template.slice(0, slot) : template
  const after  = slot >= 0 ? template.slice(slot + '{target}'.length) : ''

  return (
    <li className="admin-activity__row">
      <ActorAvatar name={actorName} src={row.actor?.photo_url} />
      <div className="admin-activity__body">
        <p className="admin-activity__sentence">
          <strong className="admin-activity__actor">{actorName}</strong>
          {' '}
          <span className="admin-activity__verb">{before.trim()}</span>
          {slot >= 0 && targetLabel && (
            <>
              {' '}
              <strong className="admin-activity__target">{targetLabel}</strong>
            </>
          )}
          {after && <span className="admin-activity__verb">{after}</span>}
        </p>
        <time className="admin-activity__time" dateTime={row.created_at}>
          {relativeTime(row.created_at)}
        </time>
      </div>
    </li>
  )
}

function ActorAvatar({ name, src }) {
  const initials = (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0] || '')
    .join('')
    .toUpperCase()
  return (
    <div className="admin-activity__avatar" aria-hidden="true">
      {src
        ? <img src={src} alt="" />
        : <span className="admin-activity__avatar-initials">{initials || '?'}</span>}
    </div>
  )
}

function relativeTime(iso) {
  const then = new Date(iso).getTime()
  const now  = Date.now()
  const diff = Math.max(0, now - then)
  const min  = Math.floor(diff / 60000)
  if (min < 1)  return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24)  return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day === 1) return 'yesterday'
  if (day < 7)   return `${day} days ago`
  const wk = Math.floor(day / 7)
  if (wk < 5)    return `${wk}w ago`
  const mo = Math.floor(day / 30)
  return `${mo}mo ago`
}
