import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import { chapterOf } from '@/lib/chapters'
import {
  resourceFileUrl,
  resourcePreviewUrl,
  previewKindOf,
  friendlyResourceError,
  youTubeEmbedUrl,
  publishedLabel
} from '@/lib/resources'
import './resourceDetail.css'

const TYPE_LABEL = { file: 'File', link: 'Link', youtube: 'Video' }
const TYPE_ICON  = { file: 'resources', link: 'link', youtube: 'video' }

// Detail panel for a library resource. Follows UserDetailDrawer: portaled to
// document.body so position:fixed stays viewport-relative whatever transform an
// ancestor carries, slides from the right on desktop and up from the bottom on
// a phone.
//
// Opened from the query string rather than local state, so a mentor can send a
// mentee a link to one resource and the back button closes it.
export function ResourceDetail({ resource, categoryLabel, extraLabels, onClose }) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  // Mounts closed, then one frame later flips open so the slide animates.
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Opening a second resource without closing the first would otherwise keep
  // the previous scroll position.
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0
  }, [resource?.id])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const handleClose = () => {
    setOpen(false)
    setTimeout(onClose, 240)
  }

  if (!resource) return null

  const { icon, tone } = chapterOf(resource.category)
  const when = publishedLabel(resource)

  return createPortal(
    <>
      <button
        type="button"
        className={`rdd__backdrop ${open ? 'rdd__backdrop--open' : ''}`}
        onClick={handleClose}
        aria-label="Close resource"
      />

      <aside
        ref={panelRef}
        className={`rdd ${open ? 'rdd--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={resource.title}
      >
        <header className="rdd__head">
          <span className="rdd__kind">
            <Icon name={TYPE_ICON[resource.type] ?? 'resources'} size={14} />
            {TYPE_LABEL[resource.type] ?? resource.type}
          </span>
          <button type="button" className="rdd__close" onClick={handleClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="rdd__body">
          <div className="rdd__chapters">
            <span className={`rdd__chapter rdd__chapter--${tone}`}>
              <Icon name={icon} size={14} />
              {categoryLabel}
            </span>
            {extraLabels.map((label, i) => {
              const slug = (resource.extra_categories ?? [])[i]
              const extra = chapterOf(slug)
              return (
                <span key={label} className={`rdd__chapter rdd__chapter--${extra.tone}`}>
                  <Icon name={extra.icon} size={14} />
                  {label}
                </span>
              )
            })}
          </div>

          <h2 className="rdd__title">{resource.title}</h2>
          {when && <p className="rdd__when">Published {when}</p>}

          {/* The player lives here rather than on the card, so one plays at a
              time and at a size worth watching. */}
          {resource.type === 'youtube' && resource.youtube_id && (
            <div className="rdd__video">
              <iframe
                className="rdd__video-frame"
                src={youTubeEmbedUrl(resource.youtube_id)}
                title={resource.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {resource.type === 'file' && <FilePreview resource={resource} />}

          {resource.description && <p className="rdd__desc">{resource.description}</p>}
        </div>

        <footer className="rdd__foot">
          <ResourceAction resource={resource} />
        </footer>
      </aside>
    </>,
    document.body
  )
}

/* ============ Inline preview ============ */

// Images preview everywhere. A PDF previews only where a pointer exists,
// because iOS Safari refuses to render one inside a frame and shows an empty
// box instead. On a phone the footer button already opens it properly, so no
// preview is better than a blank rectangle plus a duplicate call to action.
function FilePreview({ resource }) {
  const kind = previewKindOf(resource.file_path)
  const [url,    setUrl]    = useState(null)
  const [state,  setState]  = useState('loading')

  const canEmbedPdf =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches

  const show = kind === 'image' || (kind === 'pdf' && canEmbedPdf)

  useEffect(() => {
    if (!show) return
    let cancelled = false
    setState('loading')
    setUrl(null)

    resourcePreviewUrl(resource.file_path)
      .then((signed) => {
        if (cancelled) return
        if (!signed) { setState('failed'); return }
        setUrl(signed)
        // An image reports its own load. A frame does not, reliably.
        if (kind === 'pdf') setState('ready')
      })
      .catch(() => { if (!cancelled) setState('failed') })

    return () => { cancelled = true }
  }, [resource.file_path, kind, show])

  if (!show) return null

  // A failed preview is silent. The footer button is the real path to the file
  // and an error block here would say the same thing twice.
  if (state === 'failed') return null

  return (
    <div className={`rdd__preview rdd__preview--${kind}`}>
      {state === 'loading' && (
        <p className="rdd__preview-state">Loading preview</p>
      )}

      {url && kind === 'image' && (
        <img
          className="rdd__preview-img"
          src={url}
          alt={resource.title}
          onLoad={() => setState('ready')}
          onError={() => setState('failed')}
        />
      )}

      {url && kind === 'pdf' && (
        <iframe
          className="rdd__preview-pdf"
          src={url}
          title={`Preview of ${resource.title}`}
          loading="lazy"
        />
      )}
    </div>
  )
}

/* ============ Action ============ */

function ResourceAction({ resource }) {
  const [busy,   setBusy]   = useState(false)
  const [failed, setFailed] = useState('')

  async function openFile() {
    if (busy) return
    setBusy(true); setFailed('')
    try {
      const url = await resourceFileUrl(resource.file_path)
      if (url) window.open(url, '_blank', 'noopener')
    } catch (e) {
      setFailed(friendlyResourceError(e))
    } finally {
      setBusy(false)
    }
  }

  if (resource.type === 'file') {
    return (
      <>
        {failed && <p className="rdd__error" role="alert">{failed}</p>}
        <button type="button" className="rdd__action" onClick={openFile} disabled={busy}>
          {busy ? 'Opening' : 'Open file'}
        </button>
        <p className="rdd__note">Opens through a private link that expires shortly after.</p>
      </>
    )
  }

  if (resource.type === 'link') {
    return (
      <a
        className="rdd__action"
        href={resource.external_url}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open link
        <Icon name="externalLink" size={14} />
      </a>
    )
  }

  return (
    <a
      className="rdd__action rdd__action--quiet"
      href={`https://youtu.be/${resource.youtube_id}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      Watch on YouTube
      <Icon name="externalLink" size={14} />
    </a>
  )
}
