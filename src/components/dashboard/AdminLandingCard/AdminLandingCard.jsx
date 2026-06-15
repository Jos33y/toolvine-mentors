import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAdminUsers } from '@/hooks/useAdminUsers'
import { bucketFor } from '@/lib/adminUsers'
import './adminLandingCard.css'

// Platform overview for the admin dashboard. Pulls from the same user-list
// hook the /users page uses; the v1 user count is small enough that an
// independent query is unnecessary.
//
// Active pairings reads 0 until Block C ships the pairings UI and we wire
// the count to the existing public.pairings table.
export function AdminLandingCard() {
  const { users, loading } = useAdminUsers()
  const stats = useMemo(() => computeStats(users), [users])
  const display = (n) => loading ? '…' : String(n)

  return (
    <article className="admin-card">
      <header className="admin-card__head">
        <p className="admin-card__eyebrow">Platform overview</p>
        <h2 className="admin-card__title">Today on ToolVine</h2>
      </header>

      <ul className="admin-card__stats">
        <li className="admin-card__stat admin-card__stat--accent">
          <span className="admin-card__stat-num">{display(stats.pending)}</span>
          <span className="admin-card__stat-label">Pending review</span>
        </li>
        <li className="admin-card__stat">
          <span className="admin-card__stat-num">{display(stats.activeUsers)}</span>
          <span className="admin-card__stat-label">Active users</span>
        </li>
        <li className="admin-card__stat">
          <span className="admin-card__stat-num">{display(stats.mentors)}</span>
          <span className="admin-card__stat-label">Mentors</span>
        </li>
        <li className="admin-card__stat">
          <span className="admin-card__stat-num">{display(stats.activePairings)}</span>
          <span className="admin-card__stat-label">Active pairings</span>
        </li>
      </ul>

      <footer className="admin-card__foot">
        <Link className="admin-card__cta admin-card__cta--primary" to="/users">
          Open Users
          <span className="admin-card__cta-arrow" aria-hidden="true">→</span>
        </Link>
        <Link className="admin-card__cta admin-card__cta--secondary" to="/pairings">
          Open Pairings
          <span className="admin-card__cta-arrow" aria-hidden="true">→</span>
        </Link>
      </footer>
    </article>
  )
}

function computeStats(users) {
  let pending = 0
  let activeUsers = 0
  let mentors = 0
  for (const u of users) {
    if (!u.is_active) continue
    activeUsers++
    if (u.roles.includes('mentor')) mentors++
    if (bucketFor(u) === 'pending') pending++
  }
  return { pending, activeUsers, mentors, activePairings: 0 }
}
