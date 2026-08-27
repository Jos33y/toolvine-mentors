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
    weekday: formatDay(row.occurs_on, { weekday: 'short' }).toUpperCase(),
    day:     formatDay(row.occurs_on, { day: 'numeric' }),
    month:   formatDay(row.occurs_on, { month: 'long' }).toUpperCase(),
    time:    formatClock(row.start_time),
    zone:    zoneLabel(row.timezone),
    full:    programmeWhen(row)
  }
}

export function programmeDayOnly(row) {
  if (!row?.occurs_on) return null
  return formatDay(row.occurs_on, { day: 'numeric', month: 'long', year: 'numeric' })
}
