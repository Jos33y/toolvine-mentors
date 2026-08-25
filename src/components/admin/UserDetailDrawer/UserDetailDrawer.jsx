import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAdminUserNotes } from '@/hooks/useAdminUserNotes'
import { useUserEmailEvents } from '@/hooks/useUserEmailEvents'
import { useCategories } from '@/hooks/useCategories'
import { bucketFor } from '@/lib/adminUsers'
import './userDetailDrawer.css'

// Side drawer for user details on /users. Slides in from the right on
// desktop, from the bottom on mobile. Holds the admin access panel and the
// AdminNoteEditor; future panels (pairing history, sessions, email log) slot
// in below without changing this contract.
//
// Portaled to document.body so `position: fixed` is always viewport-relative,
// regardless of whether some ancestor in /users carries a transform / filter
// / backdrop-filter that would otherwise re-anchor the fixed positioning.
//
// The role-change props are optional. Without onDecision the admin panel is
// absent, so the drawer stays usable anywhere the caller has no mutation.
export function UserDetailDrawer({
  user,
  onClose,
  isSelf = false,
  activeAdminCount = 0,
  busy = false,
  error = '',
  notice = null,
  actions = [],
  reminder = null,
  onDecision = null,
  onRemind = null
}) {
  const [open, setOpen] = useState(false)
  const drawerRef = useRef(null)

  // Run-after-mount transition: drawer mounts in its closed state, then a
  // single RAF flips the open class so the slide-in animates cleanly.
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Reset internal scroll on mount and on user change. Without this, the
  // drawer can open already-scrolled (header pushed off-screen) when the
  // page below was scrolled before the click.
  useEffect(() => {
    if (drawerRef.current) drawerRef.current.scrollTop = 0
  }, [user?.id])

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Escape closes.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Matches --tv-duration-slow so the slide-out finishes before unmount.
  const handleClose = () => {
    setOpen(false)
    setTimeout(onClose, 260)
  }

  if (!user) return null

  const name = user.full_name || user.email || 'User'

  return createPortal(
    <>
      <button
        type="button"
        className={`udd__backdrop ${open ? 'udd__backdrop--open' : ''}`}
        onClick={handleClose}
        aria-label="Close detail panel"
      />

      <aside
        ref={drawerRef}
        className={`udd ${open ? 'udd--open' : ''}`}
        aria-label={`Details for ${name}`}
        role="dialog"
        aria-modal="true"
      >
        <header className="udd__head">
          <div className="udd__person">
            <div className="udd__avatar" aria-hidden="true">
              {user.photo_url
                ? <img src={user.photo_url} alt="" className="udd__avatar-img" />
                : <span className="udd__avatar-initials">{initials(user.full_name)}</span>}
            </div>
            <div className="udd__id">
              <h2 className="udd__name">{name}</h2>
              {user.email && <p className="udd__email">{user.email}</p>}
            </div>
          </div>
          <button
            type="button"
            className="udd__close"
            onClick={handleClose}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="udd__pills" aria-label="Roles and flags">
          {user.roles?.includes('admin')  && <span className="udd__pill udd__pill--admin">Admin</span>}
          {user.roles?.includes('mentor') && <span className="udd__pill udd__pill--mentor">Mentor</span>}
          {user.roles?.includes('mentee') && <span className="udd__pill udd__pill--mentee">Mentee</span>}
          {!user.is_active                && <span className="udd__pill udd__pill--off">Deactivated</span>}
          {!user.onboarded                && <span className="udd__pill udd__pill--soft">Not onboarded</span>}
          {user.email_verified === false  && <span className="udd__pill udd__pill--soft">Email unverified</span>}
        </div>

        <Details user={user} />

        <Focus user={user} />

        <Delivery user={user} />

        {reminder && onRemind && (
          <Reminders user={user} reminder={reminder} busy={busy} onRemind={onRemind} />
        )}

        {onDecision && actions.length > 0 && (
          <RoleActions
            user={user}
            actions={actions}
            busy={busy}
            onDecision={onDecision}
          />
        )}

        {onDecision && (
          <AdminAccess
            user={user}
            isSelf={isSelf}
            activeAdminCount={activeAdminCount}
            busy={busy}
            error={error}
            notice={notice}
            onDecision={onDecision}
          />
        )}

        <AdminNoteEditor user={user} />
      </aside>
    </>,
    document.body
  )
}

