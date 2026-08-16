import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/shared/Icon/Icon'
import { useAuth } from '@/stores/useAuth'
import { shortDate } from '@/lib/format'
import {
  fetchAllVerses,
  saveVerse,
  currentWeekStart,
  isFutureWeek,
  isVerseStale,
  friendlyVerseError
} from '@/lib/verseOfTheWeek'
import './verse.css'

// One verse per week, enforced by a unique index on week_of. Saving a week that
// already exists replaces it, so there is no way to end up with two.
//
// The dashboard card hides itself once the newest verse is more than fourteen
// days old. Nothing used to say so, which meant the card could vanish and the
// only way to find out was to notice. This page names it.

const BLANK = { reference: '', body: '', source: '' }

export function Verse() {
  const profile = useAuth((s) => s.profile)

  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [notice,  setNotice]  = useState('')

  // null means the form is closed. An object means it is open.
  const [draft,     setDraft]     = useState(null)
  const [weekOf,    setWeekOf]    = useState(currentWeekStart())
  const [editing,   setEditing]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await fetchAllVerses())
    } catch (e) {
      setError(friendlyVerseError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // The row members actually see: newest that is not dated ahead of today.
  const live = useMemo(
    () => rows.find((r) => !isFutureWeek(r.week_of)) ?? null,
    [rows]
  )
  const hidden = !live || isVerseStale(live)

  function openCreate() {
    setDraft({ ...BLANK })
    setWeekOf(currentWeekStart())
    setEditing(false)
    setFormError('')
    setNotice('')
  }

  function openEdit(row) {
    setDraft({
      reference: row.reference,
      body:      row.body,
      source:    row.source ?? ''
    })
    setWeekOf(row.week_of)
    setEditing(true)
    setFormError('')
    setNotice('')
  }

  function closeForm() {
    setDraft(null)
    setEditing(false)
    setFormError('')
  }

  async function save() {
    if (saving || !draft) return
    setSaving(true)
    setFormError('')

    const reference = draft.reference.trim()
    const body      = draft.body.trim()

    if (!reference) { setFormError('Give the reference, for example Psalm 23:1.'); setSaving(false); return }
    if (!body)      { setFormError('Add the wording of the verse.');               setSaving(false); return }
    if (!weekOf)    { setFormError('Pick the week this verse belongs to.');        setSaving(false); return }

    try {
      await saveVerse(
        { reference, body, week_of: weekOf, source: draft.source },
        { createdBy: profile?.id ?? null }
      )
      setNotice(
        isFutureWeek(weekOf)
          ? `Saved. It appears on the dashboard from ${shortDate(weekOf)}.`
          : 'Saved. It is live on the dashboard now.'
      )
      closeForm()
      await load()
    } catch (e) {
      setFormError(friendlyVerseError(e))
    } finally {
      setSaving(false)
    }
  }

  // A week already in the list is a replacement, not a second row. Saying so
  // beats letting the person discover it after they press save.
  const collision = !editing && rows.some((r) => r.week_of === weekOf)

  return (
    <section className="admin-verse">
      <header className="admin-verse__head">
        <div>
          <h1 className="page-title">Verse of the week</h1>
          <p className="admin-verse__lede">
            One verse a week, shown on every member dashboard. Text only, so it
            can be read aloud and searched.
          </p>
        </div>
        {!draft && (
          <button type="button" className="admin-verse__add" onClick={openCreate}>
            <Icon name="plus" size={16} />
            Set a verse
          </button>
        )}
      </header>

      {notice && <p className="admin-verse__notice">{notice}</p>}
      {error  && <p className="admin-verse__error" role="alert">{error}</p>}

      {!loading && hidden && (
        <div className="admin-verse__warning">
          <span className="admin-verse__warning-icon">
            <Icon name="alert" size={18} />
          </span>
          <p>
            {live
              ? `Nothing is showing on member dashboards. The newest verse is dated ${shortDate(live.week_of)}, and the card hides anything older than fourteen days.`
              : 'Nothing is showing on member dashboards. No verse has been set.'}
          </p>
        </div>
      )}

      {draft && (
        <VerseForm
          draft={draft}
          setDraft={setDraft}
          weekOf={weekOf}
          setWeekOf={setWeekOf}
          editing={editing}
          collision={collision}
          saving={saving}
          formError={formError}
          onCancel={closeForm}
          onSave={save}
        />
      )}

      {loading ? (
        <p className="admin-verse__state">Loading verses</p>
      ) : rows.length === 0 ? (
        <p className="admin-verse__state">
          No verse has been set yet. The first one you add appears on every
          dashboard for its week.
        </p>
      ) : (
        <ol className="admin-verse__list">
          {rows.map((row) => (
            <VerseRow
              key={row.id}
              row={row}
              isLive={live?.id === row.id && !hidden}
              onEdit={() => openEdit(row)}
            />
          ))}
        </ol>
      )}
    </section>
  )
}

/* ============ Row ============ */

function VerseRow({ row, isLive, onEdit }) {
  const scheduled = isFutureWeek(row.week_of)

  return (
    <li className="admin-verse__row">
      <div className="admin-verse__row-main">
        <div className="admin-verse__row-head">
          <span className="admin-verse__week">{shortDate(row.week_of)}</span>
          {isLive    && <span className="admin-verse__pill admin-verse__pill--live">Live</span>}
          {scheduled && <span className="admin-verse__pill">Scheduled</span>}
        </div>
        <p className="admin-verse__ref">{row.reference}</p>
        <p className="admin-verse__body">{row.body}</p>
        {row.source && <p className="admin-verse__source">{row.source}</p>}
      </div>

      <button type="button" className="admin-verse__action" onClick={onEdit}>
        Edit
      </button>
    </li>
  )
}

/* ============ Form ============ */

function VerseForm({
  draft, setDraft, weekOf, setWeekOf, editing,
  collision, saving, formError, onCancel, onSave
}) {
  const set = (key) => (e) => setDraft({ ...draft, [key]: e.target.value })

  return (
    <div className="admin-verse__form">
      <h2 className="admin-verse__form-title">
        {editing ? 'Edit verse' : 'Set a verse'}
      </h2>

      <div className="admin-verse__field-row">
        <div className="admin-verse__field">
          <label className="admin-verse__label" htmlFor="verse-ref">Reference</label>
          <input
            id="verse-ref"
            type="text"
            className="admin-verse__input"
            value={draft.reference}
            onChange={set('reference')}
            placeholder="Psalm 23:1"
            maxLength={80}
            autoComplete="off"
          />
        </div>

        <div className="admin-verse__field admin-verse__field--narrow">
          <label className="admin-verse__label" htmlFor="verse-week">Week beginning</label>
          <input
            id="verse-week"
            type="date"
            className="admin-verse__input"
            value={weekOf}
            onChange={(e) => setWeekOf(e.target.value)}
            disabled={editing}
          />
          {editing && (
            <p className="admin-verse__hint">
              The week cannot move. Set a new verse to change which week it covers.
            </p>
          )}
        </div>
      </div>

      <div className="admin-verse__field">
        <label className="admin-verse__label" htmlFor="verse-body">Wording</label>
        <textarea
          id="verse-body"
          className="admin-verse__input admin-verse__input--area"
          value={draft.body}
          onChange={set('body')}
          rows={4}
          maxLength={600}
          placeholder="The wording of the verse, exactly as it reads."
        />
      </div>

      <div className="admin-verse__field">
        <label className="admin-verse__label" htmlFor="verse-source">Translation</label>
        <input
          id="verse-source"
          type="text"
          className="admin-verse__input"
          value={draft.source}
          onChange={set('source')}
          placeholder="NKJV"
          maxLength={60}
          autoComplete="off"
        />
        <p className="admin-verse__hint">Optional. Shown under the verse when set.</p>
      </div>

      {collision && (
        <p className="admin-verse__hint admin-verse__hint--warn">
          A verse already exists for that week. Saving replaces it.
        </p>
      )}

      {formError && <p className="admin-verse__form-error" role="alert">{formError}</p>}

      <div className="admin-verse__form-actions">
        <button
          type="button"
          className="admin-verse__cancel"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="admin-verse__save"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? 'Saving' : 'Save verse'}
        </button>
      </div>
    </div>
  )
}
