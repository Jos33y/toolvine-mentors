import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/shared/Icon/Icon'
import {
  fetchProgrammes,
  fetchOccurrences,
  fetchDefaultJoinUrl,
  saveDefaultJoinUrl,
  resolveJoinUrl,
  updateProgramme,
  applyRuleChange,
  ruleInWords,
  occurrenceDate,
  friendlyProgrammeError,
  WEEK_OPTIONS,
  WEEKDAY_OPTIONS
} from '@/lib/adminProgrammes'
import { Occurrences } from './ProgrammeOccurrences'
import './programmes.css'

// Four programmes. Three carry an ordinal weekday rule and their dates are
// derived from it; Toolvine Equip has no rule and every occurrence is created
// by hand. Nothing on this page types a date twelve times.
//
// The joining link lives here rather than on the public page. It is usually
// the permanent Zoom link, and programme_schedule_public exists precisely so
// it cannot reach anyone who is not signed in.

export function Programmes() {
  const [programmes, setProgrammes] = useState([])
  const [occurrences, setOccurrences] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [notice, setNotice]   = useState('')
  const [editingId, setEditingId] = useState(null)
  const [sharedUrl, setSharedUrl] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [p, o, s] = await Promise.all([
        fetchProgrammes(), fetchOccurrences(), fetchDefaultJoinUrl()
      ])
      setProgrammes(p)
      setOccurrences(o)
      setSharedUrl(s)
    } catch (e) {
      setError(friendlyProgrammeError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // The next date per programme, which is what the public page shows and
  // therefore the one number worth checking at a glance.
  const nextByProgramme = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const map = new Map()
    for (const o of occurrences) {
      if (o.is_skipped || o.occurs_on < today) continue
      if (!map.has(o.programme_id)) map.set(o.programme_id, o)
    }
    return map
  }, [occurrences])

  const countsByProgramme = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const map = new Map()
    for (const o of occurrences) {
      const c = map.get(o.programme_id) ?? { upcoming: 0, past: 0, skipped: 0 }
      if (o.is_skipped) c.skipped += 1
      else if (o.occurs_on < today) c.past += 1
      else c.upcoming += 1
      map.set(o.programme_id, c)
    }
    return map
  }, [occurrences])

  async function saveProgramme(programme, form) {
    const ruleChanged = programme.rule_type === 'ordinal_weekday' && (
      Number(form.rule_week) !== programme.rule_week ||
      Number(form.rule_weekday) !== programme.rule_weekday ||
      form.start_time !== String(programme.start_time).slice(0, 5)
    )

    const patch = {
      name:             form.name.trim(),
      start_time:       form.start_time,
      duration_minutes: form.duration_minutes === '' ? null : Number(form.duration_minutes),
      join_url:         form.join_url.trim() || null,
      location:         form.location.trim() || null,
      is_active:        form.is_active
    }
    if (programme.rule_type === 'ordinal_weekday') {
      patch.rule_week    = Number(form.rule_week)
      patch.rule_weekday = Number(form.rule_weekday)
    }

    if (ruleChanged) {
      const { removed, added } = await applyRuleChange(programme.id, patch)
      const kept = (countsByProgramme.get(programme.id)?.upcoming ?? 0) - removed
      setNotice(
        `Rule updated. ${removed} future ${removed === 1 ? 'date was' : 'dates were'} rebuilt` +
        (kept > 0
          ? `, and ${kept} ${kept === 1 ? 'was' : 'were'} left alone because ${kept === 1 ? 'it carries' : 'they carry'} a recap, a note, or a notification that already went out.`
          : '.')
      )
    } else {
      await updateProgramme(programme.id, patch)
      setNotice('Saved.')
    }

    setEditingId(null)
    await load()
  }

  return (
    <section className="admin-prog">
      <header className="admin-prog__head">
        <div>
          <h1 className="page-title">Programmes</h1>
          <p className="admin-prog__lede">
            The rhythm the community meets on. Three programmes carry a rule and
            their dates come from it a year ahead. Equip is created by hand.
          </p>
        </div>
      </header>

      {notice && <p className="admin-prog__notice" role="status">{notice}</p>}
      {error  && <p className="admin-prog__error" role="alert">{error}</p>}

      {!loading && (
        <SharedLink
          url={sharedUrl}
          onSaved={async (next) => { setSharedUrl(next); setNotice('Shared link saved.'); await load() }}
        />
      )}

      {loading ? (
        <p className="admin-prog__state">Loading programmes</p>
      ) : (
        <ol className="admin-prog__list">
          {programmes.map((p) => (
            <ProgrammeRow
              key={p.id}
              programme={p}
              sharedUrl={sharedUrl}
              next={nextByProgramme.get(p.id) ?? null}
              counts={countsByProgramme.get(p.id) ?? { upcoming: 0, past: 0, skipped: 0 }}
              editing={editingId === p.id}
              onEdit={() => { setEditingId(p.id); setNotice('') }}
              onCancel={() => setEditingId(null)}
              onSave={(form) => saveProgramme(p, form)}
            />
          ))}
        </ol>
      )}

      {!loading && (
        <Occurrences
          programmes={programmes}
          occurrences={occurrences}
          onChanged={load}
          onNotice={setNotice}
        />
      )}
    </section>
  )
}