// ============ Details ============

// Everything fetchAdminUsers already selects and nothing rendered. It used to
// be spread across the row as prose, which is what made a list of eight people
// two thousand pixels tall.
function Details({ user }) {
  // role_intent is what somebody asked for at sign-up. Once an admin has
  // decided, it is history rather than status, and showing "wants to be
  // mentor" against an approved mentor reads as an open question that is not
  // open. It stays only while they are still in the pending bucket, which is
  // the one place it is the whole point.
  const undecided = bucketFor(user) === 'pending'

  const rows = [
    ['Joined',        longDate(user.created_at)],
    ['WhatsApp',      user.whatsapp_phone],
    ['Other phone',   user.other_phone],
    ['Country',       user.country],
    ['Location',      user.location],
    ['Timezone',      user.timezone],
    ['Hours a month', user.monthly_hours],
    ['Heard about us', user.referral_source],
    ['Email',         user.email_verified === false ? 'Not confirmed' : 'Confirmed'],
    ['Onboarding',    user.onboarded ? 'Complete' : 'Not finished'],
    undecided ? ['Asked to be', user.role_undecided ? 'Undecided' : user.role_intent] : null
  ].filter(Boolean).filter(([, value]) => value !== null && value !== undefined && value !== '')

  const socials = socialLinks(user.socials)

  if (rows.length === 0 && socials.length === 0) return null

  return (
    <section className="udd__details">
      <p className="udd__section-eyebrow">Details</p>
      <dl className="udd__detail-list">
        {rows.map(([label, value]) => (
          <div key={label} className="udd__detail">
            <dt className="udd__detail-label">{label}</dt>
            <dd className="udd__detail-value">{value}</dd>
          </div>
        ))}
      </dl>

      {socials.length > 0 && (
        <div className="udd__socials">
          {socials.map(({ label, href, text }) => (
            href
              ? <a key={label} className="udd__social" href={href} target="_blank" rel="noreferrer">{label}</a>
              : <span key={label} className="udd__social udd__social--flat">{label}: {text}</span>
          ))}
        </div>
      )}
    </section>
  )
}

