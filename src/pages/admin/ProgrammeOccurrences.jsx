import { useMemo, useState } from 'react'
import { Icon } from '@/components/shared/Icon/Icon'
import { useAuth } from '@/stores/useAuth'
import {
  createOccurrence,
  updateOccurrence,
  skipOccurrence,
  unskipOccurrence,
  occurrenceDate,
  formatClock,
  isPastDate,
  friendlyProgrammeError
} from '@/lib/adminProgrammes'

// Split out of Programmes.jsx before it crossed the length cap. Both files use
// the admin-prog__ block on purpose: one page, one stylesheet, one row family.
//
// Upcoming and past are two lists rather than one long one. What an admin does
// to a future date, set a link or skip it, is not what they do to a past one,
// which is write down what happened.

const PAGE = 12

export function Occurrences({ programmes, occurrences, onChanged, onNotice }) {
  const profile = useAuth((s) => s.profile)

  const [filter, setFilter]   = useState('all')
  const [scope, setScope]     = useState('upcoming')
  const [busyId, setBusyId]   = useState(null)
  const [editing, setEditing] = useState(null)
  const [adding, setAdding]   = useState(false)
  const [error, setError]     = useState('')
  const [shown, setShown]     = useState(PAGE)

  const byId = useMemo(
    () => new Map(programmes.map((p) => [p.id, p])),
    [programmes]
  )

  const rows = useMemo(() => {
    const list = occurrences
      .filter((o) => filter === 'all' || o.programme_id === filter)
      .filter((o) => (scope === 'past' ? isPastDate(o.occurs_on) : !isPastDate(o.occurs_on)))
    return scope === 'past' ? [...list].reverse() : list
  }, [occurrences, filter, scope])

  const visible = rows.slice(0, shown)

  const months = useMemo(() => {
    const out = []
    for (const o of visible) {
      const key = o.occurs_on.slice(0, 7)
      const last = out[out.length - 1]
      if (last && last.key === key) last.items.push(o)
      else out.push({ key, label: occurrenceDate(o.occurs_on, { month: 'long', year: 'numeric' }), items: [o] })
    }
    return out
  }, [visible])

  // The nearest date ahead, marked once. Everything below it is further away,
  // which is the one thing a flat list of dates never says.
  const nextId = useMemo(() => {
    if (scope === 'past') return null
    return rows.find((o) => !o.is_skipped)?.id ?? null
  }, [rows, scope])

  function reset(message) {
    setEditing(null)
    setAdding(false)
    setError('')
    if (message) onNotice(message)
    onChanged()
  }

  async function run(id, fn, message) {
    setBusyId(id)
    setError('')
    try {
      await fn()
      reset(message)
    } catch (e) {
      setError(friendlyProgrammeError(e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="admin-prog__occ">
      <header className="admin-prog__occ-head">
        <div>
          <h2 className="admin-prog__occ-title">Dates</h2>
          <p className="admin-prog__hint">
            Future dates come from each rule. Past ones carry what happened, and
            only the months you write about appear on the public page.
          </p>
        </div>
        {!adding && (
          <button type="button" className="admin-prog__add" onClick={() => { setAdding(true); setEditing(null) }}>
            <Icon name="plus" size={16} />
            Add a date
          </button>
        )}
      </header>

      {error && <p className="admin-prog__error" role="alert">{error}</p>}

      {adding && (
        <OccurrenceForm
          programmes={programmes}
          mode="create"
          onCancel={() => setAdding(false)}
          onSave={async (form) => {
            await createOccurrence({
              programmeId: form.programme_id,
              occursOn:    form.occurs_on,
              title:       form.title,
              description: form.description,
              startTime:   form.start_time,
              joinUrl:     form.join_url,
              location:    form.location,
              createdBy:   profile?.id ?? null
            })
            reset('Date added.')
          }}
        />
      )}

      <div className="admin-prog__filters">
        <div className="admin-prog__scope">
          {[['upcoming', 'Upcoming'], ['past', 'Past']].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={'admin-prog__scope-btn' + (scope === key ? ' admin-prog__scope-btn--on' : '')}
              onClick={() => { setScope(key); setShown(PAGE) }}
              aria-pressed={scope === key}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          className="admin-prog__input admin-prog__input--filter"
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setShown(PAGE) }}
          aria-label="Filter by programme"
        >
          <option value="all">All programmes</option>
          {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {visible.length === 0 ? (
        <p className="admin-prog__state">
          {scope === 'past'
            ? 'Nothing has happened yet. Once a date passes it appears here and you can write what took place.'
            : 'No dates ahead. Add one by hand, or check the rule on the programme above.'}
        </p>
      ) : (
        <div className="admin-prog__months">
          {months.map((m) => (
            <section key={m.key} className="admin-prog__month">
              <h3 className="admin-prog__month-label">{m.label}</h3>
              <ol className="admin-prog__occ-list">
                {m.items.map((o) => (
            <OccurrenceRow
              key={o.id}
              occurrence={o}
              programme={byId.get(o.programme_id)}
              isNext={o.id === nextId}
              busy={busyId === o.id}
              editing={editing === o.id}
              onEdit={() => { setEditing(o.id); setAdding(false); setError('') }}
              onCancel={() => setEditing(null)}
              onSave={(form) => run(o.id, () => updateOccurrence(o.id, form), 'Saved.')}
              onSkip={(note) => run(o.id, () => skipOccurrence(o.id, note), 'Month marked as skipped.')}
              onUnskip={() => run(o.id, () => unskipOccurrence(o.id), 'Back on.')}
            />
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      {rows.length > visible.length && (
        <button type="button" className="admin-prog__more" onClick={() => setShown((n) => n + PAGE)}>
          Show {Math.min(PAGE, rows.length - visible.length)} more
        </button>
      )}
    </section>
  )
}

/* ============ Row ============ */

function OccurrenceRow({ occurrence: o, programme, isNext, busy, editing, onEdit, onCancel, onSave, onSkip, onUnskip }) {
  const [skipping, setSkipping] = useState(false)
  const [note, setNote] = useState('')

  const past    = isPastDate(o.occurs_on)
  const written = Boolean(o.recap || o.description)
  const time    = o.start_time ?? programme?.start_time

  return (
    <li className={'admin-prog__occ-row' + (o.is_skipped ? ' admin-prog__occ-row--skipped' : '')}>
      <div className="admin-prog__occ-when" aria-hidden="true">
        <span className="admin-prog__occ-day">{occurrenceDate(o.occurs_on, { day: 'numeric' })}</span>
        <span className="admin-prog__occ-dow">{occurrenceDate(o.occurs_on, { weekday: 'short' }).toUpperCase()}</span>
      </div>

      <div className="admin-prog__occ-main">
        <p className="admin-prog__occ-title-row">
          <span className="admin-prog__occ-name">{o.title || programme?.name || 'Untitled'}</span>
          {isNext       && <span className="admin-prog__pill admin-prog__pill--next">Next</span>}
          {o.is_skipped && <span className="admin-prog__pill">Skipped</span>}
          {o.notified_at && <span className="admin-prog__pill">Notified</span>}
        </p>

        {/* One line. The weekday moved to the rail and the year to the month
            heading, so what is left is the time and anything unusual. */}
        <p className="admin-prog__occ-meta">
          <span>{formatClock(time)}</span>
          {o.join_url && <><span className="admin-prog__dot" aria-hidden="true">·</span><span>Own link</span></>}

        </p>

        {o.is_skipped && o.skip_note && <p className="admin-prog__occ-note">{o.skip_note}</p>}
        {o.description && !o.is_skipped && <p className="admin-prog__occ-body">{o.description}</p>}
        {o.recap && <p className="admin-prog__occ-recap">{o.recap}</p>}

        {/* The public past section only shows months somebody wrote about, so
            a past date with nothing on it is invisible rather than empty. */}
        {past && !written && !o.is_skipped && (
          <p className="admin-prog__warn">
            <Icon name="alert" size={13} strokeWidth={1.75} />
            <span>Nothing written. This one does not appear on the public page.</span>
          </p>
        )}

        {skipping && (
          <div className="admin-prog__inline">
            <label className="admin-prog__label" htmlFor={`skip-${o.id}`}>Why this month is off</label>
            <input
              id={`skip-${o.id}`}
              type="text"
              className="admin-prog__input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Clashes with the convention in Ibadan"
              autoFocus
            />
            <p className="admin-prog__hint">Members and visitors both read this.</p>
            <div className="admin-prog__inline-actions">
              <button type="button" className="admin-prog__cancel" onClick={() => { setSkipping(false); setNote('') }} disabled={busy}>
                Keep it on
              </button>
              <button
                type="button"
                className="admin-prog__save"
                onClick={() => onSkip(note)}
                disabled={busy || note.trim().length === 0}
              >
                {busy ? 'Saving' : 'Skip this month'}
              </button>
            </div>
          </div>
        )}

        {editing && (
          <OccurrenceForm
            occurrence={o}
            programme={programme}
            mode="edit"
            onCancel={onCancel}
            onSave={onSave}
          />
        )}
      </div>

      {!editing && !skipping && (
        <div className="admin-prog__occ-actions">
          <button type="button" className="admin-prog__action" onClick={onEdit} disabled={busy}>
            {past ? 'Write recap' : 'Edit'}
          </button>
          {!past && !o.is_skipped && (
            <button type="button" className="admin-prog__action" onClick={() => setSkipping(true)} disabled={busy}>
              Skip
            </button>
          )}
          {o.is_skipped && (
            <button type="button" className="admin-prog__action" onClick={onUnskip} disabled={busy}>
              Put it back
            </button>
          )}
        </div>
      )}
    </li>
  )
}

/* ============ Form ============ */

function OccurrenceForm({ occurrence, programme, programmes, mode, onCancel, onSave }) {
  const creating = mode === 'create'

  const [form, setForm] = useState({
    programme_id: occurrence?.programme_id ?? programmes?.[0]?.id ?? '',
    occurs_on:    occurrence?.occurs_on ?? '',
    title:        occurrence?.title ?? '',
    description:  occurrence?.description ?? '',
    recap:        occurrence?.recap ?? '',
    start_time:   occurrence?.start_time ? String(occurrence.start_time).slice(0, 5) : '',
    join_url:     occurrence?.join_url ?? '',
    location:     occurrence?.location ?? ''
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const past  = !creating && isPastDate(form.occurs_on)
  const ready = form.occurs_on && (!creating || form.programme_id)

  async function submit() {
    if (!ready || saving) return
    setSaving(true)
    setErr('')
    try {
      await onSave(form)
    } catch (e) {
      setErr(friendlyProgrammeError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-prog__form">
      {err && <p className="admin-prog__form-error" role="alert">{err}</p>}

      {creating && (
        <div className="admin-prog__field">
          <label className="admin-prog__label" htmlFor="occ-prog">Programme</label>
          <select
            id="occ-prog"
            className="admin-prog__input"
            value={form.programme_id}
            onChange={(e) => set({ programme_id: e.target.value })}
          >
            {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      <div className="admin-prog__field-row">
        <div className="admin-prog__field">
          <label className="admin-prog__label" htmlFor="occ-date">Date</label>
          <input
            id="occ-date"
            type="date"
            className="admin-prog__input"
            value={form.occurs_on}
            onChange={(e) => set({ occurs_on: e.target.value })}
          />
        </div>

        <div className="admin-prog__field">
          <label className="admin-prog__label" htmlFor="occ-time">Start time, optional</label>
          <input
            id="occ-time"
            type="time"
            className="admin-prog__input"
            value={form.start_time}
            onChange={(e) => set({ start_time: e.target.value })}
          />
          <p className="admin-prog__hint">
            Leave blank to keep {formatClock(programme?.start_time)} from the programme.
          </p>
        </div>
      </div>

      <div className="admin-prog__field">
        <label className="admin-prog__label" htmlFor="occ-title">Title, optional</label>
        <input
          id="occ-title"
          type="text"
          className="admin-prog__input"
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder={programme?.name ?? 'Uses the programme name'}
          maxLength={120}
          autoComplete="off"
        />
      </div>

      <div className="admin-prog__field">
        <label className="admin-prog__label" htmlFor="occ-desc">What it is about, optional</label>
        <textarea
          id="occ-desc"
          className="admin-prog__input admin-prog__input--area"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          rows={3}
          maxLength={600}
          placeholder="The theme, or who is speaking."
        />
      </div>

      {/* Only offered once the date has passed. A recap written in advance is
          not a recap. */}
      {past && (
        <div className="admin-prog__field">
          <label className="admin-prog__label" htmlFor="occ-recap">What happened</label>
          <textarea
            id="occ-recap"
            className="admin-prog__input admin-prog__input--area"
            value={form.recap}
            onChange={(e) => set({ recap: e.target.value })}
            rows={4}
            maxLength={1200}
            placeholder="Who came, what was said, what it turned on."
          />
          <p className="admin-prog__hint">
            This is what appears on the public programmes page. Months with
            nothing written stay off it.
          </p>
        </div>
      )}

      {!creating && (
        <div className="admin-prog__field">
          <label className="admin-prog__label" htmlFor="occ-url">Joining link for this date, optional</label>
          <input
            id="occ-url"
            type="url"
            className="admin-prog__input"
            value={form.join_url}
            onChange={(e) => set({ join_url: e.target.value })}
            placeholder="Leave blank to use the programme link"
            autoComplete="off"
            spellCheck="false"
          />
        </div>
      )}

      <div className="admin-prog__form-actions">
        <button type="button" className="admin-prog__cancel" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="admin-prog__save" onClick={submit} disabled={!ready || saving}>
          {saving ? 'Saving' : creating ? 'Add date' : 'Save'}
        </button>
      </div>
    </div>
  )
}
