import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import { useAuth } from '@/stores/useAuth'
import { useCategories } from '@/hooks/useCategories'
import { chapterOf } from '@/lib/chapters'
import { shortDate } from '@/lib/format'
import {
  fetchResources,
  createResource,
  updateResource,
  setResourceArchived,
  uploadResourceFile,
  tryRemoveResourceFile,
  resourceFileUrl,
  resourceSchema,
  parseYouTubeId,
  matchesSearch,
  chaptersOf,
  publishedLabel,
  friendlyResourceError
} from '@/lib/resources'
import './resources.css'

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'file',     label: 'Files' },
  { key: 'link',     label: 'Links' },
  { key: 'youtube',  label: 'Videos' },
  { key: 'archived', label: 'Archived' }
]

const TYPE_OPTIONS = [
  { value: 'file',    label: 'File' },
  { value: 'link',    label: 'Link' },
  { value: 'youtube', label: 'Video' }
]

const TYPE_LABEL = { file: 'File', link: 'Link', youtube: 'Video' }

const BLANK = {
  title: '', description: '', category: '', type: 'file',
  external_url: '', youtube_url: '', file_path: '', published_on: ''
}

export function Resources() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [notice,  setNotice]  = useState('')

  const [searchParams, setSearchParams] = useSearchParams()
  const rawFilter = searchParams.get('filter')
  const filter = FILTERS.some((f) => f.key === rawFilter) ? rawFilter : 'all'
  const [search, setSearch] = useState('')

  const [open,      setOpen]      = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [draft,     setDraft]     = useState(BLANK)
  const [file,      setFile]      = useState(null)
  const [extra,     setExtra]     = useState([])
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [busyId,    setBusyId]    = useState(null)
  const formRef = useRef(null)

  const profile = useAuth((s) => s.profile)
  const { resourceCategories: categories } = useCategories()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await fetchResources({ includeArchived: true }))
    } catch (e) {
      setError(friendlyResourceError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // The panel mounts at the top of the page. Someone editing a row twelve down
  // would otherwise click Edit and watch nothing happen.
  useEffect(() => {
    if (!open || !formRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    formRef.current.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    formRef.current.querySelector('input, select, textarea')?.focus({ preventScroll: true })
  }, [open, editing])

  function setFilter(next) {
    const params = new URLSearchParams(searchParams)
    if (next === 'all') params.delete('filter')
    else params.set('filter', next)
    setSearchParams(params, { replace: true })
  }

  const counts = useMemo(() => ({
    all:      rows.filter((r) => !r.is_archived).length,
    file:     rows.filter((r) => !r.is_archived && r.type === 'file').length,
    link:     rows.filter((r) => !r.is_archived && r.type === 'link').length,
    youtube:  rows.filter((r) => !r.is_archived && r.type === 'youtube').length,
    archived: rows.filter((r) => r.is_archived).length
  }), [rows])

  const visible = useMemo(() => rows
    .filter((r) => (filter === 'archived'
      ? r.is_archived
      : !r.is_archived && (filter === 'all' || r.type === filter)))
    .filter((r) => matchesSearch(r, search)),
  [rows, filter, search])

  /* ============ Form ============ */

  function openNew() {
    setEditing(null)
    setDraft({ ...BLANK, category: categories[0]?.slug ?? '' })
    setExtra([])
    setFile(null); setFormError(''); setFieldErrors({}); setNotice('')
    setOpen(true)
  }

  function openEdit(row) {
    setEditing(row)
    setDraft({
      title:        row.title,
      description:  row.description ?? '',
      category:     row.category,
      type:         row.type,
      external_url: row.external_url ?? '',
      youtube_url:  row.youtube_id ? `https://youtu.be/${row.youtube_id}` : '',
      file_path:    row.file_path ?? '',
      published_on: row.published_on ?? ''
    })
    setExtra(row.extra_categories ?? [])
    setFile(null); setFormError(''); setFieldErrors({}); setNotice('')
    setOpen(true)
  }

  function closeForm() {
    setOpen(false); setEditing(null); setFile(null); setExtra([])
    setFormError(''); setFieldErrors({})
  }

  // D47 mirrored in the form so the operator watches the old field empty rather
  // than discovering at save time that it was dropped.
  function toggleExtra(slug) {
    setExtra((list) => list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug])
  }

  function changeLead(e) {
    const next = e.target.value
    setDraft((d) => ({ ...d, category: next }))
    setExtra((list) => list.filter((s) => s !== next))
  }

  function changeType(nextType) {
    setDraft((d) => ({
      ...d,
      type: nextType,
      external_url: nextType === 'link'    ? d.external_url : '',
      youtube_url:  nextType === 'youtube' ? d.youtube_url  : '',
      file_path:    nextType === 'file'    ? d.file_path    : ''
    }))
    setFile(null)
    setFieldErrors({})
  }

  async function save() {
    if (saving) return
    setSaving(true); setFormError(''); setFieldErrors({})

    let uploadedPath = null
    try {
      // Upload first so file_path is present before the schema sees the draft.
      let values = { ...draft }
      if (values.type === 'file' && file) {
        uploadedPath = await uploadResourceFile(values.title || 'resource', file)
        values.file_path = uploadedPath
      }

      const parsed = resourceSchema.safeParse(values)
      if (!parsed.success) {
        const map = {}
        for (const issue of parsed.error.issues) map[issue.path[0]] = issue.message
        setFieldErrors(map)
        // Nothing was written, so an object uploaded a moment ago is an orphan.
        if (uploadedPath) await tryRemoveResourceFile(uploadedPath)
        return
      }

      if (editing) {
        await updateResource(editing.id, values, {
          previousFilePath: editing.file_path,
          extraChapters: extra
        })
        setNotice(`${values.title} updated.`)
      } else {
        await createResource(values, { uploadedBy: profile.id, extraChapters: extra })
        setNotice(`${values.title} added to the library.`)
      }

      closeForm()
      await load()
    } catch (e) {
      if (uploadedPath) await tryRemoveResourceFile(uploadedPath)
      setFormError(friendlyResourceError(e))
    } finally {
      setSaving(false)
    }
  }

  /* ============ Row actions ============ */

  async function toggleArchived(row) {
    if (busyId) return
    setBusyId(row.id); setError(''); setNotice('')
    try {
      await setResourceArchived(row.id, !row.is_archived)
      setNotice(row.is_archived
        ? `${row.title} is back in the library.`
        : `${row.title} archived. Members no longer see it.`)
      await load()
    } catch (e) {
      setError(friendlyResourceError(e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="admin-res">
      <header className="admin-res__head">
        <div>
          <h1 className="admin-res__title">Resources</h1>
          <p className="admin-res__lede">
            Files, links, and videos for the library. Members browse and search what is here.
            Nothing is deleted, so an item you archive keeps its place if you want it back.
          </p>
        </div>
        <div className="admin-res__head-actions">
          <button type="button" className="admin-res__new" onClick={openNew}>
            <Icon name="plus" size={16} />
            Add a resource
          </button>
        </div>
      </header>

      {error  && <div className="admin-res__alert"  role="alert">{error}</div>}
      {notice && <div className="admin-res__notice" role="status">{notice}</div>}

      {open && (
        <ResourceForm
          panelRef={formRef}
          draft={draft} setDraft={setDraft}
          categories={categories}
          extra={extra} onToggleExtra={toggleExtra} onChangeLead={changeLead}
          editing={editing}
          file={file} setFile={setFile}
          onTypeChange={changeType}
          saving={saving}
          formError={formError} fieldErrors={fieldErrors}
          onCancel={closeForm} onSave={save}
        />
      )}

      <div className="admin-res__controls">
        <nav className="admin-res__filters" aria-label="Filter resources">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={'admin-res__filter' + (filter === f.key ? ' admin-res__filter--active' : '')}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
            >
              <span>{f.label}</span>
              <span className="admin-res__filter-count">{counts[f.key] ?? 0}</span>
            </button>
          ))}
        </nav>

        <div className="admin-res__search">
          <Icon name="search" size={16} className="admin-res__search-icon" />
          <input
            type="search"
            className="admin-res__search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search titles and descriptions"
            aria-label="Search resources"
          />
        </div>
      </div>

      {loading ? (
        <ul className="admin-res__list" aria-busy="true">
          {[0, 1, 2].map((i) => <li key={i} className="admin-res__row admin-res__row--skel" />)}
        </ul>
      ) : visible.length === 0 ? (
        <Empty filter={filter} searching={search.trim() !== ''} onAdd={open ? null : openNew} />
      ) : (
        <ul className="admin-res__list">
          {visible.map((row) => (
            <ResourceRow
              key={row.id}
              row={row}
              categoryLabel={categories.find((c) => c.slug === row.category)?.label ?? row.category}
              extraLabels={(row.extra_categories ?? [])
                .map((slug) => categories.find((c) => c.slug === slug)?.label ?? slug)}
              busy={busyId === row.id}
              onEdit={() => openEdit(row)}
              onToggle={() => toggleArchived(row)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

/* ============ Row ============ */

function ResourceRow({ row, categoryLabel, extraLabels, busy, onEdit, onToggle }) {
  const [opening, setOpening] = useState(false)

  async function preview() {
    if (row.type === 'link')    { window.open(row.external_url, '_blank', 'noopener'); return }
    if (row.type === 'youtube') { window.open(`https://youtu.be/${row.youtube_id}`, '_blank', 'noopener'); return }

    setOpening(true)
    try {
      const url = await resourceFileUrl(row.file_path)
      if (url) window.open(url, '_blank', 'noopener')
    } catch { /* the row keeps working; the library surfaces the real error */ }
    finally { setOpening(false) }
  }

  return (
    <li className={`admin-res__row${row.is_archived ? ' is-dead' : ''}`}>
      <div className="admin-res__row-text">
        <p className="admin-res__row-title">{row.title}</p>
        <p className="admin-res__row-meta">
          <span className={`admin-res__chapter-mark admin-res__chapter-mark--${chapterOf(row.category).tone}`}>
            <Icon name={chapterOf(row.category).icon} size={12} />
            {categoryLabel}
          </span>
          {extraLabels.length > 0 && (
            <span className="admin-res__also"> also {extraLabels.join(', ')}</span>
          )}
          {' · '}{TYPE_LABEL[row.type] ?? row.type}
          {row.published_on
            ? <> · Published {publishedLabel(row)}</>
            : <> · Added {shortDate(row.created_at)}</>}
          {row.updated_at && row.updated_at !== row.created_at && <> · Edited {shortDate(row.updated_at)}</>}
        </p>
        {row.description && <p className="admin-res__row-desc">{row.description}</p>}
      </div>

      <span className={`admin-res__pill admin-res__pill--${row.is_archived ? 'archived' : 'live'}`}>
        {row.is_archived ? 'Archived' : 'Live'}
      </span>

      <div className="admin-res__row-actions">
        <button type="button" className="admin-res__action" onClick={preview} disabled={opening}>
          {opening ? 'Opening' : 'Preview'}
        </button>
        <button type="button" className="admin-res__action" onClick={onEdit} disabled={busy}>
          Edit
        </button>
        <button
          type="button"
          className={'admin-res__action' + (row.is_archived ? '' : ' admin-res__action--danger')}
          onClick={onToggle}
          disabled={busy}
        >
          {row.is_archived ? 'Restore' : 'Archive'}
        </button>
      </div>
    </li>
  )
}

/* ============ Form ============ */

function ResourceForm({
  panelRef, draft, setDraft, categories, editing, file, setFile, extra, onToggleExtra, onChangeLead,
  onTypeChange, saving, formError, fieldErrors, onCancel, onSave
}) {
  const set = (key) => (e) => setDraft({ ...draft, [key]: e.target.value })
  const currentFile = draft.file_path ? draft.file_path.split('/').pop() : null
  const chosen = categories.find((c) => c.slug === draft.category)

  return (
    <div className="admin-res__form" ref={panelRef}>
      <h2 className="admin-res__form-title">
        {editing ? `Editing ${editing.title}` : 'Add a resource'}
      </h2>

      <div className="admin-res__field">
        <label className="admin-res__label" htmlFor="res-title">Title</label>
        <input
          id="res-title"
          type="text"
          className="admin-res__input"
          value={draft.title}
          onChange={set('title')}
          placeholder="What is this called"
          autoComplete="off"
        />
        {fieldErrors.title && <p className="admin-res__field-error">{fieldErrors.title}</p>}
      </div>

      <div className="admin-res__field">
        <label className="admin-res__label" htmlFor="res-desc">Description</label>
        <textarea
          id="res-desc"
          className="admin-res__input admin-res__input--area"
          value={draft.description}
          onChange={set('description')}
          rows={3}
          placeholder="One or two sentences on what a member gets from this."
        />
        {fieldErrors.description && <p className="admin-res__field-error">{fieldErrors.description}</p>}
      </div>

      <div className="admin-res__pair">
        <div className="admin-res__field">
          <label className="admin-res__label" htmlFor="res-category">Chapter</label>
          <select
            id="res-category"
            className="admin-res__input"
            value={draft.category}
            onChange={onChangeLead}
          >
            <option value="">Pick a chapter</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
          {chosen && (
            <p className={`admin-res__chapter admin-res__chapter--${chapterOf(chosen.slug).tone}`}>
              <Icon name={chapterOf(chosen.slug).icon} size={14} />
              {chosen.description}
            </p>
          )}
          {fieldErrors.category && <p className="admin-res__field-error">{fieldErrors.category}</p>}
        </div>

        <div className="admin-res__field">
          <span className="admin-res__label" id="res-type-label">Kind</span>
          <div className="admin-res__segment" role="group" aria-labelledby="res-type-label">
            {TYPE_OPTIONS.map((t) => (
              <button
                key={t.value}
                type="button"
                className={'admin-res__seg' + (draft.type === t.value ? ' admin-res__seg--active' : '')}
                onClick={() => onTypeChange(t.value)}
                aria-pressed={draft.type === t.value}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="admin-res__hint">
            One of the three. Switching clears what the other held.
          </p>
          {fieldErrors.type && <p className="admin-res__field-error">{fieldErrors.type}</p>}
        </div>
      </div>

      <div className="admin-res__field">
        <label className="admin-res__label" htmlFor="res-published">Published</label>
        <input
          id="res-published"
          type="date"
          className="admin-res__input admin-res__input--date"
          value={draft.published_on}
          onChange={set('published_on')}
        />
        <p className="admin-res__hint">
          Optional, and the date the author published it rather than the date you added it
          here. The newsletter shelf orders on this.
        </p>
        {fieldErrors.published_on && <p className="admin-res__field-error">{fieldErrors.published_on}</p>}
      </div>

      <div className="admin-res__field">
        <span className="admin-res__label" id="res-extra-label">Also belongs in</span>
        <div className="admin-res__extras" role="group" aria-labelledby="res-extra-label">
          {categories.filter((c) => c.slug !== draft.category).map((c) => {
            const on = extra.includes(c.slug)
            const { icon, tone } = chapterOf(c.slug)
            return (
              <button
                key={c.slug}
                type="button"
                className={`admin-res__extra admin-res__extra--${tone}` + (on ? ' admin-res__extra--on' : '')}
                onClick={() => onToggleExtra(c.slug)}
                aria-pressed={on}
              >
                <Icon name={icon} size={14} />
                {c.label}
              </button>
            )
          })}
        </div>
        <p className="admin-res__hint">
          Optional. A resource shows under every chapter you pick, and carries the main one
          as its mark. Most belong in one.
        </p>
      </div>

      {draft.type === 'file' && (
        <div className="admin-res__field">
          <label className="admin-res__label" htmlFor="res-file">
            {currentFile ? 'Replace the file' : 'File'}
          </label>
          {currentFile && !file && (
            <p className="admin-res__current">
              <Icon name="resources" size={14} />
              {currentFile}
            </p>
          )}
          <input
            id="res-file"
            type="file"
            className="admin-res__file-input"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <label className="admin-res__drop" htmlFor="res-file">
            <Icon name="plus" size={18} />
            <span className="admin-res__drop-text">
              {file ? file.name : currentFile ? 'Choose a different file' : 'Choose a file'}
            </span>
            {file && <span className="admin-res__drop-size">{humanSize(file.size)}</span>}
          </label>
          <p className="admin-res__hint">
            Up to 25MB. PDF, documents, slides, audio, and images. Members download it through a
            private link that expires, so the file is never publicly addressable.
          </p>
          {fieldErrors.file_path && <p className="admin-res__field-error">{fieldErrors.file_path}</p>}
        </div>
      )}

      {draft.type === 'link' && (
        <div className="admin-res__field">
          <label className="admin-res__label" htmlFor="res-link">Address</label>
          <input
            id="res-link"
            type="url"
            className="admin-res__input"
            value={draft.external_url}
            onChange={set('external_url')}
            placeholder="https://example.com/article"
            autoComplete="off"
          />
          {fieldErrors.external_url && <p className="admin-res__field-error">{fieldErrors.external_url}</p>}
        </div>
      )}

      {draft.type === 'youtube' && (
        <div className="admin-res__field">
          <label className="admin-res__label" htmlFor="res-yt">YouTube address</label>
          <input
            id="res-yt"
            type="url"
            className="admin-res__input"
            value={draft.youtube_url}
            onChange={set('youtube_url')}
            placeholder="https://youtu.be/..."
            autoComplete="off"
          />
          <p className="admin-res__hint">
            {parseYouTubeId(draft.youtube_url)
              ? 'Video recognised. It plays inside the library.'
              : 'Paste the address from the browser or the Share button. A channel or playlist will not work.'}
          </p>
          {fieldErrors.youtube_url && <p className="admin-res__field-error">{fieldErrors.youtube_url}</p>}
        </div>
      )}

      {formError && <p className="admin-res__form-error" role="alert">{formError}</p>}

      <div className="admin-res__form-actions">
        <button type="button" className="admin-res__save" onClick={onSave} disabled={saving}>
          {saving ? 'Saving' : editing ? 'Save changes' : 'Add to library'}
        </button>
        <button type="button" className="admin-res__action" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/* ============ Empty ============ */

function Empty({ filter, searching, onAdd }) {
  if (searching) {
    return (
      <div className="admin-res__empty">
        <p className="admin-res__empty-title">Nothing matches that search.</p>
        <p className="admin-res__empty-body">Try fewer words, or clear the filter above.</p>
      </div>
    )
  }

  if (filter === 'archived') {
    return (
      <div className="admin-res__empty">
        <p className="admin-res__empty-title">Nothing archived.</p>
        <p className="admin-res__empty-body">
          Archiving takes an item out of the member library without losing it. Anything you
          archive appears here and can be restored.
        </p>
      </div>
    )
  }

  if (filter !== 'all') {
    const label = FILTERS.find((f) => f.key === filter)?.label.toLowerCase() ?? ''
    return (
      <div className="admin-res__empty">
        <p className="admin-res__empty-title">No {label} yet.</p>
        <p className="admin-res__empty-body">Add one, or switch back to all resources.</p>
      </div>
    )
  }

  return (
    <div className="admin-res__empty">
      <p className="admin-res__empty-title">The library is empty.</p>
      <p className="admin-res__empty-body">
        Add a file, a link, or a video and sort it into one of the six areas. Every signed-in
        member sees it straight away, and nobody but an administrator can add to it.
      </p>
      {onAdd && (
        <button type="button" className="admin-res__save" onClick={onAdd}>
          Add the first resource
        </button>
      )}
    </div>
  )
}