// socials is a jsonb bag written at onboarding: instagram, facebook, linkedin,
// other. Handles are stored as typed, so a bare handle gets a URL and anything
// already a link is left alone.
function socialLinks(socials) {
  if (!socials || typeof socials !== 'object') return []

  const bases = {
    instagram: 'https://instagram.com/',
    facebook:  'https://facebook.com/',
    linkedin:  'https://linkedin.com/in/'
  }

  return Object.entries(socials)
    .filter(([, value]) => typeof value === 'string' && value.trim() !== '')
    .map(([key, value]) => {
      const text  = value.trim()
      const label = key.charAt(0).toUpperCase() + key.slice(1)

      if (/^https?:\/\//i.test(text)) return { label, href: text, text }
      if (bases[key]) return { label, href: bases[key] + text.replace(/^@/, ''), text }
      return { label, href: null, text }
    })
}

// ============ Focus ============

// What somebody offers to mentor in, or wants mentoring in. Collected at
// onboarding, stored in user_focus, and read by nothing until now. It is the
// signal a pairing is actually made on, so it belongs on the surface where
// pairings get decided.
function Focus({ user }) {
  const { allCategories } = useCategories()

  const focus = user.focus ?? []
  if (focus.length === 0) return null

  const label = (id) => allCategories.find((c) => c.id === id)?.label ?? 'Unknown category'

  const groups = [
    ['Offers to mentor in', focus.filter((f) => f.kind === 'offering')],
    ['Wants mentoring in',  focus.filter((f) => f.kind === 'seeking')]
  ].filter(([, list]) => list.length > 0)

  return (
    <section className="udd__focus">
      <p className="udd__section-eyebrow">Focus</p>
      {groups.map(([heading, list]) => (
        <div key={heading} className="udd__focus-group">
          <p className="udd__focus-heading">{heading}</p>
          <ul className="udd__focus-list">
            {list.map((f) => (
              <li key={f.categoryId} className="udd__focus-item">{label(f.categoryId)}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}

// ============ Delivery ============

// What actually happened to the email we sent. The members page spent a week
// asserting "email is not reaching them" with no way to know, and this is the
// table that answers it.
function Delivery({ user }) {
  const { events, loading, error } = useUserEmailEvents(user.id)

  if (loading) {
    return (
      <section className="udd__delivery">
        <p className="udd__section-eyebrow">Email delivery</p>
        <p className="udd__section-helper">Checking...</p>
      </section>
    )
  }

  if (error) return null

  // One row per email, not per event. A send that arrives writes both sent and
  // delivered, so the raw list showed each message twice and read as twice the
  // traffic.
  const sends = groupBySend(events)

  const delivered = sends.filter((m) => m.state === 'delivered' || m.state === 'opened').length
  const opened    = sends.filter((m) => m.state === 'opened').length
  const failed    = sends.filter((m) => m.tone === 'bad')

  return (
    <section className="udd__delivery">
      <p className="udd__section-eyebrow">Email delivery</p>
      <h3 className="udd__section-title">{verdict(sends, delivered, opened, failed)}</h3>
      <p className="udd__section-helper">
        {sends.length === 0
          ? 'Tracked since 24 August.'
          : `${delivered} of ${sends.length} delivered, ${opened === 0 ? 'none' : opened} opened.`}
      </p>

      {sends.length > 0 && (
        <ul className="udd__events">
          {sends.slice(0, 5).map((m) => (
            <li key={m.id} className="udd__event">
              <span className={'udd__event-type udd__event-type--' + m.tone}>{m.label}</span>
              <time className="udd__event-time" dateTime={m.at}>{eventTime(m.at)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// Collapses every event for one message_id into the furthest state it reached.
// A failure outranks everything, since a message that bounced after being
// accepted is a failure whatever came first.
const STATE_RANK = { sent: 0, delivered: 1, clicked: 2, opened: 3, complained: 8, failed: 9, bounced: 9 }

function groupBySend(events) {
  const bySend = new Map()

  for (const e of events) {
    const key = e.message_id ?? e.id
    const rank = STATE_RANK[e.event_type] ?? 0
    const current = bySend.get(key)

    if (!current || rank > current.rank) {
      bySend.set(key, { rank, id: key, state: e.event_type, bounce: e.bounce_type, at: e.created_at })
    } else if (!current.at || e.created_at > current.at) {
      current.at = e.created_at
    }
  }

  return [...bySend.values()]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .map((m) => ({ ...m, label: labelFor(m), tone: toneFor(m.state) }))
}

function labelFor(m) {
  if (m.state === 'bounced') return m.bounce === 'hard' ? 'Rejected' : 'Bounced'
  if (m.state === 'complained') return 'Marked as spam'
  if (m.state === 'failed')    return 'Failed'
  if (m.state === 'opened')    return 'Opened'
  if (m.state === 'clicked')   return 'Clicked'
  if (m.state === 'delivered') return 'Delivered'
  return 'Sent'
}

// Two sends an hour apart both read "today", which tells an admin nothing about
// which is which. Same day shows the clock instead.
function eventTime(iso) {
  const then = new Date(iso)
  const days = Math.floor((Date.now() - then.getTime()) / 86400000)
  if (days <= 0) return then.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  if (days === 1) return 'Yesterday'
  if (days < 7)   return `${days} days ago`
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function verdict(sends, delivered, opened, failed) {
  if (sends.length === 0)   return 'No record yet'
  if (failed.length > 0)    return failed.some((m) => m.bounce === 'hard') ? 'Address rejecting mail' : 'Failing to arrive'
  if (opened > 0)           return 'Arrives and opened'
  if (delivered > 0)        return 'Arrives, not opened'
  return 'Sent, not confirmed'
}

function toneFor(type) {
  if (['bounced', 'complained', 'failed'].includes(type)) return 'bad'
  if (['delivered', 'opened', 'clicked'].includes(type)) return 'good'
  return 'plain'
}

function firstName(full) {
  if (!full) return ''
  const first = full.trim().split(/\s+/)[0]
  return first && !first.includes('@') ? first : ''
}

function longDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

function relativeDays(iso) {
  if (!iso) return null
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

// ============ Reminders ============

// The row carries a chip reading 3/3. This is where that number is explained,
// and it says what is known rather than what was guessed. Three sent and not
// acted on is a fact; "email is not reaching them" was never one, and with
// email_events now collecting delivery it will soon be answerable properly.
function Reminders({ user, reminder, busy, onRemind }) {
  const kind = reminder.kind === 'verification' ? 'confirm their email' : 'finish onboarding'
  const name = firstName(user.full_name) || 'They'

  return (
    <section className="udd__reminders">
      <p className="udd__section-eyebrow">Reminders</p>
      <h3 className="udd__section-title">
        {name} still needs to {kind}
      </h3>
      <p className="udd__section-helper">
        {reminder.sent === 0
          ? 'Nothing sent yet. The hourly job picks them up once the account is a day old.'
          : `${reminder.sent} of 3 sent, last ${relativeDays(reminder.last)}.` +
            (reminder.exhausted
              ? ' The automatic ones are spent, so anything further is by hand.'
              : '')}
      </p>

      <div className="udd__actions">
        <button
          type="button"
          className="udd__btn udd__btn--ghost"
          onClick={() => onRemind(reminder.kind)}
          disabled={busy}
        >
          {busy ? 'Sending' : reminder.sent > 0 ? 'Remind again' : 'Send a reminder'}
        </button>
      </div>
    </section>
  )
}

// ============ Role actions ============

// Demote and Deactivate used to sit inline, one stray click from Approve. They
// are here now, behind the same two-step the admin access panel uses, for the
// same reason: the page's ConfirmDialog is not portaled and this drawer is.
function RoleActions({ user, actions, busy, onDecision }) {
  const [confirming, setConfirming] = useState(null)
  const name = user.full_name || user.email || 'This user'

  useEffect(() => { setConfirming(null) }, [user.id, user.is_active])

  const chosen = actions.find((a) => a.decision === confirming)

  const run = async (decision) => {
    await onDecision(decision)
    setConfirming(null)
  }

  return (
    <section className="udd__roles">
      <p className="udd__section-eyebrow">Role</p>
      <h3 className="udd__section-title">What {firstName(name) || name} can do here</h3>

      {chosen ? (
        <div className="udd__confirm">
          <p className="udd__confirm-body">{roleConfirmCopy(chosen.decision, name)}</p>
          <div className="udd__actions">
            <button
              type="button"
              className="udd__btn udd__btn--ghost"
              onClick={() => setConfirming(null)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className={'udd__btn udd__btn--' + (chosen.tone === 'ghost-danger' ? 'danger' : 'primary')}
              onClick={() => run(chosen.decision)}
              disabled={busy}
              autoFocus
            >
              {busy ? 'Working' : chosen.label}
            </button>
          </div>
        </div>
      ) : (
        <div className="udd__actions">
          {actions.map((a) => (
            <button
              key={a.decision}
              type="button"
              className={'udd__btn udd__btn--' + (a.tone === 'ghost-danger' ? 'ghost-danger' : 'ghost')}
              onClick={() => setConfirming(a.decision)}
              disabled={busy}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function roleConfirmCopy(decision, name) {
  switch (decision) {
    case 'approve_mentor':
      return `${name} becomes a mentor and can be paired with mentees. Their mentee role is dropped.`
    case 'confirm_mentee':
      return `${name} is confirmed as a mentee and can be paired with a mentor.`
    case 'revoke_mentor':
      return `${name} goes back to being a mentee. Any pairing they hold as a mentor stays in the record.`
    case 'toggle_active':
      return `${name} keeps their history and cannot sign in. Any session they hold ends. This can be undone.`
    default:
      return `${name} will be updated.`
  }
}

// ============ Admin access ============

// Grant and revoke live in the drawer, not in the row. Every button in the row
// is a step in the recruitment funnel with one obvious next move. Admin is
// orthogonal and rare, and sitting it beside "Approve as mentor" puts the
// whole platform one misclick away. Opening the record first is the point.
//
// Confirmation is the inline two-step NoteCard already uses, not the page's
// ConfirmDialog. That dialog renders inside .admin-users unportaled while this
// drawer portals to body, so the two would stack unpredictably, and the
// drawer's window-level Escape handler would close it out from underneath.
function AdminAccess({ user, isSelf, activeAdminCount, busy, error, notice, onDecision }) {
  const [confirming, setConfirming] = useState(null)

  const name    = user.full_name || user.email || 'This user'
  const isAdmin = user.roles?.includes('admin') === true

  // Only counts when this person is themselves reachable. A deactivated admin
  // is not holding the platform open for anybody.
  const onlyActiveAdmin = isAdmin && user.is_active && activeAdminCount <= 1

  // Mirrors the three guards in admin_apply_role_decision. The server is the
  // gate; this only stops offering a button that would fail.
  const grantable = user.is_active && user.email_verified !== false && user.onboarded !== false

  const canGrant  = !isAdmin && grantable
  const canRevoke = isAdmin && !isSelf && !onlyActiveAdmin
  const blocked   = blockedReason({
    isAdmin,
    isSelf,
    onlyActiveAdmin,
    isActive:  user.is_active,
    verified:  user.email_verified !== false,
    onboarded: user.onboarded !== false
  })

  // Drop the half-finished confirm if the record changes underneath.
  useEffect(() => { setConfirming(null) }, [user.id, isAdmin])

  const run = async (decision) => {
    await onDecision(decision)
    setConfirming(null)
  }

  return (
    <section className="udd__access">
      <header className="udd__access-head">
        <p className="udd__access-eyebrow">Admin access</p>
        <h3 className="udd__access-title">
          {isAdmin
            ? `${name} can administer the platform`
            : `${name} is not an administrator`}
        </h3>
        <p className="udd__access-helper">
          There is one admin tier. Every admin holds every admin power,
          including granting admin to somebody else.
        </p>
      </header>

      {confirming ? (
        <div className="udd__access-confirm">
          <p className="udd__access-confirm-body">{confirmCopy(confirming, name)}</p>
          <p className="udd__access-note">
            No email is sent for this. Tell them yourself.
          </p>
          <div className="udd__access-actions">
            <button
              type="button"
              className="udd__btn udd__btn--ghost"
              onClick={() => setConfirming(null)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className={'udd__btn udd__btn--' + (confirming === 'grant_admin' ? 'primary' : 'danger')}
              onClick={() => run(confirming)}
              disabled={busy}
              autoFocus
            >
              {busy
                ? 'Working'
                : (confirming === 'grant_admin' ? 'Grant admin' : 'Remove admin')}
            </button>
          </div>
        </div>
      ) : blocked ? (
        <p className="udd__access-blocked">{blocked}</p>
      ) : (
        <div className="udd__access-actions">
          {canGrant && (
            <button
              type="button"
              className="udd__btn udd__btn--primary"
              onClick={() => setConfirming('grant_admin')}
              disabled={busy}
            >
              Grant admin
            </button>
          )}
          {canRevoke && (
            <button
              type="button"
              className="udd__btn udd__btn--ghost-danger"
              onClick={() => setConfirming('revoke_admin')}
              disabled={busy}
            >
              Remove admin
            </button>
          )}
        </div>
      )}

      {error
        ? <p className="udd__access-error" role="alert">{error}</p>
        : notice?.message
          ? <p className="udd__access-notice" role="status">{notice.message}</p>
          : null}
    </section>
  )
}

// Why no button is offered. A blank panel would read as a missing feature, so
// the reason is stated even though the control itself is absent.
function blockedReason({ isAdmin, isSelf, onlyActiveAdmin, isActive, verified, onboarded }) {
  if (onlyActiveAdmin) {
    return 'This is the only active admin. Grant admin to somebody else before removing it here, or nobody can reach the console.'
  }
  if (isAdmin && isSelf) {
    return 'You cannot remove your own admin access. Another admin has to do it for you.'
  }
  if (!isAdmin && !isActive) {
    return 'Reactivate this account before granting admin access.'
  }
  // Nobody has proved they hold that inbox, and an unfinished profile carries
  // no phone or country. Neither is a state to hand the platform to.
  if (!isAdmin && !verified) {
    return 'They have to confirm their email address before they can be an admin.'
  }
  if (!isAdmin && !onboarded) {
    return 'They have to finish onboarding before they can be an admin.'
  }
  return null
}

function confirmCopy(decision, name) {
  if (decision === 'grant_admin') {
    return `${name} will be able to manage every member, pairing, meeting and resource, and can grant admin to anybody else. There is no smaller share of it to give.`
  }
  return `${name} will lose the admin console. Their mentor or mentee role and all of their history stay exactly as they are.`
}

// ============ Note editor ============

function AdminNoteEditor({ user }) {
  const { notes, loading, error, saving, create, update, remove } =
    useAdminUserNotes(user.id, { targetLabel: user.full_name || user.email || null })

  const [draft, setDraft] = useState('')

  const handleSave = async () => {
    const body = draft.trim()
    if (!body) return
    await create(body)
    setDraft('')
  }

  const canSubmit = draft.trim().length > 0 && !saving

  return (
    <section className="udd__notes">
      <header className="udd__notes-head">
        <p className="udd__notes-eyebrow">Admin notes</p>
        <h3 className="udd__notes-title">Private notes about this user</h3>
        <p className="udd__notes-helper">
          Only admins can see these. The user is never shown what is written here.
        </p>
      </header>

      <div className="udd__notes-new">
        <textarea
          className="udd__notes-textarea"
          placeholder="Add a note..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          disabled={saving}
        />
        <div className="udd__notes-new-actions">
          <button
            type="button"
            className="udd__btn udd__btn--primary"
            onClick={handleSave}
            disabled={!canSubmit}
          >
            {saving ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </div>

      {error && (
        <p className="udd__notes-error" role="alert">
          We could not save that note. {error?.message ?? 'Try again.'}
        </p>
      )}

      {loading ? (
        <p className="udd__notes-empty">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="udd__notes-empty">No notes yet for this user.</p>
      ) : (
        <ul className="udd__notes-list">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              saving={saving}
              onUpdate={update}
              onDelete={remove}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

// ============ Note card with inline edit + two-step delete ============

function NoteCard({ note, saving, onUpdate, onDelete }) {
  const [editing,    setEditing]    = useState(false)
  const [editBody,   setEditBody]   = useState(note.body)
  const [confirming, setConfirming] = useState(false)

  const startEdit = () => {
    setEditBody(note.body)
    setEditing(true)
    setConfirming(false)
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditBody(note.body)
  }

  const saveEdit = async () => {
    const body = editBody.trim()
    if (!body || body === note.body) {
      setEditing(false)
      return
    }
    await onUpdate(note.id, body)
    setEditing(false)
  }

  const startDelete = () => {
    setConfirming(true)
    setEditing(false)
  }

  const confirmDelete = async () => {
    await onDelete(note.id)
    setConfirming(false)
  }

  return (
    <li className="udd__note">
      <header className="udd__note-head">
        <span className="udd__note-author">
          {note.author?.full_name ?? 'Unknown author'}
        </span>
        <time className="udd__note-time" dateTime={note.created_at}>
          {formatRelative(note.created_at)}
          {note.updated_at && note.updated_at !== note.created_at && (
            <span className="udd__note-edited"> · edited</span>
          )}
        </time>
      </header>

      {editing ? (
        <>
          <textarea
            className="udd__notes-textarea"
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={3}
            disabled={saving}
            autoFocus
          />
          <div className="udd__note-actions">
            <button
              type="button"
              className="udd__btn udd__btn--ghost"
              onClick={cancelEdit}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="udd__btn udd__btn--primary"
              onClick={saveEdit}
              disabled={saving || !editBody.trim()}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="udd__note-body">{note.body}</p>
          <div className="udd__note-actions">
            {confirming ? (
              <>
                <button
                  type="button"
                  className="udd__btn udd__btn--ghost"
                  onClick={() => setConfirming(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="udd__btn udd__btn--danger"
                  onClick={confirmDelete}
                  disabled={saving}
                >
                  {saving ? 'Deleting…' : 'Confirm delete'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="udd__btn udd__btn--ghost"
                  onClick={startEdit}
                  disabled={saving}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="udd__btn udd__btn--ghost-danger"
                  onClick={startDelete}
                  disabled={saving}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </>
      )}
    </li>
  )
}

// ============ Helpers ============

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
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

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function CloseIcon() {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
