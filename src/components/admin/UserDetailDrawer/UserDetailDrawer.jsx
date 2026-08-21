import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAdminUserNotes } from '@/hooks/useAdminUserNotes'
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
  onDecision = null
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

  const canGrant  = !isAdmin && user.is_active
  const canRevoke = isAdmin && !isSelf && !onlyActiveAdmin
  const blocked   = blockedReason({ isAdmin, isSelf, onlyActiveAdmin, isActive: user.is_active })

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
function blockedReason({ isAdmin, isSelf, onlyActiveAdmin, isActive }) {
  if (onlyActiveAdmin) {
    return 'This is the only active admin. Grant admin to somebody else before removing it here, or nobody can reach the console.'
  }
  if (isAdmin && isSelf) {
    return 'You cannot remove your own admin access. Another admin has to do it for you.'
  }
  if (!isAdmin && !isActive) {
    return 'Reactivate this account before granting admin access.'
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
