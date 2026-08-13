import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import { useMentorDashboard } from '@/hooks/useMentorDashboard'
import { Icon } from '@/components/shared/Icon/Icon'
import { labelFor, daysAgoLabel, STATUS } from '@/lib/mentorStatus'
import { pairedSinceLabel } from '@/lib/format'
import './mentees.css'

// Status order is triage order: the ones asking for attention first. The
// dashboard card previews the same data capped at six; this is the full list.
const STATUS_ORDER = [STATUS.STALLED, STATUS.FOLLOW_UP, STATUS.NEW, STATUS.ON_TRACK]

const FILTERS = [
  { key: 'all',            label: 'All' },
  { key: STATUS.STALLED,   label: 'Stalled' },
  { key: STATUS.FOLLOW_UP, label: 'Follow up' },
  { key: STATUS.NEW,       label: 'New' },
  { key: STATUS.ON_TRACK,  label: 'On track' }
]

export function Mentees() {
  const profile = useAuth((s) => s.profile)
  const roles   = useAuth((s) => s.roles)

  const isMentor = roles.includes('mentor')
  const { mentees, loading, error } = useMentorDashboard(isMentor ? profile?.id : null)

  const [filter, setFilter] = useState('all')
  const [query, setQuery]   = useState('')

  const sorted = useMemo(() => {
    const rank = (s) => {
      const i = STATUS_ORDER.indexOf(s)
      return i === -1 ? STATUS_ORDER.length : i
    }
    return [...mentees].sort((a, b) => {
      const byStatus = rank(a.status) - rank(b.status)
      if (byStatus !== 0) return byStatus
      return (a.mentee?.full_name || '').localeCompare(b.mentee?.full_name || '')
    })
  }, [mentees])

  const counts = useMemo(() => {
    const out = { all: mentees.length }
    for (const s of STATUS_ORDER) out[s] = mentees.filter((m) => m.status === s).length
    return out
  }, [mentees])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sorted
      .filter((m) => filter === 'all' || m.status === filter)
      .filter((m) => {
        if (!q) return true
        const p = m.mentee
        return (p?.full_name || '').toLowerCase().includes(q)
            || (p?.email || '').toLowerCase().includes(q)
      })
  }, [sorted, filter, query])

  // An admin can reach this route. They hold no mentees of their own, so
  // point them at the board that does answer their question.
  if (!isMentor) {
    return (
      <section className="mentees-page">
        <Header />
        <div className="mentees-page__empty">
          <p className="mentees-page__empty-title">This page shows your own mentees</p>
          <p className="mentees-page__empty-body">
            You do not hold the mentor role, so there is nothing here. Every pairing on the
            platform lives on the pairings board.
          </p>
          <Link className="mentees-page__cta" to="/admin/pairings">
            <span>Go to pairings</span>
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="mentees-page">
      <Header />

      {error && (
        <div className="mentees-page__alert" role="alert">
          We could not load your mentees. Reload the page, or contact our team if it keeps happening.
        </div>
      )}

      {mentees.length > 0 && (
        <>
          <nav className="mentees-page__filters" aria-label="Filter mentees">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={'mentees-page__filter' + (filter === f.key ? ' mentees-page__filter--active' : '')}
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
              >
                <span>{f.label}</span>
                <span className="mentees-page__filter-count">{counts[f.key] ?? 0}</span>
              </button>
            ))}
          </nav>

          <div className="mentees-page__search">
            <Icon name="search" size={16} />
            <input
              type="search"
              className="mentees-page__search-input"
              placeholder="Search by name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              spellCheck="false"
            />
          </div>
        </>
      )}

      {loading ? (
        <ul className="mentees-page__list" aria-busy="true">
          {[0, 1, 2].map((i) => <li key={i} className="mentees-page__row mentees-page__row--skel" />)}
        </ul>
      ) : mentees.length === 0 ? (
        <div className="mentees-page__empty">
          <p className="mentees-page__empty-title">No mentees yet</p>
          <p className="mentees-page__empty-body">
            Our team will pair you when a match is ready. You will receive an email when
            that happens. Until then, this is the quiet before the work.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="mentees-page__empty">
          <p className="mentees-page__empty-title">Nobody matches that</p>
          <p className="mentees-page__empty-body">Try a different name, or clear the filter.</p>
        </div>
      ) : (
        <ul className="mentees-page__list">
          {rows.map((m) => <MenteeRow key={m.id} mentee={m} />)}
        </ul>
      )}
    </section>
  )
}

// No count beside the title. The All filter already carries it, and a bare
// number hanging off a heading reads as unfinished.
function Header() {
  return (
    <header className="mentees-page__head">
      <p className="mentees-page__eyebrow">Mentor</p>
      <h1 className="mentees-page__title">Your mentees</h1>
      <p className="mentees-page__lede">
        Who you are mentoring, what they are working on, and where each relationship stands.
      </p>
    </header>
  )
}

function MenteeRow({ mentee }) {
  const person = mentee.mentee
  const focus  = mentee.focus ?? []
  const open   = mentee.openItemsCount ?? 0

  return (
    <li className="mentees-page__row">
      <div className="mentees-page__person">
        <Avatar name={person?.full_name} photo={person?.photo_url} />
        <div className="mentees-page__person-text">
          <p className="mentees-page__name">{person?.full_name ?? 'Mentee'}</p>
          <p className="mentees-page__email">{person?.email}</p>
        </div>
      </div>

      <div className="mentees-page__detail">
        {focus.length > 0 && (
          <ul className="mentees-page__tags">
            {focus.slice(0, 3).map((f) => (
              <li key={f.categoryId} className="mentees-page__tag">{f.label}</li>
            ))}
          </ul>
        )}
        <p className="mentees-page__meta">
          {mentee.lastMetAt
            ? `Last met ${daysAgoLabel(mentee.lastMetAt)}`
            : `Paired ${pairedSinceLabel(mentee.startedAt) ?? 'recently'}, not met yet`}
          {open > 0 && (
            <span className="mentees-page__open">
              {` · ${open} open ${open === 1 ? 'item' : 'items'}`}
            </span>
          )}
        </p>
      </div>

      {mentee.status && (
        <span className={`mentees-page__pill mentees-page__pill--${mentee.status}`}>
          {labelFor(mentee.status)}
        </span>
      )}
    </li>
  )
}

function Avatar({ name, photo }) {
  if (photo) {
    return (
      <span className="mentees-page__avatar">
        <img src={photo} alt="" className="mentees-page__avatar-img" />
      </span>
    )
  }
  return (
    <span className="mentees-page__avatar mentees-page__avatar--initials" aria-hidden="true">
      {initials(name)}
    </span>
  )
}

function initials(full) {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
