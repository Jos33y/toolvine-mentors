import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/shared/Logo/Logo'
import { RevealOnScroll } from '@/components/shared/RevealOnScroll/RevealOnScroll'
import bales01   from '@/assets/outreach/bales-of-mercy-2025-01.jpg'
import bales02   from '@/assets/outreach/bales-of-mercy-2025-02.jpg'
import bales03   from '@/assets/outreach/bales-of-mercy-2025-03.jpg'
import bales04   from '@/assets/outreach/bales-of-mercy-2025-04.jpg'
import divine01  from '@/assets/outreach/divine-offspring-2025-01.jpg'
import divine02  from '@/assets/outreach/divine-offspring-2025-02.jpg'
import divine03  from '@/assets/outreach/divine-offspring-2025-03.jpg'
import divine04  from '@/assets/outreach/divine-offspring-2025-04.jpg'
import divine05  from '@/assets/outreach/divine-offspring-2025-05.jpg'
import divine06  from '@/assets/outreach/divine-offspring-2025-06.jpg'
import './Outreach.css'

/* ============ Data ============ */

const EVENTS = [
  {
    id:     'bales-of-mercy-2025',
    title:  'Bales of Mercy Orphanage',
    date:   'August 2025',
    place:  'Lagos, Nigeria',
    brief:  'An outreach to Bales of Mercy Orphanage, marking our 4th year anniversary.',
    photos: [bales01, bales02, bales03, bales04]
  },
  {
    id:     'divine-offspring-2025',
    title:  'Divine Offspring School',
    date:   'August 2025',
    place:  'Ikeja, Lagos',
    brief:  'A character education session with the pupils at Divine Offspring School, Ikeja. Part of our 4th year anniversary outreach.',
    photos: [divine01, divine02, divine03, divine04, divine05, divine06]
  }
]

/* ============ Component ============ */

