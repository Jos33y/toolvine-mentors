import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import { useAdminUsers } from '@/hooks/useAdminUsers'
import { applyRoleDecision, sendRoleDecisionEmail, setUserActive, bucketFor } from '@/lib/adminUsers'
import { UserDetailDrawer } from '@/components/admin/UserDetailDrawer/UserDetailDrawer'
import './users.css'

// Role buckets group users by primary state. Attention filters cut across
// buckets with their own predicates and match the slugs PendingActionsCard
// uses on the dashboard.
const FILTERS = [
  { key: 'all',                label: 'All' },
  { key: 'pending',            label: 'Pending review' },
  { key: 'mentor',             label: 'Mentors' },
  { key: 'mentee',             label: 'Mentees' },
  { key: 'admin',              label: 'Admins' },
  { key: 'deactivated',        label: 'Deactivated' },
  { key: 'onboarding_stalled', label: 'Stalled onboarding' },
  { key: 'unverified',         label: 'Unverified email' },
  { key: 'unpaired',           label: 'Unpaired (30d+)' }
]

const DEFAULT_FILTER = 'pending'

export function Users() {
  const me = useAuth((s) => s.profile)
  const { users, loading, error, patchUser } = useAdminUsers()

  // Filter lives in the URL so dashboard links land directly on the right
  // subset. Search stays in component state to avoid history churn.
  const [searchParams, setSearchParams] = useSearchParams()
  const rawFilter = searchParams.get('filter')
  const filter = FILTERS.some((f) => f.key === rawFilter) ? rawFilter : DEFAULT_FILTER

  const setFilter = (next) => {
    const params = new URLSearchParams(searchParams)
    if (next === DEFAULT_FILTER) params.delete('filter')
    else params.set('filter', next)
    setSearchParams(params, { replace: true })
  }

  const [query, setQuery]   = useState('')
  const [pending, setPending] = useState(null)
  const [busyId, setBusyId]   = useState(null)
  const [rowError, setRowError] = useState({ id: null, message: '' })
  const [rowNotice, setRowNotice] = useState({ id: null, message: '', tone: 'info' })

  // Selected user for the side drawer. We track ID rather than the whole
  // object so patchUser updates flow through to the drawer header without
  // a stale reference.
  const [selectedUserId, setSelectedUserId] = useState(null)
  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  )

  // Auto-dismiss the row notice after 6 seconds so the success strip does not linger.
  useEffect(() => {
    if (!rowNotice.id) return
    const t = setTimeout(() => setRowNotice({ id: null, message: '', tone: 'info' }), 6000)
    return () => clearTimeout(t)
  }, [rowNotice.id, rowNotice.message])

  const counts = useMemo(() => countByBucket(users), [users])
  const filtered = useMemo(
    () => filterUsers(users, filter, query),
    [users, filter, query]
  )

  async function runDecision(user, decision) {
    setBusyId(user.id)
    setRowError({ id: null, message: '' })
    setRowNotice({ id: null, message: '', tone: 'info' })
    try {
      const next = await applyRoleDecision(user.id, decision)
      if (next) {
        patchUser(user.id, {
          roles:          next.roles || [],
          role_intent:    next.role_intent,
          role_undecided: next.role_undecided,
          is_active:      next.is_active
        })
      }
      const result = await sendRoleDecisionEmail(user.id, decision)
      setRowNotice({
        id:      user.id,
        message: noticeFromEmailResult(result, user, decision),
        tone:    result.sent ? 'success' : (result.reason === 'unverified' ? 'info' : 'warn')
      })
    } catch (e) {
      setRowError({ id: user.id, message: friendly(e) })
    } finally {
      setBusyId(null)
      setPending(null)
    }
  }

  async function toggleActive(user) {
    setBusyId(user.id)
    setRowError({ id: null, message: '' })
    try {
      const next = await setUserActive(user.id, !user.is_active)
      patchUser(user.id, { is_active: next.is_active })
    } catch (e) {
      setRowError({ id: user.id, message: friendly(e) })
    } finally {
      setBusyId(null)
      setPending(null)
    }
  }

  return (
    <section className="admin-users">
      <header className="admin-users__head">
        <p className="admin-users__eyebrow">Admin</p>
        <h1 className="admin-users__title">Users</h1>
        <p className="admin-users__lede">
          Approve mentor sign-ups, demote, deactivate, or confirm a mentee.
        </p>
      </header>

      <nav className="admin-users__filters" aria-label="Filter users">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={
              'admin-users__filter' +
              (filter === f.key ? ' admin-users__filter--active' : '')
            }
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
          >
            <span className="admin-users__filter-label">{f.label}</span>
            <span className="admin-users__filter-count">{counts[f.key] ?? 0}</span>
          </button>
        ))}
      </nav>

      <div className="admin-users__search">
        <SearchIcon />
        <input
          type="search"
          className="admin-users__search-input"
          placeholder="Search name or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck="false"
        />
      </div>

      {error && (
        <div className="admin-users__alert" role="alert">
          We could not load the user list. {friendly(error)}
        </div>
      )}

      {loading ? (
        <ul className="admin-users__list" aria-busy="true">
          {[0,1,2,3].map((i) => <li key={i} className="admin-users__row admin-users__row--skel" />)}
        </ul>
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} query={query} />
      ) : (
        <ul className="admin-users__list">
          {filtered.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              isSelf={u.id === me?.id}
              busy={busyId === u.id}
              rowError={rowError.id === u.id ? rowError.message : ''}
              rowNotice={rowNotice.id === u.id ? rowNotice : null}
              onSelect={() => setSelectedUserId(u.id)}
              onAsk={(decision, label) => setPending({ user: u, decision, label })}
              onToggleActive={() => setPending({ user: u, decision: 'toggle_active', label: u.is_active ? 'Deactivate user' : 'Reactivate user' })}
            />
          ))}
        </ul>
      )}

      {pending && (
        <ConfirmDialog
          pending={pending}
          busy={busyId === pending.user.id}
          onCancel={() => setPending(null)}
          onConfirm={() =>
            pending.decision === 'toggle_active'
              ? toggleActive(pending.user)
              : runDecision(pending.user, pending.decision)
          }
        />
      )}

      {selectedUser && (
        <UserDetailDrawer
          user={selectedUser}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </section>
  )
}

