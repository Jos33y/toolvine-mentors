import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import { Icon } from '@/components/shared/Icon/Icon'
import {
  fetchMyTestimony,
  submitTestimony,
  withdrawTestimony,
  friendlyTestimonyError,
  firstNameOf,
  bodyProblem,
  canWithdraw,
  TESTIMONY_STATUS,
  BODY_MAX
} from '@/lib/testimonies'
import './testimony.css'

// One page for the whole of a member's relationship with their own testimony:
// write it, see where it got to, take it down.
//
// The four states are the same words the meetings surface uses for a request,
// because this community learned them three weeks ago. Waiting, published,
// declined with a reason they can read, withdrawn.
//
// The notification trigger in 0050 links here, so this route is what
// testimony_approved and testimony_rejected open.
export function Testimony() {
  const profile = useAuth((s) => s.profile)
  const roles   = useAuth((s) => s.roles)

  const [row,   setRow]   = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!profile?.id) return
    setState('loading')
    try {
      setRow(await fetchMyTestimony(profile.id))
      setError('')
      setState('ready')
    } catch (e) {
      setError(friendlyTestimonyError(e))
      setState('ready')
    }
  }, [profile?.id])

  useEffect(() => { load() }, [load])

  const live = row && ['pending', 'approved'].includes(row.status)

  return (
    <section className="tsty">
      <header className="tsty__head">
        <p className="tsty__eyebrow">Your story</p>
        <h1 className="tsty__title">Testimony</h1>
        <p className="tsty__lede">
          What mentoring has done for you, in your words. Nothing is published until
          our team has read it, and you can take it down at any time.
        </p>
      </header>

      {error && <div className="tsty__alert" role="alert">{error}</div>}

      {state === 'loading' ? (
        <div className="tsty__skeleton" aria-busy="true" />
      ) : live ? (
        <LiveTestimony
          row={row}
          viewerId={profile?.id ?? null}
          onChanged={load}
        />
      ) : (
        <>
          {row?.status === TESTIMONY_STATUS.REJECTED && (
            <div className="tsty__answered" role="note">
              <p className="tsty__answered-title">Your last one was not published</p>
              {row.rejection_reason && (
                <p className="tsty__answered-body">{row.rejection_reason}</p>
              )}
              <p className="tsty__answered-body">
                You are welcome to write another whenever you are ready.
              </p>
            </div>
          )}

          {row?.status === TESTIMONY_STATUS.WITHDRAWN && (
            <div className="tsty__answered" role="note">
              <p className="tsty__answered-title">You took your last one down</p>
              <p className="tsty__answered-body">
                It is off the wall. You can write another whenever you are ready.
              </p>
            </div>
          )}

          <TestimonyForm
            profile={profile}
            roles={roles}
            onSaved={load}
          />
        </>
      )}
    </section>
  )
}

/* ============ Live ============ */

