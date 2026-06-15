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
