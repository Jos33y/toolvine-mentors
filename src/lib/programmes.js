import { supabase } from '@/lib/supabase'

// Reads programme_schedule_public, never the base tables. The view exists so
// the joining link and the location cannot leave the database: RLS restricts
// rows and not columns, so a policy on programmes would hand a permanent Zoom
// link to anyone reading the API directly. Nothing here needs a session.

const PAST_WINDOW_MONTHS   = 12
const FUTURE_WINDOW_MONTHS = 12

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

function monthsFrom(months) {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return isoDate(d)
}

// One round trip for both halves of the page. A year either side is far more
// than the surface shows and still a trivial number of rows.
export async function fetchPublicSchedule() {
  const { data, error } = await supabase
    .from('programme_schedule_public')
    .select('programme_slug, programme_name, timezone, occurrence_id, occurs_on, start_time, duration_minutes, title, description, recap, is_skipped, skip_note')
    .gte('occurs_on', monthsFrom(-PAST_WINDOW_MONTHS))
    .lte('occurs_on', monthsFrom(FUTURE_WINDOW_MONTHS))
    .order('occurs_on', { ascending: true })

  if (error) throw error
  return data ?? []
}

/* ============ Members ============ */

// Members read the base tables rather than the view, because they are the
// people the joining link is for. RLS admits any signed-in user to both, and
// the view exists only to keep the link away from anonymous visitors.

const MEMBER_PROGRAMME_FIELDS =
  'id, slug, name, rule_type, start_time, duration_minutes, timezone, join_url, location'

const MEMBER_OCCURRENCE_FIELDS =
  'id, programme_id, occurs_on, start_time, duration_minutes, join_url, location, title, description, recap, is_skipped, skip_note'

export async function fetchMemberSchedule() {
  const [progRes, occRes, settingRes] = await Promise.all([
    supabase
      .from('programmes')
      .select(MEMBER_PROGRAMME_FIELDS)
      .eq('is_active', true)
      .order('rule_type', { ascending: false })
      .order('name', { ascending: true }),
    supabase
      .from('programme_occurrences')
      .select(MEMBER_OCCURRENCE_FIELDS)
      .gte('occurs_on', monthsFrom(-PAST_WINDOW_MONTHS))
      .lte('occurs_on', monthsFrom(FUTURE_WINDOW_MONTHS))
      .order('occurs_on', { ascending: true }),
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'default_join_url')
      .maybeSingle()
  ])

  if (progRes.error)    throw progRes.error
  if (occRes.error)     throw occRes.error
  // The settings read can fail without the page failing: a missing shared link
  // costs a button, not the schedule.
  const shared = settingRes.error ? '' : (typeof settingRes.data?.value === 'string' ? settingRes.data.value.trim() : '')

  const programmes = progRes.data ?? []
  const byId = new Map(programmes.map((p) => [p.id, p]))

  // Flattened here so no surface has to remember which of the three levels a
  // link came from.
  const occurrences = (occRes.data ?? []).map((o) => {
    const programme = byId.get(o.programme_id) ?? null
    return {
      ...o,
      programme,
      programme_slug: programme?.slug ?? null,
      programme_name: programme?.name ?? null,
      timezone:       programme?.timezone ?? 'Africa/Lagos',
      start_time:     o.start_time ?? programme?.start_time ?? null,
      joinUrl:        resolveJoinUrl({ occurrence: o, programme, sharedUrl: shared }).url,
      place:          o.location ?? programme?.location ?? null
    }
  })

  return { programmes, occurrences, sharedUrl: shared }
}

// Which of the three levels applies. Lives here rather than in the admin lib
// so a member surface never has to import from one.
export function resolveJoinUrl({ occurrence = null, programme = null, sharedUrl = '' } = {}) {
  if (occurrence?.join_url) return { url: occurrence.join_url, source: 'occurrence' }
  if (programme?.join_url)  return { url: programme.join_url,  source: 'programme' }
  if (sharedUrl)            return { url: sharedUrl,           source: 'shared' }
  return { url: null, source: 'none' }
}

// The soonest thing anyone has to be at. Feeds the banner, which is why it
// takes the lead window rather than returning everything ahead.
export function nextWithin(occurrences, leadDays) {
  const today = isoDate(new Date())
  const limit = new Date()
  limit.setDate(limit.getDate() + leadDays)
  const limitIso = isoDate(limit)

  return occurrences.find(
    (o) => !o.is_skipped && o.occurs_on >= today && o.occurs_on <= limitIso
  ) ?? null
}

export function upcoming(occurrences) {
  const today = isoDate(new Date())
  return occurrences.filter((o) => o.occurs_on >= today)
}

export function past(occurrences) {
  const today = isoDate(new Date())
  return occurrences
    .filter((o) => o.occurs_on < today)
    .filter((o) => o.recap || o.description || (o.is_skipped && o.skip_note))
    .sort((a, b) => (a.occurs_on < b.occurs_on ? 1 : -1))
}

