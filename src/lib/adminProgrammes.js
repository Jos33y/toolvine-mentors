import { supabase } from '@/lib/supabase'

// Admin reads and writes go to the base tables, not to
// programme_schedule_public. The view exists to keep join_url away from
// anonymous visitors, and the admin is the one person who needs it.
//
// Every write here is gated by programmes_admin_write and
// programme_occurrences_admin_write. Nothing in this module checks a role: the
// policies do, and a second check in the client would only drift from them.

const PROGRAMME_FIELDS = `
  id, slug, name, rule_type, rule_week, rule_weekday, start_time,
  duration_minutes, timezone, join_url, location, is_active, updated_at
`

const OCCURRENCE_FIELDS = `
  id, programme_id, occurs_on, start_time, duration_minutes, join_url, location,
  title, description, recap, is_skipped, skip_note, notified_at, created_at
`

/* ============ Reads ============ */

export async function fetchProgrammes() {
  const { data, error } = await supabase
    .from('programmes')
    .select(PROGRAMME_FIELDS)
    .order('rule_type', { ascending: false })
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

/* ============ The shared link ============ */

// One link, overridden where a programme differs. 0043 put join_url only on
// the programme, which meant a shared link was typed four times and a stale
// copy looked exactly like a deliberate difference.

export async function fetchDefaultJoinUrl() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'default_join_url')
    .maybeSingle()

  if (error) throw error
  const raw = data?.value
  return typeof raw === 'string' ? raw.trim() : ''
}

export async function saveDefaultJoinUrl(url) {
  const { error } = await supabase
    .from('app_settings')
    .update({ value: String(url ?? '').trim() })
    .eq('key', 'default_join_url')

  if (error) throw error
}

// Which link actually applies, and where it came from. The page shows the
// source as well as the value: a link inherited from the shared setting and a
// link set on the programme look identical otherwise.
export function resolveJoinUrl({ occurrence = null, programme = null, sharedUrl = '' } = {}) {
  if (occurrence?.join_url) return { url: occurrence.join_url, source: 'occurrence' }
  if (programme?.join_url)  return { url: programme.join_url,  source: 'programme' }
  if (sharedUrl)            return { url: sharedUrl,           source: 'shared' }
  return { url: null, source: 'none' }
}

