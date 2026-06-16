import { useState } from 'react'
import { useAdminSubmissions } from '@/hooks/useAdminSubmissions'
import { Icon } from '@/components/shared/Icon/Icon'
import './submissions.css'

// Admin inbox for contact form submissions. Status filter tabs across the
// top, paginated row list below, click-to-expand for full message + action
// buttons. Optimistic status updates leave a row visible in its old bucket
// after a status change so the admin can keep working through the list
// without context loss; switching tabs re-fetches the truth.

const STATUS_FILTERS = [
  { value: null,       label: 'All' },
  { value: 'new',      label: 'New' },
  { value: 'read',     label: 'Read' },
  { value: 'replied',  label: 'Replied' },
  { value: 'archived', label: 'Archived' }
]

// Submission origin labels. Add new sources here as channels expand
// (applications, safeguarding reports, etc.). Defaults to contact since that
// is the only source feeding this inbox today.
const SOURCE_MAP = {
  contact: 'Contact form'
}

export function Submissions() {
  const [status,     setStatus]     = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const {
    rows, total, page, pageSize, setPage, loading, error, updateStatus
  } = useAdminSubmissions({ status, pageSize: 25 })

  const safeTotal  = total ?? 0
  const totalPages = Math.max(1, Math.ceil(safeTotal / pageSize))
  const startIdx   = rows.length === 0 ? 0 : page * pageSize + 1
  const endIdx     = Math.min(safeTotal, page * pageSize + rows.length)

  const handleFilterChange = (value) => {
    setStatus(value)
    setExpandedId(null)
    setPage(0)
  }

  return (
    <section className="subs">
      <header className="subs__head">
        <h1 className="subs__title">Submissions</h1>
        {safeTotal > 0 && (
          <span className="subs__head-meta">
            Showing {startIdx}–{endIdx} of {safeTotal}
          </span>
        )}
      </header>

      <nav className="subs__filters" aria-label="Filter submissions by status">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            className={`subs__filter ${status === f.value ? 'is-active' : ''}`}
            onClick={() => handleFilterChange(f.value)}
            aria-pressed={status === f.value}
          >
            {f.label}
          </button>
        ))}
      </nav>

      {error ? (
        <ErrorPanel error={error} />
      ) : loading && rows.length === 0 ? (
        <LoadingPanel />
      ) : rows.length === 0 ? (
        <EmptyPanel status={status} />
      ) : (
        <ul className="subs__list">
          {rows.map((row) => (
            <SubmissionRow
              key={row.id}
              row={row}
              expanded={expandedId === row.id}
              onToggle={() =>
                setExpandedId(expandedId === row.id ? null : row.id)
              }
              onUpdateStatus={(next) => updateStatus(row.id, next)}
            />
          ))}
        </ul>
      )}

      {safeTotal > pageSize && (
        <footer className="subs__pagination">
          <button
            type="button"
            className="subs__page-btn"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft />
            Prev
          </button>
          <span className="subs__page-info">
            Page {page + 1} of {totalPages}
          </span>
          <button
            type="button"
            className="subs__page-btn"
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

function SubmissionRow({ row, expanded, onToggle, onUpdateStatus }) {
  const name      = row.name?.trim() || 'Anonymous'
  const email     = row.email || ''
  const message   = row.message || ''
  const preview   = message.slice(0, 120).trim()
  const truncated = message.length > 120

  return (
    <li className={`subs__row ${expanded ? 'is-expanded' : ''}`}>
      <button
        type="button"
        className="subs__row-head"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="subs__row-name">{name}</span>
        <span className="subs__row-email">{email}</span>
        <span className="subs__row-pills">
          <SourcePill source={row.source} />
          <StatusPill status={row.status} />
        </span>
        <span className="subs__row-time">{formatRelative(row.created_at)}</span>
        <span className="subs__row-chevron" aria-hidden="true">
          <ChevronDown />
        </span>
      </button>

      {!expanded && preview && (
        <p className="subs__row-preview">
          {preview}{truncated && '…'}
        </p>
      )}

      {expanded && (
        <div className="subs__row-body">
          <div className="subs__row-message">{message}</div>

          <div className="subs__row-actions">
            {row.status !== 'read' && (
              <button
                type="button"
                className="subs__action subs__action--ghost"
                onClick={() => onUpdateStatus('read')}
              >
                Mark read
              </button>
            )}
            {row.status !== 'replied' && (
              <button
                type="button"
                className="subs__action subs__action--ghost"
                onClick={() => onUpdateStatus('replied')}
              >
                Mark replied
              </button>
            )}
            {row.status !== 'archived' && (
              <button
                type="button"
                className="subs__action subs__action--ghost"
                onClick={() => onUpdateStatus('archived')}
              >
                Archive
              </button>
            )}
            {email && (
              <a
                href={`mailto:${email}?subject=${encodeURIComponent('Re: your message to ToolVine')}`}
                className="subs__action subs__action--primary"
              >
                <Icon name="mail" size={14} />
                Reply via email
              </a>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

// ============ Status pill ============

const STATUS_MAP = {
  new:      { label: 'New',      mod: 'new' },
  read:     { label: 'Read',     mod: 'read' },
  replied:  { label: 'Replied',  mod: 'replied' },
  archived: { label: 'Archived', mod: 'archived' }
}

function StatusPill({ status }) {
  const info = STATUS_MAP[status] ?? STATUS_MAP.new
  return (
    <span className={`subs__pill subs__pill--${info.mod}`}>{info.label}</span>
  )
}

function SourcePill({ source }) {
  const label = SOURCE_MAP[source] ?? SOURCE_MAP.contact
  return <span className="subs__pill subs__pill--source">{label}</span>
}

// ============ Panels ============

function LoadingPanel() {
  return (
    <div className="subs__panel">
      <span className="subs__panel-icon">
        <Icon name="mail" size={20} />
      </span>
      <p className="subs__panel-text">Loading submissions…</p>
    </div>
  )
}

function ErrorPanel({ error }) {
  return (
    <div className="subs__panel subs__panel--error">
      <span className="subs__panel-icon">
        <Icon name="alert" size={20} />
      </span>
      <p className="subs__panel-text">
        We could not load submissions right now. {error?.message ?? 'Try refreshing the page.'}
      </p>
    </div>
  )
}

function EmptyPanel({ status }) {
  return (
    <div className="subs__panel">
      <span className="subs__panel-icon">
        <Icon name="mail" size={20} />
      </span>
      <p className="subs__panel-text">{emptyMessageFor(status)}</p>
    </div>
  )
}

function emptyMessageFor(status) {
  switch (status) {
    case 'new':      return 'No new submissions. Every recent message has been seen.'
    case 'read':     return 'Nothing in the read bucket. Mark a message read to see it here.'
    case 'replied':  return 'No replied submissions yet.'
    case 'archived': return 'Nothing archived.'
    default:         return 'No submissions yet. Messages from the contact form will appear here.'
  }
}

// ============ Time formatting ============

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

// ============ Inline chevrons ============

function ChevronDown() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 14 14"
      fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 5l4 4 4-4" />
    </svg>
  )
}

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
