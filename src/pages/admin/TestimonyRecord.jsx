import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/shared/Icon/Icon'
import {
  recordTestimony,
  fetchTestimonyCandidates,
  friendlyTestimonyError,
  firstNameOf,
  bodyProblem,
  BODY_MAX
} from '@/lib/testimonies'
import { optionLabelFor, incompleteLabelsFor } from '@/lib/people'

// Not every testimony arrives through the platform. Some are told in a
// meeting, some come over WhatsApp, some are said in person. This is where an
// admin writes one down.
//
// The person picker is the whole point of the form. Linked, and they are
// notified that their words are on the wall and can withdraw them. Left blank,
// and nobody can, so the admin has to be right the first time. That is a
// choice made deliberately rather than a default that happens quietly.
export function TestimonyRecordPanel({ recordedBy, onCancel, onSaved }) {
  const [people,  setPeople]  = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  const [form, setForm] = useState({
    authorId:    '',
    displayName: '',
    roleLabel:   'mentee',
    body:        ''
  })

  useEffect(() => {
    let cancelled = false
    fetchTestimonyCandidates()
      .then((rows) => { if (!cancelled) { setPeople(rows); setLoading(false) } })
      .catch((e) => { if (!cancelled) { setErr(friendlyTestimonyError(e)); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  // Picking somebody prefills the name they will be shown as, per Q43. It is
  // a prefill, not a rule: the admin can write anything over it.
  function pickPerson(id) {
    const person = people.find((p) => p.id === id)
    setForm((f) => ({
      ...f,
      authorId:    id,
      displayName: person ? firstNameOf(person.full_name) : f.displayName
    }))
  }

  const problem = useMemo(() => bodyProblem(form.body), [form.body])
  const ready = !problem && form.displayName.trim().length > 0

  async function submit() {
    if (!ready) return
    setSaving(true)
    setErr('')
    try {
      const row = await recordTestimony({
        authorId:    form.authorId || null,
        recordedBy,
        displayName: form.displayName,
        roleLabel:   form.roleLabel,
        body:        form.body
      })
      onSaved(row)
    } catch (e) {
      setErr(friendlyTestimonyError(e))
    } finally {
      setSaving(false)
    }
  }

  const linked = Boolean(form.authorId)

  // Linking somebody who cannot reach their account makes the withdrawal right
  // theoretical, so the form says so rather than reading as a clean consent.
  const picked = people.find((p) => p.id === form.authorId)
  const unfinished = picked ? (incompleteLabelsFor(picked).join(' and ') || null) : null

  return (
    <div className="tst__panel">
      <h2 className="tst__panel-title">Record a testimony</h2>
      <p className="tst__panel-hint">
        For something you were told rather than something somebody submitted. It goes
        straight to the wall, because you are the one who would have approved it.
      </p>

      {err && <p className="tst__form-error" role="alert">{err}</p>}

      <div className="tst__fields">
        <label className="tst__field tst__field--wide">
          <span className="tst__label">Their words</span>
          <textarea
            className="tst__textarea"
            rows={6}
            value={form.body}
            onChange={(e) => set({ body: e.target.value })}
            placeholder="Write it the way they said it, not the way it would read best."
            maxLength={BODY_MAX}
            autoFocus
          />
          <span className="tst__hint">
            {problem ?? `${form.body.trim().length} of ${BODY_MAX} characters.`}
          </span>
        </label>

        <label className="tst__field">
          <span className="tst__label">Who said it</span>
          <select
            className="tst__input"
            value={form.authorId}
            onChange={(e) => pickPerson(e.target.value)}
            disabled={loading}
          >
            <option value="">Somebody without an account</option>
            {/* A native select holds one line, so name, role and email go on
                it together. Two active accounts share a name and picking the
                wrong one publishes somebody's words under another person's
                account. */}
            {people.map((p) => (
              <option key={p.id} value={p.id}>{optionLabelFor(p)}</option>
            ))}
          </select>
        </label>

        <label className="tst__field">
          <span className="tst__label">Shown as</span>
          <input
            type="text"
            className="tst__input"
            value={form.displayName}
            onChange={(e) => set({ displayName: e.target.value })}
            placeholder="First name, usually"
            maxLength={60}
          />
        </label>

        <fieldset className="tst__field tst__field--wide">
          <legend className="tst__label">They are a</legend>
          <div className="tst__choices">
            {['mentee', 'mentor'].map((r) => (
              <button
                key={r}
                type="button"
                className={'tst__choice' + (form.roleLabel === r ? ' tst__choice--active' : '')}
                onClick={() => set({ roleLabel: r })}
                aria-pressed={form.roleLabel === r}
              >
                {r === 'mentor' ? 'Mentor' : 'Mentee'}
              </button>
            ))}
          </div>
        </fieldset>

        {/* The consequence of the picker, said plainly, because it is the one
            thing on this form that cannot be undone later. */}
        <p className={'tst__consent' + (linked && !unfinished ? ' tst__consent--linked' : '')}>
          <Icon name={linked && !unfinished ? 'check' : 'alert'} size={14} strokeWidth={1.75} />
          <span>
            {!linked
              ? 'Nobody can take this down but an admin, because there is no account to notify.'
              : unfinished
                // The notice is the consent, and consent from somebody who
                // cannot reach their account is not consent.
                ? `They have not finished setting up (${unfinished.toLowerCase()}), so they may not see the notice or find the control to take it down.`
                : 'They will be told it is on the wall and can take it down themselves.'}
          </span>
        </p>
      </div>

      <div className="tst__panel-actions">
        <button type="button" className="tst__action" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="tst__save" onClick={submit} disabled={!ready || saving}>
          {saving ? 'Publishing' : 'Publish to the wall'}
        </button>
      </div>
    </div>
  )
}
