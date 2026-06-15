import { useState } from 'react'
import { useAdminActivityPage } from '@/hooks/useAdminActivity'
import { templateForAction } from '@/lib/adminActivity'
import { Icon } from '@/components/shared/Icon/Icon'
import './activity.css'

// Full audit log for /admin/activity. Chronological list, latest first,
// paginated 50 per page. No filter UI in v1 — Linear and Stripe ship their
// audit logs as scroll-first; filters land when volume earns them. The
// underlying hook + lib already accept actor/action/date params, so adding
// filter pills later is a UI-only patch.

export function Activity() {
  const [page, setPage] = useState(0)
  const pageSize = 50

  const { rows, total, loading, error } =
    useAdminActivityPage({ page, pageSize })

  const safeTotal  = total ?? 0
  const totalPages = Math.max(1, Math.ceil(safeTotal / pageSize))
  const startIdx   = rows.length === 0 ? 0 : page * pageSize + 1
  const endIdx     = Math.min(safeTotal, page * pageSize + rows.length)

  return (
    <section className="act">
      <header className="act__head">
        <h1 className="act__title">Activity</h1>
        {safeTotal > 0 && (
          <span className="act__head-meta">
            Showing {startIdx}–{endIdx} of {safeTotal}
          </span>
        )}
      </header>

      {error ? (
        <ErrorPanel error={error} />
      ) : loading && rows.length === 0 ? (
        <LoadingPanel />
      ) : rows.length === 0 ? (
        <EmptyPanel />
      ) : (
        <ul className="act__list">
          {rows.map((row) => (
            <ActivityRow key={row.id} row={row} />
          ))}
        </ul>
      )}

      {safeTotal > pageSize && (
        <footer className="act__pagination">
          <button
            type="button"
            className="act__page-btn"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft />
            Prev
          </button>
          <span className="act__page-info">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            className="act__page-btn"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            Next
            <ChevronRight />
          </button>
        </footer>
      )}
    </section>
  )
}

// ============ Row ============

function ActivityRow({ row }) {
  const actorName = row.actor?.full_name || 'System'
  const target    = row.target_label || 'a user'

  return (
    <li className="act__row">
      <Avatar actor={row.actor} />
      <p className="act__sentence">
        <strong className="act__actor">{actorName}</strong>
        {' '}
        <ActionSentence action={row.action} target={target} />
      </p>
      <time
        className="act__time"
        dateTime={row.created_at}
        title={absoluteDate(row.created_at)}
      >
        {formatRelative(row.created_at)}
      </time>
    </li>
  )
}

// Splits the action template around its {target} placeholder so the target
// label can render in a slightly bolder weight inside the sentence flow.
function ActionSentence({ action, target }) {
  const template = templateForAction(action)
  if (!template.includes('{target}')) {
    return <span>{template}</span>
  }
  const [before, after] = template.split('{target}')
  return (
    <>
      {before}
      <strong className="act__target">{target}</strong>
      {after}
    </>
  )
}

function Avatar({ actor }) {
  const name = actor?.full_name || ''
  if (actor?.photo_url) {
    return (
      <span className="act__avatar">
        <img src={actor.photo_url} alt="" />
      </span>
    )
  }
  return (
    <span className="act__avatar act__avatar--initials" aria-hidden="true">
      {initials(name)}
    </span>
  )
}

// ============ Panels ============

function LoadingPanel() {
  return (
    <div className="act__panel">
      <span className="act__panel-icon">
        <Icon name="clock" size={20} />
      </span>
      <p className="act__panel-text">Loading activity…</p>
    </div>
  )
}

function ErrorPanel({ error }) {
  return (
    <div className="act__panel act__panel--error">
      <span className="act__panel-icon">
        <Icon name="alert" size={20} />
      </span>
      <p className="act__panel-text">
        We could not load activity right now. {error?.message ?? 'Try refreshing the page.'}
      </p>
    </div>
  )
}

function EmptyPanel() {
  return (
    <div className="act__panel">
      <span className="act__panel-icon">
        <Icon name="clock" size={20} />
      </span>
      <p className="act__panel-text">
        No admin actions logged yet. As you and your team work, every action will appear here.
      </p>
    </div>
  )
}

// ============ Helpers ============

function initials(full) {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatRelative(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ''

  const diffMs  = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHr  = Math.floor(diffMs / 3_600_000)
  const diffDay = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1)  return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr  < 24) return `${diffHr}h ago`
  if (diffDay < 7)  return `${diffDay}d ago`

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Long-form date on hover. Audit logs are kept honest by exact timestamps.
function absoluteDate(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleString('en-GB', {
    weekday: 'short',
    day:     'numeric',
    month:   'short',
    year:    'numeric',
    hour:    '2-digit',
    minute:  '2-digit'
  })
}

// ============ Inline chevrons ============

function ChevronLeft() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 14 14"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 11L5 7l4-4" />
    </svg>
  )
}

function ChevronRight() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 14 14"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 3l4 4-4 4" />
    </svg>
  )
}
