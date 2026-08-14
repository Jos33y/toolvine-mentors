import { supabase } from '@/lib/supabase'

// Visitor insights for admin surfaces. One RPC returns every aggregate the
// page and the dashboard card need. Counting happens in SQL, so the response
// cannot be truncated by the row ceiling as the table grows.

const EMPTY_DEVICES = { mobile: 0, tablet: 0, desktop: 0, unknown: 0, total: 0 }

const EMPTY_FUNNEL = {
  visitors:    0,
  signupViews: 0,
  signups:     0,
  verified:    0,
  onboarded:   0
}

export const EMPTY_INSIGHTS = {
  rangeDays:     30,
  seriesFrom:    null,
  seriesTrimmed: false,
  visits:        { current: 0, previous: 0 },
  visitors:      { current: 0, previous: 0 },
  paths:         [],
  devices:       EMPTY_DEVICES,
  sources:       [],
  series:        [],
  funnel:        EMPTY_FUNNEL
}

export async function fetchSiteInsights({ days = 30, pathsLimit = 10 } = {}) {
  const { data, error } = await supabase.rpc('site_insights', {
    p_days:        days,
    p_paths_limit: pathsLimit
  })

  if (error) throw error
  return normalise(data)
}

// ============ Source labels ============

// The table stores a bare host, or an Android package name when the link was
// opened inside an app. Neither reads as anything to an administrator.
const SOURCE_LABELS = {
  direct:                  'Direct',
  'com.google.android.gm': 'Gmail app',
  'mail.google.com':       'Gmail',
  'outlook.live.com':      'Outlook',
  'www.google.com':        'Google search',
  'google.com':            'Google search',
  'bing.com':              'Bing search',
  'duckduckgo.com':        'DuckDuckGo',
  'chatgpt.com':           'ChatGPT',
  'www.canva.com':         'Canva',
  't.co':                  'X',
  'l.facebook.com':        'Facebook',
  'lm.facebook.com':       'Facebook',
  'www.linkedin.com':      'LinkedIn',
  'l.instagram.com':       'Instagram'
}

export function sourceLabel(source) {
  if (!source) return 'Direct'
  if (SOURCE_LABELS[source]) return SOURCE_LABELS[source]
  if (source.endsWith('toolvinementors.com')) {
    return source.startsWith('status.') ? 'Status page' : 'Our own site'
  }
  return source.replace(/^www\./, '')
}

// ============ Shaping ============

// The RPC always returns every key. Normalising anyway means a partial or
// null payload renders empty states instead of throwing inside a chart.
function normalise(raw) {
  if (!raw || typeof raw !== 'object') return EMPTY_INSIGHTS

  return {
    rangeDays:     int(raw.rangeDays, 30),
    seriesFrom:    typeof raw.seriesFrom === 'string' ? raw.seriesFrom : null,
    seriesTrimmed: raw.seriesTrimmed === true,
    visits:        window_(raw.visits),
    visitors:      window_(raw.visitors),
    paths:         paths(raw.paths),
    devices:       devices(raw.devices),
    sources:       sources(raw.sources),
    series:        series(raw.series),
    funnel:        funnel(raw.funnel)
  }
}

function window_(v) {
  return {
    current:  int(v?.current),
    previous: int(v?.previous)
  }
}

function paths(rows) {
  if (!Array.isArray(rows)) return []
  return rows
    .filter((r) => typeof r?.path === 'string')
    .map((r) => ({
      path:     r.path,
      count:    int(r.count),
      sessions: int(r.sessions)
    }))
}

function devices(d) {
  return {
    mobile:  int(d?.mobile),
    tablet:  int(d?.tablet),
    desktop: int(d?.desktop),
    unknown: int(d?.unknown),
    total:   int(d?.total)
  }
}

function sources(rows) {
  if (!Array.isArray(rows)) return []
  return rows
    .filter((r) => typeof r?.source === 'string')
    .map((r) => ({
      source:   r.source,
      label:    sourceLabel(r.source),
      sessions: int(r.sessions)
    }))
}

function series(rows) {
  if (!Array.isArray(rows)) return []
  return rows
    .filter((r) => typeof r?.date === 'string')
    .map((r) => ({ date: r.date, visits: int(r.visits) }))
}

function funnel(f) {
  return {
    visitors:    int(f?.visitors),
    signupViews: int(f?.signupViews),
    signups:     int(f?.signups),
    verified:    int(f?.verified),
    onboarded:   int(f?.onboarded)
  }
}

function int(v, fallback = 0) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : fallback
}
