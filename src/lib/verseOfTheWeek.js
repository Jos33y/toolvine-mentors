import { supabase } from '@/lib/supabase'

// Most recent verse whose week_of is today or earlier. Future-dated rows are
// effectively scheduled (ignored until their week arrives).
export async function fetchCurrentVerse() {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('verse_of_the_week')
    .select('id, reference, body, week_of, source')
    .lte('week_of', today)
    .order('week_of', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

const STALE_AFTER_DAYS = 14
const MS_PER_DAY = 24 * 60 * 60 * 1000

// Anything older than two weeks is treated as stale; the card hides itself
// rather than showing a verse that admins forgot to update.
export function isVerseStale(verse) {
  if (!verse?.week_of) return true
  const t = new Date(verse.week_of).getTime()
  if (!Number.isFinite(t)) return true
  return (Date.now() - t) > STALE_AFTER_DAYS * MS_PER_DAY
}

/* ============ Admin ============ */

// Newest first. Rows dated ahead of today are scheduled: fetchCurrentVerse
// ignores them until their week arrives.
export async function fetchAllVerses() {
  const { data, error } = await supabase
    .from('verse_of_the_week')
    .select('id, reference, body, week_of, source, created_at, updated_at')
    .order('week_of', { ascending: false })
  if (error) throw error
  return data ?? []
}

// week_of carries a unique index, so one verse per week is a database rule
// rather than a convention. Saving an existing week replaces it.
export async function saveVerse({ reference, body, week_of, source }, { createdBy }) {
  const row = {
    reference: reference.trim(),
    body:      body.trim(),
    week_of,
    source:    source?.trim() || null,
    created_by: createdBy,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('verse_of_the_week')
    .upsert(row, { onConflict: 'week_of' })
    .select('id, reference, body, week_of, source, created_at, updated_at')
    .single()

  if (error) throw error
  return data
}

// The Monday of the current week, which is what the card reads against.
export function currentWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return d.toISOString().slice(0, 10)
}

export function isFutureWeek(weekOf) {
  return !!weekOf && weekOf > new Date().toISOString().slice(0, 10)
}

export function friendlyVerseError(err) {
  const code = err?.code ?? ''
  const message = err?.message ?? ''

  if (code === '23505' || /week_of_key|duplicate key/i.test(message)) {
    return 'A verse already exists for that week. Open it and edit instead.'
  }
  if (code === '23502') {
    return 'A verse needs a reference, the wording, and a week.'
  }
  if (code === '42501' || /row-level security|permission denied/i.test(message)) {
    return 'Only an administrator can set the verse.'
  }
  return message || 'Something went wrong. Try again.'
}