export function Outreach() {
  const [lightboxEventId, setLightboxEventId] = useState(null)
  const [lightboxIndex,   setLightboxIndex]   = useState(0)

  const currentEvent  = lightboxEventId
    ? EVENTS.find((e) => e.id === lightboxEventId)
    : null
  const currentPhotos = currentEvent?.photos ?? []

  const openLightbox = useCallback((eventId, index) => {
    setLightboxEventId(eventId)
    setLightboxIndex(index)
  }, [])

  const closeLightbox = useCallback(() => {
    setLightboxEventId(null)
  }, [])

  const goPrev = useCallback(() => {
    setLightboxIndex((i) => Math.max(0, i - 1))
  }, [])

  const goNext = useCallback(() => {
    setLightboxIndex((i) => Math.min(currentPhotos.length - 1, i + 1))
  }, [currentPhotos.length])

  return (
    <div className="outreach">
      <div className="outreach__atmosphere" aria-hidden="true" />

      {/* Hero */}
      <header className="outreach__hero">
        <div className="outreach__watermark" aria-hidden="true">
          <Logo variant="mark" size={400} />
        </div>

        <p className="outreach__eyebrow">IN THE COMMUNITY</p>
        <h1 className="outreach__title">
          <span className="outreach__title-line">Where the work</span>
          <em className="outreach__title-italic">meets the world.</em>
        </h1>
        <p className="outreach__intro">
          Toolvine steps outside the mentoring room. This is a record of who we visited,
          when, and what took place. New entries land as they happen.
        </p>
      </header>

      <div className="outreach__divider" aria-hidden="true">
        <span className="outreach__divider-rule" />
        <span className="outreach__divider-mark">&#8258;</span>
        <span className="outreach__divider-rule" />
      </div>

      {/* Events list */}
      <section className="outreach__events" aria-label="Recent outreaches">
        <div className="outreach__events-inner">
          {EVENTS.map((event, i) => (
            <RevealOnScroll key={event.id} threshold={0.15} delay={i * 100}>
              <article className="outreach__event">
                <div className="outreach__event-head">
                  <p className="outreach__event-eyebrow">{event.date.toUpperCase()}</p>
                  <h2 className="outreach__event-title">{event.title}</h2>
                  <p className="outreach__event-place">{event.place}</p>
                </div>

                <p className="outreach__event-brief">{event.brief}</p>

                {event.photos.length > 0 ? (
                  <div className="outreach__event-photos">
                    <button
                      type="button"
                      className="outreach__event-photo outreach__event-photo--hero"
                      onClick={() => openLightbox(event.id, 0)}
                      aria-label={`Open photo 1 of ${event.photos.length} from ${event.title}`}
                    >
                      <img
                        src={event.photos[0]}
                        alt=""
                        loading={i === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                    </button>

                    {event.photos.length > 1 && (
                      <div className="outreach__event-photo-grid">
                        {event.photos.slice(1).map((src, j) => (
                          <button
                            key={j}
                            type="button"
                            className="outreach__event-photo"
                            onClick={() => openLightbox(event.id, j + 1)}
                            aria-label={`Open photo ${j + 2} of ${event.photos.length} from ${event.title}`}
                          >
                            <img
                              src={src}
                              alt=""
                              loading="lazy"
                              decoding="async"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="outreach__event-placeholder" aria-label="Photos coming soon">
                    <span className="outreach__event-placeholder-mark" aria-hidden="true">&#8258;</span>
                    <p className="outreach__event-placeholder-text">
                      Photographs from this outreach are being prepared for the site.
                    </p>
                  </div>
                )}
              </article>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* Close */}
      <section className="outreach__close">
        <div className="outreach__close-inner">
          <p className="outreach__close-eyebrow">HELP US KEEP GOING</p>
          <p className="outreach__close-body">
            Every outreach is carried by people who give time, resources, and belief.
            There is a place for you in the work.
          </p>
          <Link to="/get-involved" className="outreach__close-cta">
            Get involved <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>

      {/* Lightbox */}
      {currentEvent && (
        <Lightbox
          photos={currentPhotos}
          index={lightboxIndex}
          eventTitle={currentEvent.title}
          onClose={closeLightbox}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
    </div>
  )
}

/* ============ Lightbox ============
   Native <dialog> element. Top layer so it always sits above the page
   without z-index gymnastics. Arrow keys navigate, Escape closes,
   backdrop click closes. */

function Lightbox({ photos, index, eventTitle, onClose, onPrev, onNext }) {
  const dialogRef = useRef(null)

  const hasPrev = index > 0
  const hasNext = index < photos.length - 1

  // Open the modal when mounted, close when unmounted.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    return () => {
      if (dialog.open) dialog.close()
    }
  }, [])

  // Native close events (Escape, form method="dialog") also close via React.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handleClose = () => onClose()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

  // Arrow-key navigation while lightbox is open.
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft'  && hasPrev) { e.preventDefault(); onPrev() }
      if (e.key === 'ArrowRight' && hasNext) { e.preventDefault(); onNext() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [hasPrev, hasNext, onPrev, onNext])

  // Backdrop click: only close if the click landed on the dialog element
  // itself (backdrop) rather than any of its inner content.
  const handleDialogClick = (e) => {
    if (e.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className="outreach__lightbox"
      aria-label={`Photo viewer for ${eventTitle}`}
      onClick={handleDialogClick}
    >
      <button
        type="button"
        className="outreach__lightbox-close"
        onClick={onClose}
        aria-label="Close photo viewer"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <div className="outreach__lightbox-content">
        <img
          key={index}
          src={photos[index]}
          alt=""
          className="outreach__lightbox-image"
        />
      </div>

      <div className="outreach__lightbox-controls">
        <button
          type="button"
          className="outreach__lightbox-nav"
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="Previous photo"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <p className="outreach__lightbox-counter" aria-live="polite">
          {index + 1} / {photos.length}
        </p>

        <button
          type="button"
          className="outreach__lightbox-nav"
          onClick={onNext}
          disabled={!hasNext}
          aria-label="Next photo"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </dialog>
  )
}