export async function fetchOccurrences({ programmeId = null, limit = 400 } = {}) {
  let query = supabase
    .from('programme_occurrences')
    .select(OCCURRENCE_FIELDS)
    .order('occurs_on', { ascending: true })
    .limit(limit)

  if (programmeId) query = query.eq('programme_id', programmeId)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/* ============ Programme writes ============ */

const PROGRAMME_UPDATABLE = [
  'name', 'rule_week', 'rule_weekday', 'start_time',
  'duration_minutes', 'join_url', 'location', 'is_active'
]

// slug, rule_type and timezone are absent on purpose. slug is what the public
// page joins on, rule_type decides whether a rule exists at all, and timezone
// is a decision about the whole community rather than a field on a form.
export async function updateProgramme(id, patch = {}) {
  const payload = {}
  for (const key of PROGRAMME_UPDATABLE) {
    if (key in patch) payload[key] = patch[key]
  }
  if (Object.keys(payload).length === 0) return null

  const { data, error } = await supabase
    .from('programmes')
    .update(payload)
    .eq('id', id)
    .select(PROGRAMME_FIELDS)
    .single()

  if (error) throw error
  return data
}

// The same function the daily cron calls. Used when a programme is switched
// back on, where there is nothing to delete and dates simply need filling in.
export async function materialiseOccurrences(months = 12) {
  const { data, error } = await supabase.rpc('materialise_programme_occurrences', {
    p_months: months
  })
  if (error) throw error
  return data ?? 0
}

// 0044. The delete and the materialise run in one transaction, so a failure
// cannot leave a programme carrying fewer dates than its rule says until the
// next cron run. The field update stays separate: failing that leaves the rule
// as it was, which is the safe direction.
export async function applyRuleChange(id, patch) {
  const programme = await updateProgramme(id, patch)

  const { data, error } = await supabase.rpc('rebuild_programme_dates', { p_id: id })
  if (error) throw error

  return {
    programme,
    removed: data?.removed ?? 0,
    added:   data?.added ?? 0
  }
}

/* ============ Occurrence writes ============ */

const OCCURRENCE_UPDATABLE = [
  'occurs_on', 'start_time', 'duration_minutes', 'join_url',
  'location', 'title', 'description', 'recap'
]

// is_skipped and skip_note are absent: they move together or the CHECK refuses
// the write, so they have their own entry points below.
export async function updateOccurrence(id, patch = {}) {
  const payload = {}
  for (const key of OCCURRENCE_UPDATABLE) {
    if (key in patch) payload[key] = blankToNull(patch[key])
  }
  if (Object.keys(payload).length === 0) return null

  const { data, error } = await supabase
    .from('programme_occurrences')
    .update(payload)
    .eq('id', id)
    .select(OCCURRENCE_FIELDS)
    .single()

  if (error) throw error
  return data
}

// Equip has no rule, so every one of its occurrences arrives this way. Any
// programme can also take a one-off outside its rhythm.
export async function createOccurrence({ programmeId, occursOn, title, description, startTime, joinUrl, location, createdBy }) {
  const { data, error } = await supabase
    .from('programme_occurrences')
    .insert({
      programme_id: programmeId,
      occurs_on:    occursOn,
      title:        blankToNull(title),
      description:  blankToNull(description),
      start_time:   blankToNull(startTime),
      join_url:     blankToNull(joinUrl),
      location:     blankToNull(location),
      created_by:   createdBy ?? null
    })
    .select(OCCURRENCE_FIELDS)
    .single()

  if (error) throw error
  return data
}

// programme_occurrences_skip_check refuses a skip with no note, so the note is
// required here rather than discovered after the click.
export async function skipOccurrence(id, note) {
  const trimmed = String(note ?? '').trim()
  if (!trimmed) throw new Error('Say why the month is being skipped. Members read it.')

  const { data, error } = await supabase
    .from('programme_occurrences')
    .update({ is_skipped: true, skip_note: trimmed })
    .eq('id', id)
    .select(OCCURRENCE_FIELDS)
    .single()

  if (error) throw error
  return data
}

// Both columns clear together, for the same reason they are set together.
export async function unskipOccurrence(id) {
  const { data, error } = await supabase
    .from('programme_occurrences')
    .update({ is_skipped: false, skip_note: null })
    .eq('id', id)
    .select(OCCURRENCE_FIELDS)
    .single()

  if (error) throw error
  return data
}

/* ============ Display ============ */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const ORDINALS = [null, 'First', 'Second', 'Third', 'Fourth', 'Fifth']

export const WEEKDAY_OPTIONS = WEEKDAYS.map((label, value) => ({ value, label }))
export const WEEK_OPTIONS    = [1, 2, 3, 4, 5].map((value) => ({ value, label: ORDINALS[value] }))

// The rule said the way a person would say it, not as two numbers.
export function ruleInWords(programme) {
  if (!programme) return ''
  if (programme.rule_type === 'manual') return 'Created by hand, no fixed date'

  const ordinal = ORDINALS[programme.rule_week] ?? null
  const weekday = WEEKDAYS[programme.rule_weekday] ?? null
  if (!ordinal || !weekday) return 'Rule incomplete'

  return `${ordinal} ${weekday} of the month, ${formatClock(programme.start_time)}`
}

export function formatClock(value) {
  const [h, m] = String(value ?? '19:00:00').split(':')
  const hour = Number(h)
  if (!Number.isFinite(hour)) return ''

  const suffix = hour >= 12 ? 'PM' : 'AM'
  const h12    = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${m ?? '00'} ${suffix}`
}

// occurs_on is a date-only value. Formatting it from a fixed midday instant in
// UTC is what stops a reader's offset dragging it onto the day before.
export function occurrenceDate(occursOn, opts = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!occursOn) return ''
  return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'UTC' })
    .format(new Date(`${occursOn}T12:00:00Z`))
}

export function isPastDate(occursOn) {
  return Boolean(occursOn) && occursOn < new Date().toISOString().slice(0, 10)
}

// An occurrence carries something a rule change must not throw away.
export function isTouched(o) {
  if (!o) return false
  return Boolean(
    o.title || o.description || o.recap || o.skip_note ||
    o.start_time || o.duration_minutes || o.join_url || o.location ||
    o.notified_at || o.is_skipped
  )
}

function blankToNull(value) {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s === '' ? null : s
}

/* ============ Errors ============ */

export function friendlyProgrammeError(err) {
  if (!err) return 'Something went wrong.'

  const raw  = (err.message || '').trim()
  const code = err.code || ''

  if (code === '23505' || /programme_occurrences_programme_id_occurs_on_key|duplicate key/i.test(raw)) {
    return 'That programme already has an occurrence on that date. Open it and edit instead.'
  }
  if (code === '23514' && /skip_check/i.test(raw)) {
    return 'A skipped month needs a note saying why.'
  }
  if (code === '23514' && /rule_check/i.test(raw)) {
    return 'A rule needs both a week and a weekday.'
  }
  if (code === '23514' && /duration_minutes/i.test(raw)) {
    return 'A programme runs between 15 and 480 minutes.'
  }
  if (code === '42501' || /row-level security|permission denied/i.test(raw)) {
    return 'Only an administrator can change programmes.'
  }
  if (/JWT|session/i.test(raw)) {
    return 'Your session expired. Sign in again.'
  }

  return raw || 'Something went wrong.'
}