/* ============ Row ============ */

function UserRow({ user, isSelf, busy, rowError, rowNotice, onSelect, onAsk, onToggleActive }) {
  const bucket = bucketFor(user)
  const initials = computeInitials(user.full_name)
  const joined = formatJoined(user.created_at)

  const actions = applicableActions(user, bucket, isSelf)

  // Person area is keyboard-accessible: Enter or Space opens the drawer.
  // Kept as a div with role=button so the existing CSS layout does not
  // collide with native button styling.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect()
    }
  }

  return (
    <li className={'admin-users__row' + (user.is_active ? '' : ' admin-users__row--inactive')}>
      <div
        className="admin-users__person admin-users__person--clickable"
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        aria-label={`View details for ${user.full_name || user.email}`}
      >
        <div className="admin-users__avatar" aria-hidden="true">
          {user.photo_url
            ? <img src={user.photo_url} alt="" className="admin-users__avatar-img" />
            : <span className="admin-users__avatar-initials">{initials}</span>}
        </div>
        <div className="admin-users__id">
          <p className="admin-users__name">
            {user.full_name}
            {isSelf && <span className="admin-users__self-tag">you</span>}
          </p>
          <p className="admin-users__email">{user.email}</p>
        </div>
      </div>

      <div className="admin-users__meta">
        <div className="admin-users__pills" aria-label="Roles and flags">
          {user.roles.length === 0 && (
            <span className="admin-users__pill admin-users__pill--ghost">No role</span>
          )}
          {user.roles.includes('admin')  && <span className="admin-users__pill admin-users__pill--admin">Admin</span>}
          {user.roles.includes('mentor') && <span className="admin-users__pill admin-users__pill--mentor">Mentor</span>}
          {user.roles.includes('mentee') && <span className="admin-users__pill admin-users__pill--mentee">Mentee</span>}
          {bucket === 'pending' && (
            <span className="admin-users__pill admin-users__pill--pending">
              {user.role_undecided ? 'Undecided' : 'Wants mentor'}
            </span>
          )}
          {!user.onboarded && (
            <span className="admin-users__pill admin-users__pill--soft">Not onboarded</span>
          )}
          {user.email_verified === false && (
            <span className="admin-users__pill admin-users__pill--soft">Email unverified</span>
          )}
          {!user.is_active && (
            <span className="admin-users__pill admin-users__pill--off">Deactivated</span>
          )}
        </div>
        <p className="admin-users__joined">Joined {joined}</p>
      </div>

      <div className="admin-users__actions">
        {actions.map((a) => (
          <button
            key={a.decision}
            type="button"
            className={'admin-users__btn admin-users__btn--' + a.tone}
            onClick={() => a.decision === 'toggle_active' ? onToggleActive() : onAsk(a.decision, a.label)}
            disabled={busy}
          >
            {a.label}
          </button>
        ))}
      </div>

      {rowError && (
        <p className="admin-users__row-error" role="alert">{rowError}</p>
      )}
      {rowNotice && rowNotice.message && (
        <p
          className={'admin-users__row-notice admin-users__row-notice--' + rowNotice.tone}
          role="status"
        >
          {rowNotice.message}
        </p>
      )}
    </li>
  )
}

