import { supabase } from '@/lib/supabase'

// Upcoming scheduled meetings across all this mentor's active pairings.
// Soonest first. Used by NextSessionsCard. Each meeting joined with the
// mentee profile so the card can render "Session with Sarah" without a
// second fetch.
export async function fetchUpcomingMeetingsForMentor(mentorId, { limit = 5 } = {}) {
  const { data: pairings, error: pErr } = await supabase
    .from('pairings')
    .select('id, mentee_id, mentee:profiles!pairings_mentee_id_fkey ( id, full_name, photo_url )')
    .eq('mentor_id', mentorId)
    .eq('is_active', true)

  if (pErr) throw pErr
  if (!pairings || pairings.length === 0) return []

  const pairingIds      = pairings.map((p) => p.id)
  const menteeByPairing = new Map(pairings.map((p) => [p.id, p.mentee]))

  const nowIso = new Date().toISOString()

  const { data: meetings, error: mErr } = await supabase
    .from('meetings')
    .select('id, pairing_id, scheduled_for, duration_minutes, mode, external_link, status')
    .in('pairing_id', pairingIds)
    .eq('status', 'scheduled')
    .gte('scheduled_for', nowIso)
    .order('scheduled_for', { ascending: true })
    .limit(limit)

  if (mErr) throw mErr

  return (meetings ?? []).map((m) => ({
    ...m,
    mentee: menteeByPairing.get(m.pairing_id) ?? null
  }))
}

// Four headline numbers for the mentor dashboard StatsRow. Lifetime activity,
// not just active pairings: a mentor whose pairing ended still has completed
// meetings and hours. Hours use actual_duration_minutes when present (native
// calls), falling back to the scheduled duration_minutes.
export async function fetchMentorStats(mentorId) {
  const { data: pairings, error: pErr } = await supabase
    .from('pairings')
    .select('id, is_active')
    .eq('mentor_id', mentorId)

  if (pErr) throw pErr

  const allPairingIds  = (pairings ?? []).map((p) => p.id)
  const activePairings = (pairings ?? []).filter((p) => p.is_active).length

  if (allPairingIds.length === 0) {
    return { assignedMentees: 0, upcomingMeetings: 0, completedMeetings: 0, hoursMentored: 0 }
  }

  const nowIso = new Date().toISOString()

  const [upcomingRes, completedRes] = await Promise.all([
    supabase
      .from('meetings')
      .select('id', { count: 'exact', head: true })
      .in('pairing_id', allPairingIds)
      .eq('status', 'scheduled')
      .gte('scheduled_for', nowIso),
    supabase
      .from('meetings')
      .select('actual_duration_minutes, duration_minutes')
      .in('pairing_id', allPairingIds)
      .eq('status', 'completed')
  ])

  if (upcomingRes.error)  throw upcomingRes.error
  if (completedRes.error) throw completedRes.error

  const completedRows = completedRes.data ?? []
  const totalMinutes  = completedRows.reduce((acc, m) => {
    const mins = m.actual_duration_minutes ?? m.duration_minutes ?? 0
    return acc + (mins || 0)
  }, 0)

  return {
    assignedMentees:   activePairings,
    upcomingMeetings:  upcomingRes.count ?? 0,
    completedMeetings: completedRows.length,
    hoursMentored:     Math.round(totalMinutes / 60)
  }
}
