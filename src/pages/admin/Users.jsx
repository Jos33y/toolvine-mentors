import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import { useAdminUsers } from '@/hooks/useAdminUsers'
import { applyRoleDecision, sendRoleDecisionEmail, decisionSendsEmail, setUserActive, bucketFor, reminderStateFor, sendReminderNow, reminderFailureMessage } from '@/lib/adminUsers'
import { UserDetailDrawer } from '@/components/admin/UserDetailDrawer/UserDetailDrawer'
import { Icon } from '@/components/shared/Icon/Icon'
import { toCsv, downloadCsv, csvFilename, isoDate } from '@/lib/csv'
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
  { key: 'unpaired',           label: 'Unpaired (30d+)' },
  { key: 'needs_a_call',       label: 'Needs a call' }
]

const DEFAULT_FILTER = 'pending'

// Fifty rows at roughly 56px is a screen and a half of scroll, which is about
// as far as anybody reads before reaching for a filter.
const PAGE_SIZE = 50

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

  const [query, setQuery] = useState('')
  const [page, setPage]   = useState(1)
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

  // Counted off the role array, not counts.admin. bucketFor puts deactivated
  // above admin, and a deactivated admin carries a banned_until stamp and
  // cannot sign in, so neither number would answer "how many admins can
  // actually reach the console".
  const activeAdminCount = useMemo(
    () => users.filter((u) => u.is_active && u.roles?.includes('admin')).length,
    [users]
  )

  const counts = useMemo(() => countByBucket(users), [users])
  const filtered = useMemo(
    () => filterUsers(users, filter, query),
    [users, filter, query]
  )

  // Paged client-side. fetchAdminUsers reads every profile in one query and
  // filterUsers runs in the browser, so the page is a slice of what is already
  // here. No server change, and Download CSV still exports the whole filtered
  // set rather than the visible page.
  const pageCount   = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage    = Math.min(page, pageCount)
  const pageRows    = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const firstOnPage = (safePage - 1) * PAGE_SIZE + 1
  const lastOnPage  = Math.min(safePage * PAGE_SIZE, filtered.length)

  // Narrowing the list while on page four would otherwise leave an empty page.
  useEffect(() => { setPage(1) }, [filter, query])

  async function runDecision(user, decision) {
    setBusyId(user.id)
    setRowError({ id: null, message: '' })
    setRowNotice({ id: null, message: '', tone: 'info' })
    try {
      const next = await applyRoleDecision(user.id, decision, user.full_name)
      if (next) {
        patchUser(user.id, {
          roles:          next.roles || [],
          role_intent:    next.role_intent,
          role_undecided: next.role_undecided,
          is_active:      next.is_active
        })
      }

      // Admin decisions are not emailed. Reporting on a send that was never
      // attempted would read as a delivery failure.
      if (!decisionSendsEmail(decision)) {
        setRowNotice({
          id:      user.id,
          message: `${decisionPastVerb(decision)}. No email is sent for this change.`,
          tone:    'success'
        })
        return
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

  // No confirm dialog. Sending somebody a reminder is not a destructive act,
  // and the row reports what happened either way.
  async function remind(user, kind) {
    setBusyId(user.id)
    setRowError({ id: null, message: '' })
    setRowNotice({ id: null, message: '', tone: 'info' })
    try {
      const result = await sendReminderNow(user.id, kind)
      if (result.sent > 0) {
        // Patched rather than waited for. The realtime echo on profiles will
        // confirm it a moment later.
        const isVerification = kind === 'verification'
        patchUser(user.id, isVerification
          ? {
              verification_reminder_count:   (user.verification_reminder_count ?? 0) + 1,
              verification_last_reminder_at: new Date().toISOString()
            }
          : {
              onboarding_reminder_count:   (user.onboarding_reminder_count ?? 0) + 1,
              onboarding_last_reminder_at: new Date().toISOString()
            })
        setRowNotice({ id: user.id, message: `Reminder sent to ${user.email}.`, tone: 'success' })
      } else {
        setRowNotice({
          id: user.id,
          message: reminderFailureMessage(result.reason),
          tone: 'warn'
        })
      }
    } catch (e) {
      setRowError({ id: user.id, message: friendly(e) })
    } finally {
      setBusyId(null)
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

  // Exports what is on screen, not the whole table. filterUsers and the search
  // both run client-side over the full fetch, so the filtered array is the
  // honest set: an admin who has narrowed to "Mentors" gets mentors.
  function exportCsv() {
    const label = FILTERS.find((f) => f.key === filter)?.label ?? filter
    downloadCsv(
      csvFilename('toolvine-members', label, query || null),
      toCsv(MEMBER_COLUMNS, filtered)
    )
  }

  return (
    <section className="admin-users">
      <header className="admin-users__head">
        <p className="admin-users__eyebrow">Admin</p>
        <h1 className="admin-users__title">Users</h1>
        <p className="admin-users__lede">
          Approve mentor sign-ups, demote, deactivate, or confirm a mentee.
          Open a member to grant or remove admin access.
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

      <div className="admin-users__toolbar">
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

        {filtered.length > 0 && (
          <button
            type="button"
            className="admin-users__btn admin-users__btn--secondary admin-users__export"
            onClick={exportCsv}
          >
            <Icon name="download" size={16} />
            <span>Download CSV</span>
            <span className="admin-users__export-count">{filtered.length}</span>
          </button>
        )}
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
        <>
          <ul className="admin-users__list">
            {pageRows.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                isSelf={u.id === me?.id}
                busy={busyId === u.id}
                rowError={rowError.id === u.id ? rowError.message : ''}
                rowNotice={rowNotice.id === u.id ? rowNotice : null}
                onSelect={() => setSelectedUserId(u.id)}
                onAct={(decision) =>
                  decision === 'toggle_active' ? toggleActive(u) : runDecision(u, decision)
                }
              />
            ))}
          </ul>

          {pageCount > 1 && (
            <nav className="admin-users__pager" aria-label="Pages">
              <button
                type="button"
                className="admin-users__btn admin-users__btn--secondary"
                onClick={() => setPage(safePage - 1)}
                disabled={safePage === 1}
              >
                Previous
              </button>
              <p className="admin-users__pager-count">
                {firstOnPage} to {lastOnPage} of {filtered.length}
              </p>
              <button
                type="button"
                className="admin-users__btn admin-users__btn--secondary"
                onClick={() => setPage(safePage + 1)}
                disabled={safePage === pageCount}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}

      {selectedUser && (
        <UserDetailDrawer
          user={selectedUser}
          isSelf={selectedUser.id === me?.id}
          activeAdminCount={activeAdminCount}
          busy={busyId === selectedUser.id}
          error={rowError.id === selectedUser.id ? rowError.message : ''}
          notice={rowNotice.id === selectedUser.id ? rowNotice : null}
          actions={drawerActions(selectedUser, bucketFor(selectedUser), selectedUser.id === me?.id)}
          reminder={reminderStateFor(selectedUser)}
          onDecision={(decision) =>
            decision === 'toggle_active' ? toggleActive(selectedUser) : runDecision(selectedUser, decision)
          }
          onRemind={(kind) => remind(selectedUser, kind)}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </section>
  )
}

/* ============ Reminder chip ============ */

// Four columns have held this since 0010 and nothing ever showed it. An admin
// could not see who had been chased, how often, or when.
// Was a sentence in the row: "Verification reminder 3 of 3 · last 2 days ago ·
// email is not reaching them". Fifty of those is a page of paragraphs, and the
// last clause said something the platform could not know anyway. The count is
// the chip, the account of it is in the drawer, and "Needs a call" is already
// a filter at the top of the page.
function ReminderChip({ state }) {
  const kind = state.kind === 'verification' ? 'V' : 'O'
  const title = `${state.kind === 'verification' ? 'Verification' : 'Onboarding'} reminders: ${state.sent} of 3`

  return (
    <span
      className={'admin-users__chip' + (state.exhausted ? ' admin-users__chip--spent' : '')}
      title={title}
    >
      <span className="admin-users__chip-kind" aria-hidden="true">{kind}</span>
      <span className="admin-users__chip-count">{state.sent}/3</span>
      <span className="tv-sr-only">{title}</span>
    </span>
  )
}

function relativeDays(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

/* ============ Row ============ */

function UserRow({ user, isSelf, busy, rowError, rowNotice, onSelect, onAct }) {
  const bucket   = bucketFor(user)
  const reminder = reminderStateFor(user)
  const initials = computeInitials(user.full_name)
  const primary  = primaryAction(user, bucket)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect()
    }
  }

  return (
    <li className={'admin-users__row' + (user.is_active ? '' : ' admin-users__row--inactive')}>
      {/* The whole line opens the drawer. The action button sits inside it, so
          its click has to stop there or every approval would also open a
          drawer over the result. */}
      <div
        className="admin-users__line"
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={handleKeyDown}
        aria-label={`Open ${user.full_name || user.email}`}
      >
        <div className="admin-users__avatar" aria-hidden="true">
          {user.photo_url
            ? <img src={user.photo_url} alt="" className="admin-users__avatar-img" />
            : <span className="admin-users__avatar-initials">{initials}</span>}
        </div>

        <div className="admin-users__id">
          <p className="admin-users__name">
            {user.full_name || user.email}
            {isSelf && <span className="admin-users__self-tag">you</span>}
          </p>
          <p className="admin-users__email">{user.email}</p>
        </div>

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
            <span className="admin-users__pill admin-users__pill--soft">Unverified</span>
          )}
          {!user.is_active && (
            <span className="admin-users__pill admin-users__pill--off">Deactivated</span>
          )}
        </div>

        <div className="admin-users__slot">
          {reminder && reminder.sent > 0 && <ReminderChip state={reminder} />}
        </div>

        <div className="admin-users__slot admin-users__slot--action">
          {primary && (
            <button
              type="button"
              className={'admin-users__btn admin-users__btn--' + primary.tone}
              onClick={(e) => { e.stopPropagation(); onAct(primary.decision) }}
              disabled={busy}
            >
              {busy ? 'Working' : primary.label}
            </button>
          )}
        </div>
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

// Export columns. Order follows what the row shows before widening into the
// fields only the drawer surfaces.
//
// whatsapp_phone is included deliberately. The immediate use for this file is
// getting the twenty-five mentors' numbers into one place to invite them, and
// a members export without contact details does not do the job it exists for.
// An admin already reads that column on screen. Note that the file leaves the
// platform, so it is worth saying so when handing the button over.
const MEMBER_COLUMNS = [
  { label: 'Name',                   value: (u) => u.full_name || '' },
  { label: 'Email',                  value: (u) => u.email || '' },
  { label: 'WhatsApp',               value: (u) => u.whatsapp_phone || '' },
  { label: 'Roles',                  value: (u) => (u.roles || []).join(' ') },
  { label: 'Group',                  value: (u) => bucketFor(u) },
  { label: 'Status',                 value: (u) => (u.is_active ? 'Active' : 'Deactivated') },
  { label: 'Email verified',         value: (u) => yesNo(u.email_verified) },
  { label: 'Onboarded',              value: (u) => yesNo(u.onboarded) },
  { label: 'Role intent',            value: (u) => (u.role_undecided ? 'Undecided' : (u.role_intent || '')) },
  { label: 'Country',                value: (u) => u.country || '' },
  { label: 'Location',               value: (u) => u.location || '' },
  { label: 'Monthly hours',          value: (u) => u.monthly_hours ?? '' },
  { label: 'Joined',                 value: (u) => isoDate(u.created_at) },
  { label: 'Verification reminders', value: (u) => u.verification_reminder_count ?? 0 },
  { label: 'Onboarding reminders',   value: (u) => u.onboarding_reminder_count ?? 0 }
]

function yesNo(v) {
  if (v === true)  return 'Yes'
  if (v === false) return 'No'
  return ''
}

const DAY_MS = 24 * 60 * 60 * 1000

function countByBucket(users) {
  const c = {
    all: users.length,
    pending: 0, mentor: 0, mentee: 0, admin: 0, deactivated: 0,
    onboarding_stalled: 0,
    unverified: 0,
    unpaired: 0,
    needs_a_call: 0
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

    // Three reminders sent and still stalled. Email has stopped working on
    // this person and somebody should pick up a phone.
    if (reminderStateFor(u)?.exhausted) c.needs_a_call++
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
    case 'needs_a_call':
      return Boolean(reminderStateFor(user)?.exhausted)
    default:
      return false
  }
}

// Split in two. The primary is the funnel step an admin repeats down a filtered
// list, so it stays under the thumb and fires without a modal: approving a
// mentor is reversible by demoting them, and the UX principles say confirm only
// what deserves it.
//
// Everything consequential moved into the drawer, behind an inline two-step.
// Demote and Deactivate used to sit one stray click from Approve.
function primaryAction(user, bucket) {
  if (!user.is_active) return { decision: 'toggle_active', label: 'Reactivate', tone: 'secondary' }

  if (bucket === 'pending') {
    return user.role_intent === 'mentor'
      ? { decision: 'approve_mentor', label: 'Approve as mentor', tone: 'primary' }
      : { decision: 'confirm_mentee', label: 'Confirm as mentee',  tone: 'secondary' }
  }
  return null
}

function drawerActions(user, bucket, isSelf) {
  const actions = []
  if (!user.is_active) return actions

  const isMentor = user.roles.includes('mentor')

  if (bucket === 'pending') {
    actions.push(user.role_intent === 'mentor'
      ? { decision: 'confirm_mentee', label: 'Make mentee instead', tone: 'ghost' }
      : { decision: 'approve_mentor', label: 'Make mentor',         tone: 'ghost' })
  } else if (isMentor) {
    actions.push({ decision: 'revoke_mentor', label: 'Demote to mentee', tone: 'ghost' })
  } else if (bucket === 'mentee') {
    actions.push({ decision: 'approve_mentor', label: 'Promote to mentor', tone: 'ghost' })
  }

  if (!isSelf) {
    actions.push({ decision: 'toggle_active', label: 'Deactivate', tone: 'ghost-danger' })
  }
  return actions
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
    case 'grant_admin':    return 'Admin access granted'
    case 'revoke_admin':   return 'Admin access removed'
    default:               return 'Done'
  }
}

function friendly(err) {
  const msg = (err?.message || '').toLowerCase()
  if (msg.includes('admin only'))    return 'Only an admin can do this.'
  if (msg.includes('user not found')) return 'That user no longer exists.'
  if (msg.includes('your own admin role')) return 'You cannot remove your own admin access. Another admin has to do it for you.'
  if (msg.includes('last admin'))    return 'This is the only active admin. Grant admin to somebody else first.'
  if (msg.includes('deactivated account')) return 'Reactivate this account before granting admin access.'
  if (msg.includes('unverified email'))    return 'They have to confirm their email address before they can be an admin.'
  if (msg.includes('before onboarding'))   return 'They have to finish onboarding before they can be an admin.'
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
