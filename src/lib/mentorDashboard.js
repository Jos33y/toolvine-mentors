import { supabase } from '@/lib/supabase'
import { MEETING_STATUS } from '@/lib/meetingStatus'
import { fetchMyAttendedMeetingIds } from '@/lib/meetingAttendees'

// The two mentor dashboard aggregates, lifted out of meetings.js when 0048
// pushed that file past 800 lines. Both had to learn about convened meetings,
// and both are read by cards rather than by the meetings surface, so they are
// their own concern. meetings.js re-exports both names.

/* ============ Mentor dashboard ============ */


// Upcoming scheduled meetings across all this mentor's active pairings, plus
// any convened meeting they were put in. Soonest first. Used by
// NextSessionsCard. Pending is excluded by the status filter, so a request
// never appears as a session the mentor has agreed to.
//
// Two queries rather than one .or(). An empty pairing list or an empty
// attendee list would make the filter string malformed, and merging in JS is
// clearer than guarding both sides of it.
export async function fetchUpcomingMeetingsForMentor(mentorId, { limit = 5 } = {}) {
  const nowIso = new Date().toISOString()

  const [{ data: pairings, error: pErr }, attendedIds] = await Promise.all([
    supabase
      .from('pairings')
      .select('id, mentee_id, mentee:profiles!pairings_mentee_id_fkey ( id, full_name, photo_url )')
      .eq('mentor_id', mentorId)
      .eq('is_active', true),
    fetchMyAttendedMeetingIds(mentorId)
  ])

  if (pErr) throw pErr

  const pairingIds      = (pairings ?? []).map((p) => p.id)
  const menteeByPairing = new Map((pairings ?? []).map((p) => [p.id, p.mentee]))

  const columns = 'id, pairing_id, kind, title, scheduled_for, duration_minutes, mode, external_link, status'

  const requests = []

  if (pairingIds.length > 0) {
    requests.push(
      supabase
        .from('meetings')
        .select(columns)
        .in('pairing_id', pairingIds)
        .eq('status', MEETING_STATUS.SCHEDULED)
        .gte('scheduled_for', nowIso)
        .order('scheduled_for', { ascending: true })
        .limit(limit)
    )
  }

  if (attendedIds.length > 0) {
    requests.push(
      supabase
        .from('meetings')
        .select(columns)
        .in('id', attendedIds)
        .eq('status', MEETING_STATUS.SCHEDULED)
        .gte('scheduled_for', nowIso)
        .order('scheduled_for', { ascending: true })
        .limit(limit)
    )
  }

  if (requests.length === 0) return []

  const results = await Promise.all(requests)
  for (const res of results) {
    if (res.error) throw res.error
  }

  const seen = new Set()
  const merged = []

  for (const res of results) {
    for (const m of res.data ?? []) {
      if (seen.has(m.id)) continue
      seen.add(m.id)
      merged.push({ ...m, mentee: menteeByPairing.get(m.pairing_id) ?? null })
    }
  }

  merged.sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for))
  return merged.slice(0, limit)
}

// Four headline numbers for the mentor dashboard StatsRow. Lifetime activity,
// not just active pairings: a mentor whose pairing ended still has completed
// meetings and hours. Hours use actual_duration_minutes when present (native
// calls), falling back to the scheduled duration_minutes.
//
// Convened meetings count. A mentor summoned to one and sat through it did the
// hour, and leaving it out would make the number quietly wrong.
export async function fetchMentorStats(mentorId) {
  const [{ data: pairings, error: pErr }, attendedIds] = await Promise.all([
    supabase.from('pairings').select('id, is_active').eq('mentor_id', mentorId),
    fetchMyAttendedMeetingIds(mentorId)
  ])

  if (pErr) throw pErr

  const allPairingIds  = (pairings ?? []).map((p) => p.id)
  const activePairings = (pairings ?? []).filter((p) => p.is_active).length

  if (allPairingIds.length === 0 && attendedIds.length === 0) {
    return { assignedMentees: 0, upcomingMeetings: 0, completedMeetings: 0, hoursMentored: 0 }
  }

  const nowIso = new Date().toISOString()

  const upcoming  = []
  const completed = []

  if (allPairingIds.length > 0) {
    upcoming.push(
      supabase
        .from('meetings')
        .select('id')
        .in('pairing_id', allPairingIds)
        .eq('status', MEETING_STATUS.SCHEDULED)
        .gte('scheduled_for', nowIso)
    )
    completed.push(
      supabase
        .from('meetings')
        .select('id, actual_duration_minutes, duration_minutes')
        .in('pairing_id', allPairingIds)
        .eq('status', MEETING_STATUS.COMPLETED)
    )
  }

  if (attendedIds.length > 0) {
    upcoming.push(
      supabase
        .from('meetings')
        .select('id')
        .in('id', attendedIds)
        .eq('status', MEETING_STATUS.SCHEDULED)
        .gte('scheduled_for', nowIso)
    )
    completed.push(
      supabase
        .from('meetings')
        .select('id, actual_duration_minutes, duration_minutes')
        .in('id', attendedIds)
        .eq('status', MEETING_STATUS.COMPLETED)
    )
  }

  const results = await Promise.all([...upcoming, ...completed])
  for (const res of results) {
    if (res.error) throw res.error
  }

  const upcomingRows  = results.slice(0, upcoming.length)
  const completedRows = results.slice(upcoming.length)

  // Deduplicated by id. A meeting cannot be in both sets today, and counting
  // rows across two queries without this would break the moment one could.
  const upcomingIds  = new Set()
  for (const res of upcomingRows) {
    for (const m of res.data ?? []) upcomingIds.add(m.id)
  }

  const completedById = new Map()
  for (const res of completedRows) {
    for (const m of res.data ?? []) completedById.set(m.id, m)
  }

  const totalMinutes = [...completedById.values()].reduce((acc, m) => {
    const mins = m.actual_duration_minutes ?? m.duration_minutes ?? 0
    return acc + (mins || 0)
  }, 0)

  return {
    assignedMentees:   activePairings,
    upcomingMeetings:  upcomingIds.size,
    completedMeetings: completedById.size,
    hoursMentored:     Math.round(totalMinutes / 60)
  }
}
