import { supabase } from '@/lib/supabase'

// Client-side page view tracking. Inserts one row per (session, path) within
// a 30-second window. Skips dev mode, honors Do Not Track, never throws.
//
// Called by useRouteAnalytics on every route change. Authenticated user id
// is passed in by the hook so we do not have to round-trip auth on each ping.

const SESSION_KEY      = 'tv_session_id'
const LAST_VIEW_KEY    = 'tv_last_page_view'
const DEDUP_WINDOW_MS  = 30_000

export async function recordPageView({ path, userId = null }) {
  if (shouldSkip(path)) return

  try { sessionStorage.setItem(LAST_VIEW_KEY, JSON.stringify({ path, t: Date.now() })) } catch {}

  try {
    await supabase.from('page_views').insert({
      path,
      user_id:     userId,
      session_id:  getOrCreateSessionId(),
      referrer:    safeReferrer(),
      device_kind: getDeviceKind()
    })
  } catch (e) {
    // Never break the app on a tracking failure.
    if (import.meta.env.DEV) console.warn('[pageViews] insert failed:', e)
  }
}

function getOrCreateSessionId() {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY)
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).slice(2, 12) + '_' + Date.now().toString(36)
      sessionStorage.setItem(SESSION_KEY, sid)
    }
    return sid
  } catch {
    // sessionStorage blocked, fall back to ephemeral id for this call.
    return 'sess_anon_' + Math.random().toString(36).slice(2, 10)
  }
}

function getDeviceKind() {
  if (typeof window === 'undefined') return 'unknown'
  const ua = navigator.userAgent || ''
  const w  = window.innerWidth
  if (/iPad|Tablet/i.test(ua) || (w >= 720 && w < 1024)) return 'tablet'
  if (/Mobile|iPhone|Android.*Mobile/i.test(ua) || w < 720) return 'mobile'
  return 'desktop'
}

function safeReferrer() {
  if (typeof document === 'undefined') return null
  const r = document.referrer || ''
  if (!r) return null
  // Strip our own host to avoid noise.
  try {
    const ref  = new URL(r)
    const here = new URL(window.location.href)
    if (ref.host === here.host) return null
    return ref.host
  } catch {
    return null
  }
}

function shouldSkip(path) {
  if (typeof window === 'undefined')          return true   // SSR safety
  if (import.meta.env.DEV)                    return true   // skip in dev
  if (navigator.doNotTrack === '1')           return true   // honor DNT
  if (!path || typeof path !== 'string')      return true

  try {
    const raw = sessionStorage.getItem(LAST_VIEW_KEY)
    if (raw) {
      const last = JSON.parse(raw)
      if (last && last.path === path && (Date.now() - last.t) < DEDUP_WINDOW_MS) return true
    }
  } catch {}

  return false
}