// How far ahead the banner and the bell fire. One row, so a failure falls back
// rather than blocking the page.
export async function fetchBannerLeadDays() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'programme_banner_lead_days')
    .maybeSingle()

  if (error) return 2
  const n = Number(data?.value)
  return Number.isFinite(n) && n > 0 ? n : 2
}

/* ============ Public ============ */

// Q28. The public page shows the next occurrence and nothing further ahead.
// A skipped month is not the next one: it is a month that was announced and
// then called off, and offering it as the next date would be wrong.
export function nextBySlug(rows) {
  const today = isoDate(new Date())
  const map = new Map()

  for (const row of rows) {
    if (row.is_skipped) continue
    if (row.occurs_on < today) continue
    if (!map.has(row.programme_slug)) map.set(row.programme_slug, row)
  }
  return map
}

// Q37. Past occurrences are a section on this page. A date that came and went
// with nothing written about it is a row in a table, not something worth
// showing a stranger, so an occurrence earns its place by carrying a recap, a
// description, or a note explaining why it did not happen.
export function pastWorthShowing(rows, limit = 6) {
  const today = isoDate(new Date())

  return rows
    .filter((r) => r.occurs_on < today)
    .filter((r) => r.recap || r.description || (r.is_skipped && r.skip_note))
    .sort((a, b) => (a.occurs_on < b.occurs_on ? 1 : -1))
    .slice(0, limit)
}

/* ============ Time ============ */

// occurs_on and start_time are wall-clock values in the programme's own zone.
// Nothing here builds a Date from them and converts: a zoneless string parses
// as the reader's local time, and formatting that in Africa/Lagos would tell a
// visitor in New York the Family Meeting is at midnight the following day.
// The row already holds what to display, so it is formatted as it stands.

// The date is rendered from a fixed midday instant in UTC, which is the safe
// way to format a date-only value: no offset can drag it onto the day before.
function formatDay(occursOn, opts) {
  return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'UTC' })
    .format(new Date(`${occursOn}T12:00:00Z`))
}

// Postgres returns time as HH:MM:SS. A value set by hand may be HH:MM.
function formatClock(value) {
  const [h, m] = String(value ?? '19:00:00').split(':')
  const hour = Number(h)
  if (!Number.isFinite(hour)) return null

  const suffix = hour >= 12 ? 'PM' : 'AM'
  const h12    = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${m ?? '00'} ${suffix}`
}

// Intl gives Africa/Lagos as GMT+1, which is correct and not what this
// community calls it. Mapped rather than hardcoded, so changing the zone on a
// programme row changes the label with it.
const ZONE_LABELS = { 'Africa/Lagos': 'WAT' }

function zoneLabel(timezone) {
  return ZONE_LABELS[timezone] ?? timezone ?? 'WAT'
}

export function programmeWhen(row) {
  if (!row?.occurs_on) return null

  const day   = formatDay(row.occurs_on, { weekday: 'long', day: 'numeric', month: 'long' })
  const clock = formatClock(row.start_time)

  return clock ? `${day}, ${clock} ${zoneLabel(row.timezone)}` : day
}

// The same value broken up so a layout can set the parts against each other.
// programmeWhen stays the single readable sentence, and the visual stack is
// hidden from assistive tech in favour of it: "SUN 20 SEPT" read aloud is
// worse than "Sunday 20 September, 7:00 PM WAT".
export function programmeWhenParts(row) {
  if (!row?.occurs_on) return null

  return {
    weekday:     formatDay(row.occurs_on, { weekday: 'short' }).toUpperCase(),
    weekdayLong: formatDay(row.occurs_on, { weekday: 'long' }).toUpperCase(),
    day:     formatDay(row.occurs_on, { day: 'numeric' }),
    month:   formatDay(row.occurs_on, { month: 'long' }).toUpperCase(),
    time:    formatClock(row.start_time),
    zone:    zoneLabel(row.timezone),
    full:    programmeWhen(row)
  }
}

// How far away, said the way a person would say it. A date on its own does not
// tell anyone whether to act now or forget about it until next month.
export function daysUntil(occursOn) {
  if (!occursOn) return null

  const today  = new Date(`${isoDate(new Date())}T00:00:00Z`)
  const target = new Date(`${occursOn}T00:00:00Z`)
  const days   = Math.round((target - today) / 86400000)

  if (days < 0)  return null
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days < 14)  return `in ${days} days`
  if (days < 28)  return `in ${Math.round(days / 7)} weeks`
  return `in ${Math.round(days / 30)} ${Math.round(days / 30) === 1 ? 'month' : 'months'}`
}

export function programmeDayOnly(row) {
  if (!row?.occurs_on) return null
  return formatDay(row.occurs_on, { day: 'numeric', month: 'long', year: 'numeric' })
}
