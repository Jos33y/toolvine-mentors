import { supabase } from '@/lib/supabase'

// Total visits in the last N days. Cheap count query.
export async function visitsLastNDays(days = 7) {
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { count, error } = await supabase
    .from('page_views')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', sinceIso)

  if (error) throw error
  return count ?? 0
}

// Top N paths by view count in the given window. Aggregation is client-side
// because PostgREST cannot group inline; for v1 traffic this is fine. If
// the page_views table grows large, swap to a SECURITY DEFINER SQL function.
export async function topPaths({ days = 7, limit = 5 } = {}) {
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('page_views')
    .select('path')
    .gte('created_at', sinceIso)

  if (error) throw error

  const counts = new Map()
  for (const row of data ?? []) {
    counts.set(row.path, (counts.get(row.path) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([path, views]) => ({ path, views }))
}

// Mobile vs desktop vs tablet split. Returns an object with one key per kind
// plus a total so the card can render percentages.
export async function deviceSplit({ days = 7 } = {}) {
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('page_views')
    .select('device_kind')
    .gte('created_at', sinceIso)

  if (error) throw error

  const counts = { mobile: 0, tablet: 0, desktop: 0, unknown: 0 }
  for (const row of data ?? []) {
    const k = row.device_kind ?? 'unknown'
    counts[k] = (counts[k] ?? 0) + 1
  }
  return { ...counts, total: (data ?? []).length }
}

// Daily totals over the window, padded with zeros for days with no traffic.
// Returns an array of { date: 'YYYY-MM-DD', views: int } sorted ascending.
export async function visitsByDay({ days = 30 } = {}) {
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('page_views')
    .select('created_at')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true })

  if (error) throw error

  const byDay = new Map()
  for (const row of data ?? []) {
    const d = row.created_at.slice(0, 10)
    byDay.set(d, (byDay.get(d) ?? 0) + 1)
  }

  // Fill in missing days as zero so the chart has a continuous line.
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    out.push({ date: d, views: byDay.get(d) ?? 0 })
  }
  return out
}

// Sign-up funnel for the last N days. Three numbers: visitors who saw
// /auth/sign-up, accounts created in the window, accounts onboarded in
// the window. Crude conversion ratios.
export async function signupFunnel({ days = 30 } = {}) {
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const [visitsRes, createdRes, onboardedRes] = await Promise.all([
    supabase.from('page_views').select('session_id')
      .eq('path', '/auth/sign-up').gte('created_at', sinceIso),

    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .gte('created_at', sinceIso),

    // Onboarded uses created_at as the proxy because there is no onboarded_at
    // column. Slight noise: a user who signed up months ago but onboarded
    // recently would not count. Acceptable for v1 funnel.
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .eq('onboarded', true)
      .gte('created_at', sinceIso)
  ])

  if (visitsRes.error)     throw visitsRes.error
  if (createdRes.error)    throw createdRes.error
  if (onboardedRes.error)  throw onboardedRes.error

  // Unique sessions for the sign-up page visit count.
  const uniqueVisits = new Set((visitsRes.data ?? []).map((r) => r.session_id)).size

  return {
    visitors:  uniqueVisits,
    signups:   createdRes.count ?? 0,
    onboarded: onboardedRes.count ?? 0
  }
}