function LiveTestimony({ row, viewerId, onChanged }) {
  const [busy,    setBusy]    = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [err,     setErr]     = useState('')

  const approved = row.status === TESTIMONY_STATUS.APPROVED
  const mayGo    = canWithdraw(row, viewerId)

  async function withdraw() {
    setBusy(true)
    setErr('')
    try {
      await withdrawTestimony(row.id)
      setConfirm(false)
      await onChanged()
    } catch (e) {
      setErr(friendlyTestimonyError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="tsty__card">
      <div className="tsty__status">
        <span className={`tsty__pill tsty__pill--${row.status}`}>
          {approved ? 'On the wall' : 'Waiting to be read'}
        </span>
        {row.is_featured && <span className="tsty__pill tsty__pill--featured">Featured</span>}
      </div>

      <p className="tsty__body">{row.body}</p>

      <p className="tsty__attr">Shown as {row.display_name}</p>

      <p className="tsty__note">
        {approved
          ? 'Anyone visiting the site can read this. Only the name above appears with it.'
          : 'Nobody outside our team can read this yet. We will let you know either way.'}
      </p>

      {err && <p className="tsty__alert" role="alert">{err}</p>}

      {mayGo && (
        <footer className="tsty__actions">
          {approved && (
            <Link className="tsty__action" to="/#witness">
              <Icon name="externalLink" size={14} strokeWidth={1.75} />
              <span>See the wall</span>
            </Link>
          )}
          {confirm ? (
            <>
              <span className="tsty__confirm">
                {approved
                  ? 'Take it off the wall? You can write another later.'
                  : 'Withdraw it? You can write another later.'}
              </span>
              <button
                type="button"
                className="tsty__action"
                onClick={() => setConfirm(false)}
                disabled={busy}
              >
                Keep it
              </button>
              <button
                type="button"
                className="tsty__action tsty__action--danger"
                onClick={withdraw}
                disabled={busy}
              >
                {busy ? 'Taking it down' : 'Take it down'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="tsty__action tsty__action--danger"
              onClick={() => { setConfirm(true); setErr('') }}
              disabled={busy}
            >
              Take it down
            </button>
          )}
        </footer>
      )}
    </article>
  )
}

/* ============ Form ============ */

function TestimonyForm({ profile, roles, onSaved }) {
  // Q43. First name generally, so it is prefilled rather than enforced. What
  // gets stored is whatever they leave in the field.
  const [form, setForm] = useState(() => ({
    body:        '',
    displayName: firstNameOf(profile?.full_name),
    roleLabel:   roles?.includes('mentor') ? 'mentor' : 'mentee'
  }))
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  // Somebody holding both roles chooses which they are speaking as. Holding
  // one, the answer is already known and the control would be a question with
  // one answer.
  const bothRoles = Boolean(roles?.includes('mentor') && roles?.includes('mentee'))

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const problem = useMemo(() => bodyProblem(form.body), [form.body])
  const ready = !problem && form.displayName.trim().length > 0

  async function submit() {
    if (!ready) return
    setSaving(true)
    setErr('')
    try {
      await submitTestimony({
        authorId:    profile.id,
        displayName: form.displayName,
        roleLabel:   form.roleLabel,
        body:        form.body
      })
      await onSaved()
    } catch (e) {
      setErr(friendlyTestimonyError(e))
    } finally {
      setSaving(false)
    }
  }

  const count = form.body.trim().length

  return (
    <div className="tsty__form">
      {err && <p className="tsty__alert" role="alert">{err}</p>}

      <label className="tsty__field">
        <span className="tsty__label">What happened</span>
        <textarea
          className="tsty__textarea"
          rows={9}
          value={form.body}
          onChange={(e) => set({ body: e.target.value })}
          placeholder="A season your mentor walked you through. Something you understood differently afterwards. One thing that changed."
          maxLength={BODY_MAX}
          spellCheck="true"
        />
        <span className="tsty__hint">
          {problem ?? `${count} of ${BODY_MAX} characters. A few lines is plenty.`}
        </span>
      </label>

      <div className="tsty__row">
        <label className="tsty__field">
          <span className="tsty__label">Shown as</span>
          <input
            type="text"
            className="tsty__input"
            value={form.displayName}
            onChange={(e) => set({ displayName: e.target.value })}
            maxLength={60}
          />
          <span className="tsty__hint">
            First name is usual. Your full name is never shown.
          </span>
        </label>

        {bothRoles && (
          <fieldset className="tsty__field">
            <legend className="tsty__label">Writing as</legend>
            <div className="tsty__choices">
              {['mentee', 'mentor'].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={'tsty__choice' + (form.roleLabel === r ? ' tsty__choice--active' : '')}
                  onClick={() => set({ roleLabel: r })}
                  aria-pressed={form.roleLabel === r}
                >
                  {r === 'mentor' ? 'A mentor' : 'A mentee'}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      <footer className="tsty__actions">
        <span className="tsty__confirm">
          Our team reads it first. You will hear either way.
        </span>
        <button
          type="button"
          className="tsty__save"
          onClick={submit}
          disabled={!ready || saving}
        >
          {saving ? 'Sending' : 'Send it in'}
        </button>
      </footer>
    </div>
  )
}
