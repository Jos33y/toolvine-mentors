import { useEffect } from 'react'
import './iosInstallSteps.css'

// Bottom-sheet overlay shown when an iOS visitor taps Install. iOS Safari
// has no beforeinstallprompt; we walk them through Share -> Add to Home
// Screen instead. Shared by the banner and the dashboard card.
export function IOSInstallSteps({ open, onClose }) {
  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [open])

  // Escape closes the sheet.
  useEffect(() => {
    if (!open) return undefined
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="ios-steps__backdrop"
        onClick={onClose}
        aria-label="Close install instructions"
      />
      <div
        className="ios-steps"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ios-steps-title"
      >
        <div className="ios-steps__handle" aria-hidden="true" />

        <header className="ios-steps__head">
          <div className="ios-steps__icon" aria-hidden="true">
            <img src="/app-icon-192.png" alt="" width="48" height="48" />
          </div>
          <div>
            <h2 id="ios-steps-title" className="ios-steps__title">Install ToolVine</h2>
            <p className="ios-steps__sub">Add ToolVine to your home screen.</p>
          </div>
        </header>

        <ol className="ios-steps__list">
          <li className="ios-steps__item">
            <span className="ios-steps__num">1</span>
            <span className="ios-steps__text">
              Tap the share button{' '}
              <span className="ios-steps__inline-icon" aria-hidden="true">
                <ShareIcon />
              </span>{' '}
              at the bottom of Safari.
            </span>
          </li>
          <li className="ios-steps__item">
            <span className="ios-steps__num">2</span>
            <span className="ios-steps__text">
              Scroll down and tap <strong>Add to Home Screen</strong>.
            </span>
          </li>
          <li className="ios-steps__item">
            <span className="ios-steps__num">3</span>
            <span className="ios-steps__text">
              Tap <strong>Add</strong> at the top right. The ToolVine icon appears on your home screen.
            </span>
          </li>
        </ol>

        <button type="button" className="ios-steps__done" onClick={onClose}>
          Got it
        </button>
      </div>
    </>
  )
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d="M8 1.5v8M8 1.5 5.5 4M8 1.5 10.5 4"
        fill="none" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M3 8v5.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8"
        fill="none" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}