/* ============ Confirmation dialog ============ */

function ConfirmDialog({ pending, busy, onCancel, onConfirm }) {
  const { user, decision, label } = pending
  const body = confirmBody(decision, user)
  const warning = confirmWarning(decision, user)

  return (
    <div className="admin-users__overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="admin-users__dialog">
        <h2 className="admin-users__dialog-title" id="confirm-title">{label}</h2>
        <p className="admin-users__dialog-body">{body}</p>
        {warning && (
          <p className="admin-users__dialog-warning" role="note">{warning}</p>
        )}
        <div className="admin-users__dialog-actions">
          <button
            type="button"
            className="admin-users__btn admin-users__btn--ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className={'admin-users__btn admin-users__btn--' + (isDestructive(decision) ? 'danger' : 'primary')}
            onClick={onConfirm}
            disabled={busy}
            autoFocus
          >
            {busy ? 'Working' : confirmCta(decision, user)}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============ Empty state ============ */

function EmptyState({ filter, query }) {
  const f = FILTERS.find((x) => x.key === filter)?.label ?? ''
  return (
    <div className="admin-users__empty">
      <p className="admin-users__empty-title">
        {query
          ? `No users match "${query}"`
          : `No users in ${f}`}
      </p>
      <p className="admin-users__empty-sub">
        {query
          ? 'Try a different name or email.'
          : 'They will appear here when they sign up or change state.'}
      </p>
    </div>
  )
}

/* ============ Helpers ============ */

const DAY_MS = 24 * 60 * 60 * 1000

function countByBucket(users) {
  const c = {
    all: users.length,
    pending: 0, mentor: 0, mentee: 0, admin: 0, deactivated: 0,
    onboarding_stalled: 0,
    unverified: 0,
    unpaired: 0
  }

  const now = Date.now()
  for (const u of users) {
    const b = bucketFor(u)
    c[b] = (c[b] || 0) + 1

    if (!u.is_active) continue
    const ageMs = u.created_at ? (now - new Date(u.created_at).getTime()) : 0

    if (!u.onboarded                    && ageMs > 2  * DAY_MS) c.onboarding_stalled++
    if (u.email_verified === false      && ageMs > 3  * DAY_MS) c.unverified++
    if (b === 'mentee' && u.onboarded   && ageMs > 30 * DAY_MS) c.unpaired++
  }
  return c
}

function filterUsers(users, filter, query) {
  const q = query.trim().toLowerCase()
  let list = users

  if (filter !== 'all') list = list.filter((u) => matchesFilter(u, filter))

  if (q) list = list.filter((u) =>
    (u.full_name || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q)
  )
  return list
}

// Note: `unpaired` is approximate because useAdminUsers does not yet expose
// active-pairing membership. Tighten when the hook joins pairing data.
function matchesFilter(user, filter) {
  if (['pending', 'mentor', 'mentee', 'admin', 'deactivated'].includes(filter)) {
    return bucketFor(user) === filter
  }

  if (!user.is_active) return false
  const ageMs = user.created_at ? (Date.now() - new Date(user.created_at).getTime()) : 0

  switch (filter) {
    case 'onboarding_stalled':
      return !user.onboarded && ageMs > 2 * DAY_MS
    case 'unverified':
      return user.email_verified === false && ageMs > 3 * DAY_MS
    case 'unpaired':
      return bucketFor(user) === 'mentee' && user.onboarded && ageMs > 30 * DAY_MS
    default:
      return false
  }
}

function applicableActions(user, bucket, isSelf) {
  const actions = []
  const isMentor = user.roles.includes('mentor')

  if (!user.is_active) {
    actions.push({ decision: 'toggle_active', label: 'Reactivate', tone: 'secondary' })
    return actions
  }

  if (bucket === 'pending') {
    if (user.role_intent === 'mentor') {
      actions.push({ decision: 'approve_mentor', label: 'Approve as mentor', tone: 'primary' })
      actions.push({ decision: 'confirm_mentee', label: 'Make mentee instead', tone: 'secondary' })
    } else {
      actions.push({ decision: 'approve_mentor', label: 'Make mentor', tone: 'secondary' })
      actions.push({ decision: 'confirm_mentee', label: 'Make mentee', tone: 'secondary' })
    }
  } else if (isMentor) {
    actions.push({ decision: 'revoke_mentor', label: 'Demote', tone: 'secondary' })
  } else if (bucket === 'mentee') {
    actions.push({ decision: 'approve_mentor', label: 'Promote to mentor', tone: 'secondary' })
  }

  if (!isSelf) {
    actions.push({ decision: 'toggle_active', label: 'Deactivate', tone: 'ghost-danger' })
  }

  return actions
}

function confirmBody(decision, user) {
  const name = user.full_name || user.email
  switch (decision) {
    case 'approve_mentor':
      if (user.role_undecided) {
        return `${name} did not pick a role at sign-up. They will become a mentor and can be paired as a mentor from the Pairings page.`
      }
      return `${name} will become a mentor. They can be paired as a mentor from the Pairings page.`
    case 'confirm_mentee':
      if (user.role_intent === 'mentor') {
        return `${name} requested to be a mentor. The request will be declined and they will be confirmed as a mentee.`
      }
      if (user.role_undecided) {
        return `${name} did not pick a role at sign-up. They will be confirmed as a mentee.`
      }
      return `${name} will be confirmed as a mentee.`
    case 'revoke_mentor':
      return `${name} will lose the mentor role and return to being a mentee. Any active pairings they own will need to be reassigned from the Pairings page.`
    case 'toggle_active':
      return user.is_active
        ? `${name} will not be able to sign in. Their history stays intact and you can reactivate them later.`
        : `${name} will be able to sign in again. They keep all their history and role assignments.`
    default:
      return ''
  }
}

function confirmWarning(decision, user) {
  if (decision === 'approve_mentor' && user.email_verified === false) {
    return 'Heads up: their email has not been verified. Pairing notifications will not reach them until they verify, even if you grant the mentor role now.'
  }
  return null
}

function confirmCta(decision, user) {
  switch (decision) {
    case 'approve_mentor':
      if (user?.role_undecided) return 'Make mentor'
      if (user?.roles?.includes('mentee') && !user.role_undecided && user.role_intent !== 'mentor') return 'Promote'
      return 'Approve'
    case 'confirm_mentee':
      if (user?.role_intent === 'mentor') return 'Make mentee'
      if (user?.role_undecided) return 'Make mentee'
      return 'Confirm'
    case 'revoke_mentor':  return 'Demote'
    case 'toggle_active':  return 'Continue'
    default:               return 'Continue'
  }
}

function isDestructive(decision) {
  return decision === 'revoke_mentor' || decision === 'toggle_active'
}

function computeInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last  = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

function formatJoined(iso) {
  if (!iso) return 'recently'
  try {
    const d = new Date(iso)
    const diffMs = Date.now() - d.getTime()
    const day = 24 * 60 * 60 * 1000
    if (diffMs < day) return 'today'
    if (diffMs < 7 * day)  return `${Math.floor(diffMs / day)}d ago`
    if (diffMs < 30 * day) return `${Math.floor(diffMs / (7 * day))}w ago`
    return new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' }).format(d)
  } catch {
    return 'recently'
  }
}

function noticeFromEmailResult(result, user, decision) {
  const name = user.full_name || user.email || 'The user'
  const verb = decisionPastVerb(decision)
  if (result.sent) {
    return `${verb}. ${name} has been notified by email.`
  }
  if (result.reason === 'unverified') {
    return `${verb}. ${name} has not been notified because their email is not yet verified.`
  }
  return `${verb}. The notification email could not be sent. You can retry later.`
}

function decisionPastVerb(decision) {
  switch (decision) {
    case 'approve_mentor': return 'Mentor role granted'
    case 'confirm_mentee': return 'Mentee role confirmed'
    case 'revoke_mentor':  return 'Mentor role removed'
    default:               return 'Done'
  }
}

function friendly(err) {
  const msg = (err?.message || '').toLowerCase()
  if (msg.includes('admin only'))    return 'Only an admin can do this.'
  if (msg.includes('user not found')) return 'That user no longer exists.'
  if (msg.includes('unknown decision')) return 'Unsupported action.'
  return err?.message || 'Something went wrong. Try again.'
}

function SearchIcon() {
  return (
    <svg
      className="admin-users__search-icon"
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}
