import { useEffect, useState } from 'react'

// Install state shared by the marketing banner and the signed-in dashboard
// card. Captures the deferred prompt from Chrome/Edge, detects iOS Safari
// for the manual Add-to-Home-Screen path, suppresses everything once the
// app is running standalone, and remembers dismissals via localStorage.

const DISMISS_KEY = 'tv-install-dismissed'
const ENGAGE_DWELL_MS = 15000
const ENGAGE_SCROLL_RATIO = 0.4

function detectPlatform() {
  if (typeof window === 'undefined') return 'unknown'
  const ua = navigator.userAgent || ''
  // iOS detection. window.MSStream excludes old IE phones that spoofed iOS UA.
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

function detectStandalone() {
  if (typeof window === 'undefined') return false
  // Modern Chrome / Android.
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  // iOS Safari's non-standard signal.
  if (window.navigator.standalone === true) return true
  return false
}

function readDismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
}

function writeDismissed(value) {
  try {
    if (value) localStorage.setItem(DISMISS_KEY, '1')
    else       localStorage.removeItem(DISMISS_KEY)
  } catch {
    // Private mode may block storage. In-memory state still applies for this session.
  }
}

export function useInstallPrompt({ requireEngagement = true } = {}) {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [iosOpen,        setIosOpen]        = useState(false)
  const [engaged,        setEngaged]        = useState(!requireEngagement)
  const [dismissed,      setDismissed]      = useState(readDismissed)

  const platform   = detectPlatform()
  const standalone = detectStandalone()

  // Capture Chrome / Edge install event before the browser shows its own UI.
  useEffect(() => {
    function handle(e) {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handle)
    return () => window.removeEventListener('beforeinstallprompt', handle)
  }, [])

  // Hide everywhere once installed. appinstalled fires even when the user
  // accepted from outside our prompt (e.g. browser menu).
  useEffect(() => {
    function handle() {
      setDeferredPrompt(null)
      writeDismissed(true)
      setDismissed(true)
    }
    window.addEventListener('appinstalled', handle)
    return () => window.removeEventListener('appinstalled', handle)
  }, [])

  // Engagement gate. Marketing banner uses this; dashboard card opts out.
  useEffect(() => {
    if (!requireEngagement || engaged) return undefined
    const timer = setTimeout(() => setEngaged(true), ENGAGE_DWELL_MS)
    function onScroll() {
      if (window.scrollY > window.innerHeight * ENGAGE_SCROLL_RATIO) {
        setEngaged(true)
        clearTimeout(timer)
        window.removeEventListener('scroll', onScroll)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [requireEngagement, engaged])

  // Surface gating:
  // - Standalone: never (already installed).
  // - Dismissed: never (cleared only when cache clears or storage resets).
  // - Engagement not met (when required): hold.
  // - iOS Safari: available once engaged — no platform event needed.
  // - Android / desktop: only when the deferred prompt has been captured.
  const canShow = !standalone && !dismissed && engaged && (
    platform === 'ios' || deferredPrompt !== null
  )

  function dismiss() {
    writeDismissed(true)
    setDismissed(true)
  }

  async function trigger() {
    if (platform === 'ios') {
      setIosOpen(true)
      return
    }
    if (!deferredPrompt) return
    try {
      deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      // Only the success path persists dismissal. A decline lets Chrome
      // re-fire beforeinstallprompt later if engagement signals build.
      if (choice?.outcome === 'accepted') dismiss()
    } catch {
      setDeferredPrompt(null)
    }
  }

  return {
    canShow,
    platform,
    standalone,
    dismissed,
    iosOpen,
    closeIos: () => setIosOpen(false),
    trigger,
    dismiss
  }
}