/* ============ Shared link ============ */

// Sits above the programmes because it applies to all of them. Editing in
// place rather than behind a modal: it is one field and it changes rarely, so
// a dialog would be more ceremony than the change deserves.
function SharedLink({ url, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue]     = useState(url)
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')

  async function save() {
    setSaving(true)
    setErr('')
    try {
      const next = value.trim()
      await saveDefaultJoinUrl(next)
      setEditing(false)
      await onSaved(next)
    } catch (e) {
      setErr(friendlyProgrammeError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={'admin-prog__shared' + (url ? '' : ' admin-prog__shared--empty')}>
      <div className="admin-prog__shared-main">
        <p className="admin-prog__shared-label">Shared joining link</p>
        {url
          ? <p className="admin-prog__shared-url">{url}</p>
          : <p className="admin-prog__shared-none">
              Not set. Every programme without its own link has nowhere to send people.
            </p>}
        {!editing && (
          <p className="admin-prog__hint">
            Used by any programme that does not set its own, and by any date
            that does not set one either.
          </p>
        )}
      </div>

      {!editing && (
        <button
          type="button"
          className={url ? 'admin-prog__action' : 'admin-prog__save'}
          onClick={() => { setValue(url); setEditing(true) }}
        >
          {url ? 'Change' : 'Set link'}
        </button>
      )}

      {editing && (
        <div className="admin-prog__inline">
          {err && <p className="admin-prog__form-error" role="alert">{err}</p>}
          <label className="admin-prog__label" htmlFor="shared-url">Link</label>
          <input
            id="shared-url"
            type="url"
            className="admin-prog__input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://"
            autoComplete="off"
            spellCheck="false"
            autoFocus
          />
          <p className="admin-prog__hint">
            Members see this. The public programmes page never does, whoever is looking.
          </p>
          <div className="admin-prog__inline-actions">
            <button type="button" className="admin-prog__cancel" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="admin-prog__save" onClick={save} disabled={saving}>
              {saving ? 'Saving' : 'Save link'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============ Programme row ============ */

function ProgrammeRow({ programme, sharedUrl, next, counts, editing, onEdit, onCancel, onSave }) {
  const manual   = programme.rule_type === 'manual'
  const link     = resolveJoinUrl({ programme, sharedUrl })
  const nextText = next
    ? occurrenceDate(next.occurs_on, { weekday: 'long', day: 'numeric', month: 'long' })
    : null

  return (
    <li className={'admin-prog__row' + (programme.is_active ? '' : ' admin-prog__row--off')}>
      <div className="admin-prog__row-main">
        <div className="admin-prog__row-head">
          <h2 className="admin-prog__name">{programme.name}</h2>
          {!programme.is_active && <span className="admin-prog__pill">Hidden</span>}
          {manual && <span className="admin-prog__pill">By hand</span>}
        </div>

        <p className="admin-prog__rule">{ruleInWords(programme)}</p>

        <p className="admin-prog__meta">
          {nextText
            ? <span className="admin-prog__next">Next: {nextText}</span>
            : <span className="admin-prog__next admin-prog__next--none">
                {manual ? 'Nothing scheduled' : 'No date set'}
              </span>}
          {counts.upcoming > 0 && (
            <><span className="admin-prog__dot" aria-hidden="true">·</span>
              <span>{counts.upcoming} upcoming</span></>
          )}
          {counts.past > 0    && <><span className="admin-prog__dot" aria-hidden="true">·</span><span>{counts.past} past</span></>}
          {counts.skipped > 0 && <><span className="admin-prog__dot" aria-hidden="true">·</span><span>{counts.skipped} skipped</span></>}
        </p>

        {/* An inherited link and a link set here look identical otherwise,
            and only the second is a deliberate difference. */}
        {link.source === 'programme' && (
          <p className="admin-prog__link">Own link: {link.url}</p>
        )}
      </div>

      {!editing && (
        <button type="button" className="admin-prog__action" onClick={onEdit}>Edit</button>
      )}

      {editing && (
        <ProgrammeForm programme={programme} onCancel={onCancel} onSave={onSave} />
      )}
    </li>
  )
}

/* ============ Programme form ============ */

function ProgrammeForm({ programme, onCancel, onSave }) {
  const manual = programme.rule_type === 'manual'

  const [form, setForm] = useState({
    name:             programme.name,
    rule_week:        programme.rule_week ?? 1,
    rule_weekday:     programme.rule_weekday ?? 0,
    start_time:       String(programme.start_time ?? '19:00:00').slice(0, 5),
    duration_minutes: programme.duration_minutes == null ? '' : String(programme.duration_minutes),
    join_url:         programme.join_url ?? '',
    location:         programme.location ?? '',
    is_active:        programme.is_active
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const ruleChanged = !manual && (
    Number(form.rule_week) !== programme.rule_week ||
    Number(form.rule_weekday) !== programme.rule_weekday ||
    form.start_time !== String(programme.start_time ?? '').slice(0, 5)
  )

  const duration = form.duration_minutes === '' ? null : Number(form.duration_minutes)
  const durationBad = duration !== null && (!Number.isFinite(duration) || duration < 15 || duration > 480)
  const ready = form.name.trim() && form.start_time && !durationBad

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

      <div className="admin-prog__field">
        <label className="admin-prog__label" htmlFor={`name-${programme.id}`}>Name</label>
        <input
          id={`name-${programme.id}`}
          type="text"
          className="admin-prog__input"
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          maxLength={80}
          autoComplete="off"
        />
      </div>

      {!manual && (
        <div className="admin-prog__field-row">
          <div className="admin-prog__field">
            <label className="admin-prog__label" htmlFor={`week-${programme.id}`}>Week of the month</label>
            <select
              id={`week-${programme.id}`}
              className="admin-prog__input"
              value={form.rule_week}
              onChange={(e) => set({ rule_week: e.target.value })}
            >
              {WEEK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="admin-prog__field">
            <label className="admin-prog__label" htmlFor={`dow-${programme.id}`}>Day</label>
            <select
              id={`dow-${programme.id}`}
              className="admin-prog__input"
              value={form.rule_weekday}
              onChange={(e) => set({ rule_weekday: e.target.value })}
            >
              {WEEKDAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="admin-prog__field-row">
        <div className="admin-prog__field">
          <label className="admin-prog__label" htmlFor={`time-${programme.id}`}>Start time, WAT</label>
          <input
            id={`time-${programme.id}`}
            type="time"
            className="admin-prog__input"
            value={form.start_time}
            onChange={(e) => set({ start_time: e.target.value })}
          />
        </div>

        <div className="admin-prog__field">
          <label className="admin-prog__label" htmlFor={`dur-${programme.id}`}>Length in minutes</label>
          <input
            id={`dur-${programme.id}`}
            type="number"
            inputMode="numeric"
            className="admin-prog__input"
            min={15}
            max={480}
            step={15}
            value={form.duration_minutes}
            onChange={(e) => set({ duration_minutes: e.target.value })}
          />
          {durationBad && <p className="admin-prog__hint admin-prog__hint--warn">Between 15 and 480 minutes.</p>}
        </div>
      </div>

      <div className="admin-prog__field">
        <label className="admin-prog__label" htmlFor={`url-${programme.id}`}>Its own joining link</label>
        <input
          id={`url-${programme.id}`}
          type="url"
          className="admin-prog__input"
          value={form.join_url}
          onChange={(e) => set({ join_url: e.target.value })}
          placeholder="Leave blank to use the shared link"
          autoComplete="off"
          spellCheck="false"
        />
        <p className="admin-prog__hint">
          Only fill this in when this programme meets somewhere other than the
          shared room. Blank is the normal case.
        </p>
      </div>

      <div className="admin-prog__field">
        <label className="admin-prog__label" htmlFor={`loc-${programme.id}`}>Place</label>
        <input
          id={`loc-${programme.id}`}
          type="text"
          className="admin-prog__input"
          value={form.location}
          onChange={(e) => set({ location: e.target.value })}
          placeholder="Left blank while everything is online"
          autoComplete="off"
        />
      </div>

      <label className="admin-prog__check">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => set({ is_active: e.target.checked })}
        />
        <span>Show on the public programmes page</span>
      </label>

      {/* Said before the click, not after. A rule change rebuilds dates, and
          the count of what survives is the part worth knowing in advance. */}
      {ruleChanged && (
        <p className="admin-prog__hint admin-prog__hint--warn">
          Changing the rule rebuilds every future date that nobody has touched.
          Months carrying a recap, a note, or a notification that already went
          out stay where they are.
        </p>
      )}

      <div className="admin-prog__form-actions">
        <button type="button" className="admin-prog__cancel" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="admin-prog__save" onClick={submit} disabled={!ready || saving}>
          {saving ? 'Saving' : ruleChanged ? 'Save and rebuild dates' : 'Save'}
        </button>
      </div>
    </div>
  )
}
