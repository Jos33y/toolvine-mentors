import { useCallback, useEffect, useState } from 'react'
import { Icon } from '@/components/shared/Icon/Icon'
import {
  fetchAllPartners,
  createPartner,
  updatePartner,
  setPartnerVisible,
  deletePartner,
  uploadPartnerLogo,
  tryRemovePartnerLogo,
  partnerLogoUrl
} from '@/lib/partners'
import './partners.css'

const BLANK = {
  name:          '',
  description:   '',
  website_url:   '',
  display_order: 0,
  is_visible:    true
}

export function Partners() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  // null means the form is closed. A row object means edit. BLANK means create.
  const [draft,     setDraft]     = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [logoFile,  setLogoFile]  = useState(null)
  const [clearLogo, setClearLogo] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState('')

  const [busyId,  setBusyId]  = useState(null)
  const [pending, setPending] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRows(await fetchAllPartners())
    } catch (e) {
      setError(friendly(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setDraft({ ...BLANK, display_order: nextOrder(rows) })
    setEditingId(null)
    setLogoFile(null)
    setClearLogo(false)
    setFormError('')
  }

  function openEdit(row) {
    setDraft({
      name:          row.name,
      description:   row.description   ?? '',
      website_url:   row.website_url   ?? '',
      display_order: row.display_order,
      is_visible:    row.is_visible
    })
    setEditingId(row.id)
    setLogoFile(null)
    setClearLogo(false)
    setFormError('')
  }

  function closeForm() {
    setDraft(null)
    setEditingId(null)
    setLogoFile(null)
    setClearLogo(false)
    setFormError('')
  }

  async function save() {
    if (saving) return
    setSaving(true)
    setFormError('')

    const existing = rows.find((r) => r.id === editingId) ?? null

    try {
      let logoPath

      if (logoFile) {
        logoPath = await uploadPartnerLogo(draft.name || 'partner', logoFile)
      } else if (clearLogo) {
        logoPath = null
      }

      if (editingId) {
        await updatePartner(editingId, draft, { logoPath })
        // Old object only goes once the row no longer points at it.
        if (logoPath !== undefined && existing?.logo_path) {
          await tryRemovePartnerLogo(existing.logo_path)
        }
      } else {
        await createPartner(draft, { logoPath: logoPath ?? null })
      }

      closeForm()
      await load()
    } catch (e) {
      setFormError(friendly(e))
    } finally {
      setSaving(false)
    }
  }

  async function toggleVisible(row) {
    setBusyId(row.id)
    try {
      await setPartnerVisible(row.id, !row.is_visible)
      await load()
    } catch (e) {
      setError(friendly(e))
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    const row = pending
    setBusyId(row.id)
    try {
      await deletePartner(row.id, { name: row.name, logoPath: row.logo_path })
      setPending(null)
      await load()
    } catch (e) {
      setError(friendly(e))
    } finally {
      setBusyId(null)
    }
  }

  const visibleCount = rows.filter((r) => r.is_visible).length

  return (
    <section className="admin-partners">
      <header className="admin-partners__head">
        <div>
          <h1 className="admin-partners__title">Partners</h1>
          <p className="admin-partners__lede">
            Organizations shown on the public partners page. Hidden rows stay here and stay off the site.
          </p>
        </div>
        <button type="button" className="admin-partners__new" onClick={openCreate}>
          <Icon name="plus" size={16} />
          Add partner
        </button>
      </header>

      <p className="admin-partners__count">
        {rows.length} total, {visibleCount} showing publicly
      </p>

      {error && (
        <div className="admin-partners__alert" role="alert">
          We could not load the partner list. {error}
        </div>
      )}

      {draft && (
        <PartnerForm
          draft={draft}
          setDraft={setDraft}
          isEdit={Boolean(editingId)}
          existingLogo={rows.find((r) => r.id === editingId)?.logo_path ?? null}
          logoFile={logoFile}
          setLogoFile={setLogoFile}
          clearLogo={clearLogo}
          setClearLogo={setClearLogo}
          saving={saving}
          formError={formError}
          onCancel={closeForm}
          onSave={save}
        />
      )}

      {loading ? (
        <ul className="admin-partners__list" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="admin-partners__row admin-partners__row--skel" />
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <EmptyState onAdd={openCreate} />
      ) : (
        <ul className="admin-partners__list">
          {rows.map((row) => (
            <PartnerRow
              key={row.id}
              row={row}
              busy={busyId === row.id}
              onEdit={() => openEdit(row)}
              onToggle={() => toggleVisible(row)}
              onDelete={() => setPending(row)}
            />
          ))}
        </ul>
      )}

      {pending && (
        <ConfirmDelete
          row={pending}
          busy={busyId === pending.id}
          onCancel={() => setPending(null)}
          onConfirm={confirmDelete}
        />
      )}
    </section>
  )
}

/* ============ Row ============ */

function PartnerRow({ row, busy, onEdit, onToggle, onDelete }) {
  const logo = partnerLogoUrl(row.logo_path)

  return (
    <li className={`admin-partners__row${row.is_visible ? '' : ' is-hidden'}`}>
      <span className="admin-partners__logo" aria-hidden="true">
        {logo
          ? <img src={logo} alt="" className="admin-partners__logo-img" />
          : <span className="admin-partners__logo-fallback">{row.name.slice(0, 1).toUpperCase()}</span>}
      </span>

      <div className="admin-partners__row-text">
        <p className="admin-partners__row-name">{row.name}</p>
        {row.description && (
          <p className="admin-partners__row-desc">{row.description}</p>
        )}
        <p className="admin-partners__row-meta">
          Order {row.display_order}
          {row.website_url && <> · {hostOf(row.website_url)}</>}
          {!row.is_visible && <> · Hidden</>}
        </p>
      </div>

      <div className="admin-partners__row-actions">
        <button
          type="button"
          className="admin-partners__action"
          onClick={onToggle}
          disabled={busy}
        >
          {row.is_visible ? 'Hide' : 'Show'}
        </button>
        <button
          type="button"
          className="admin-partners__action"
          onClick={onEdit}
          disabled={busy}
        >
          Edit
        </button>
        <button
          type="button"
          className="admin-partners__action admin-partners__action--danger"
          onClick={onDelete}
          disabled={busy}
        >
          Delete
        </button>
      </div>
    </li>
  )
}

/* ============ Form ============ */

function PartnerForm({
  draft, setDraft, isEdit, existingLogo,
  logoFile, setLogoFile, clearLogo, setClearLogo,
  saving, formError, onCancel, onSave
}) {
  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setDraft({ ...draft, [key]: value })
  }

  const currentLogo = clearLogo ? null : partnerLogoUrl(existingLogo)

  return (
    <div className="admin-partners__form">
      <h2 className="admin-partners__form-title">
        {isEdit ? 'Edit partner' : 'Add partner'}
      </h2>

      <div className="admin-partners__field">
        <label className="admin-partners__label" htmlFor="partner-name">Name</label>
        <input
          id="partner-name"
          type="text"
          className="admin-partners__input"
          value={draft.name}
          onChange={set('name')}
          maxLength={200}
          autoComplete="off"
        />
      </div>

      <div className="admin-partners__field">
        <label className="admin-partners__label" htmlFor="partner-desc">Description</label>
        <textarea
          id="partner-desc"
          className="admin-partners__input admin-partners__input--area"
          value={draft.description}
          onChange={set('description')}
          maxLength={600}
          rows={3}
        />
        <p className="admin-partners__hint">
          One or two sentences on who they are and what the two organizations do together. Optional.
        </p>
      </div>

      <div className="admin-partners__field-row">
        <div className="admin-partners__field">
          <label className="admin-partners__label" htmlFor="partner-url">Website</label>
          <input
            id="partner-url"
            type="url"
            className="admin-partners__input"
            value={draft.website_url}
            onChange={set('website_url')}
            placeholder="https://"
            autoComplete="off"
          />
        </div>

        <div className="admin-partners__field admin-partners__field--narrow">
          <label className="admin-partners__label" htmlFor="partner-order">Order</label>
          <input
            id="partner-order"
            type="number"
            className="admin-partners__input"
            value={draft.display_order}
            onChange={set('display_order')}
            min={0}
            max={9999}
          />
          <p className="admin-partners__hint">Lowest first.</p>
        </div>
      </div>

      <div className="admin-partners__field">
        <span className="admin-partners__label">Logo</span>
        <div className="admin-partners__logo-picker">
          {currentLogo && !logoFile && (
            <img src={currentLogo} alt="" className="admin-partners__logo-preview" />
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="admin-partners__file"
            onChange={(e) => { setLogoFile(e.target.files?.[0] ?? null); setClearLogo(false) }}
          />
          {existingLogo && !logoFile && !clearLogo && (
            <button
              type="button"
              className="admin-partners__action"
              onClick={() => setClearLogo(true)}
            >
              Remove logo
            </button>
          )}
        </div>
        <p className="admin-partners__hint">
          PNG, JPEG, or WebP up to 5MB. Saved as PNG at 512px on the long edge. SVG is not accepted.
        </p>
      </div>

      <label className="admin-partners__check">
        <input
          type="checkbox"
          checked={draft.is_visible}
          onChange={set('is_visible')}
        />
        <span>Show on the public partners page</span>
      </label>

      {formError && (
        <p className="admin-partners__form-error" role="alert">{formError}</p>
      )}

      <div className="admin-partners__form-actions">
        <button
          type="button"
          className="admin-partners__save"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? 'Saving' : isEdit ? 'Save changes' : 'Add partner'}
        </button>
        <button
          type="button"
          className="admin-partners__action"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

/* ============ Confirm delete ============ */

function ConfirmDelete({ row, busy, onCancel, onConfirm }) {
  return (
    <div className="admin-partners__dialog-wrap" role="dialog" aria-modal="true" aria-label="Delete partner">
      <div className="admin-partners__dialog">
        <h2 className="admin-partners__dialog-title">Delete {row.name}?</h2>
        <p className="admin-partners__dialog-body">
          The row and its logo are removed for good. If you only want it off the public
          page, hide it instead.
        </p>
        <div className="admin-partners__form-actions">
          <button
            type="button"
            className="admin-partners__save admin-partners__save--danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Deleting' : 'Delete partner'}
          </button>
          <button type="button" className="admin-partners__action" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============ Empty ============ */

function EmptyState({ onAdd }) {
  return (
    <div className="admin-partners__empty">
      <p className="admin-partners__empty-title">No partners yet.</p>
      <p className="admin-partners__empty-body">
        Add the organizations Toolvine works with. Each one needs a name. A description,
        website, and logo are optional. Hidden partners stay off the public page.
      </p>
      <button type="button" className="admin-partners__save" onClick={onAdd}>
        Add the first partner
      </button>
    </div>
  )
}

/* ============ Helpers ============ */

function nextOrder(rows) {
  if (rows.length === 0) return 0
  const visible = rows.filter((r) => r.is_visible)
  const pool = visible.length > 0 ? visible : rows
  return Math.max(...pool.map((r) => r.display_order)) + 10
}

function hostOf(url) {
  try { return new URL(url).host.replace(/^www\./, '') } catch { return url }
}

function friendly(err) {
  const msg = err?.message || String(err || '')
  if (/row-level security|permission denied/i.test(msg)) {
    return 'Your account does not have permission for that.'
  }
  if (/duplicate key/i.test(msg)) return 'That partner already exists.'
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Check your connection and try again.'
  return msg || 'Something did not go through. Try again.'
}
