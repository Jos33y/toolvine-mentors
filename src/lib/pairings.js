import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/adminLog'

// Every write goes through a SECURITY DEFINER RPC from 0029. The client never
// writes to pairings directly: pairings_check1 requires is_active and ended_at
// to move together, and reassignment is two ordered writes that must not be
// split across round trips.

/* ============ Constants ============ */

export const PAIRING_FILTERS = [
  { key: 'active',   label: 'Active' },
  { key: 'unpaired', label: 'Unpaired' },
  { key: 'ended',    label: 'Ended' }
]

export const DEFAULT_PAIRING_FILTER = 'active'

// Why a person cannot be paired right now. Shown beside the row rather than
// filtering them out, so an admin looking for someone finds them and a reason.
export const INELIGIBLE_REASON = Object.freeze({
  deactivated:  'Deactivated',
  onboarding:   'Profile not finished',
  alreadyPaired:'Already paired'
})

const PROFILE_COLUMNS =
  'id, full_name, email, photo_url, is_active, onboarded, display_title, country, location, timezone, monthly_hours'

/* ============ Mentor surface ============ */

// Active pairings where this user is the mentor, each enriched with the
// mentee profile, the mentee's seeking focus, and the last completed meeting.
// Open task counts are NOT included here. Combine with countOpenItemsByPairing
// at the call site (typically the mentor dashboard hook).
//
// Shape:
//   {
//     id:         pairing id,
//     menteeId,
//     startedAt:  ISO,
//     mentee:     { id, full_name, photo_url, email },
//     focus:      [{ categoryId, slug, label }, ...],   // sorted by sort_order
//     lastMetAt:  ISO | null
//   }
export async function fetchActiveMenteesForMentor(mentorId) {
  const { data: pairings, error: pErr } = await supabase
    .from('pairings')
    .select(`
      id,
      mentee_id,
      started_at,
      mentee:profiles!pairings_mentee_id_fkey ( id, full_name, photo_url, email )
    `)
    .eq('mentor_id', mentorId)
    .eq('is_active', true)
    .order('started_at', { ascending: false })

  if (pErr) throw pErr
  if (!pairings || pairings.length === 0) return []

  const menteeIds  = pairings.map((p) => p.mentee_id)
  const pairingIds = pairings.map((p) => p.id)

  const [focusRes, lastMetRes] = await Promise.all([
    supabase
      .from('user_focus')
      .select('user_id, category_id, mentoring_categories ( id, slug, label, sort_order )')
      .in('user_id', menteeIds)
      .eq('kind', 'seeking'),
    supabase
      .from('meetings')
      .select('pairing_id, scheduled_for')
      .in('pairing_id', pairingIds)
      .eq('status', 'completed')
      .order('scheduled_for', { ascending: false })
  ])

  if (focusRes.error)   throw focusRes.error
  if (lastMetRes.error) throw lastMetRes.error

  // Group focus by mentee, sorted by category sort_order.
  const focusByMentee = new Map()
  for (const row of focusRes.data ?? []) {
    if (!row.mentoring_categories) continue
    const list = focusByMentee.get(row.user_id) ?? []
    list.push({
      categoryId: row.category_id,
      slug:       row.mentoring_categories.slug,
      label:      row.mentoring_categories.label,
      sortOrder:  row.mentoring_categories.sort_order ?? 0
    })
    focusByMentee.set(row.user_id, list)
  }
  for (const list of focusByMentee.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder)
  }

  // Last-met per pairing. The first row per pairing wins because the server
  // ordered scheduled_for desc.
  const lastMetByPairing = new Map()
  for (const row of lastMetRes.data ?? []) {
    if (!lastMetByPairing.has(row.pairing_id)) {
      lastMetByPairing.set(row.pairing_id, row.scheduled_for)
    }
  }

  return pairings.map((p) => ({
    id:        p.id,
    menteeId:  p.mentee_id,
    startedAt: p.started_at,
    mentee:    p.mentee,
    focus:     focusByMentee.get(p.mentee_id) ?? [],
    lastMetAt: lastMetByPairing.get(p.id) ?? null
  }))
}

/* ============ Mentee surface ============ */

// The mentee's current mentor plus every past pairing. Both parties can read
// each other's profile only once a pairing exists, via are_paired() on the
// profiles select policy, so an unpaired mentee gets nulls rather than an error.
export async function fetchMentorForMentee(menteeId) {
  const { data, error } = await supabase
    .from('pairings')
    .select(`
      id, mentor_id, is_active, started_at, ended_at,
      mentor:profiles!pairings_mentor_id_fkey ( ${PROFILE_COLUMNS} )
    `)
    .eq('mentee_id', menteeId)
    .order('started_at', { ascending: false })

  if (error) throw error

  const rows    = data ?? []
  const current = rows.find((r) => r.is_active) ?? null
  const past    = rows.filter((r) => !r.is_active)

  let focus = []
  if (current?.mentor_id) {
    focus = await fetchFocusFor([current.mentor_id], 'offering')
      .then((m) => m.get(current.mentor_id) ?? [])
  }

  return {
    pairingId: current?.id ?? null,
    startedAt: current?.started_at ?? null,
    mentor:    current?.mentor ?? null,
    focus,
    history:   past.map(toHistoryRow)
  }
}

// Used by the admin history drawer and by the mentee surface. Ordered newest
// first so the current pairing, when there is one, sits at the top.
export async function fetchPairingHistoryForMentee(menteeId) {
  const { data, error } = await supabase
    .from('pairings')
    .select(`
      id, is_active, started_at, ended_at,
      mentor:profiles!pairings_mentor_id_fkey ( id, full_name, photo_url, email )
    `)
    .eq('mentee_id', menteeId)
    .order('started_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(toHistoryRow)
}

/* ============ Admin board ============ */

// One read for the whole /admin/pairings page. Assembled here rather than in
// three exported functions because the mentor roster, the mentee roster, and
// the pairings list all derive from the same four tables, and splitting them
// lets the three views disagree with each other between round trips.
//
// Returns:
//   pairings [{ id, isActive, startedAt, endedAt, mentor, mentee, mentorInactive }]
//   mentors  [{ ...profile, focus, menteeCount, eligible, reason }]
//   mentees  [{ ...profile, focus, activePairingId, mentorId, eligible, reason }]
export async function fetchPairingBoard() {
  const [pairingsRes, rolesRes, profilesRes] = await Promise.all([
    supabase
      .from('pairings')
      .select(`
        id, mentor_id, mentee_id, is_active, started_at, ended_at, created_at,
        mentor:profiles!pairings_mentor_id_fkey ( ${PROFILE_COLUMNS} ),
        mentee:profiles!pairings_mentee_id_fkey ( ${PROFILE_COLUMNS} )
      `)
      .order('started_at', { ascending: false }),

    supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['mentor', 'mentee']),

    supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .order('full_name', { ascending: true })
  ])

  if (pairingsRes.error)  throw pairingsRes.error
  if (rolesRes.error)     throw rolesRes.error
  if (profilesRes.error)  throw profilesRes.error

  const pairingRows = pairingsRes.data ?? []
  const profileById = new Map((profilesRes.data ?? []).map((p) => [p.id, p]))

  const mentorIds = []
  const menteeIds = []
  for (const r of rolesRes.data ?? []) {
    if (!profileById.has(r.user_id)) continue
    if (r.role === 'mentor') mentorIds.push(r.user_id)
    if (r.role === 'mentee') menteeIds.push(r.user_id)
  }

  // A dual-role user appears in both rosters. Supported since v2.5, not an error.
  const [offering, seeking] = await Promise.all([
    fetchFocusFor(mentorIds, 'offering'),
    fetchFocusFor(menteeIds, 'seeking')
  ])

  const activeByMentee = new Map()
  const activeCountByMentor = new Map()
  for (const p of pairingRows) {
    if (!p.is_active) continue
    activeByMentee.set(p.mentee_id, p)
    activeCountByMentor.set(p.mentor_id, (activeCountByMentor.get(p.mentor_id) ?? 0) + 1)
  }

  const mentors = mentorIds
    .map((id) => profileById.get(id))
    .map((p) => ({
      ...p,
      focus:       offering.get(p.id) ?? [],
      menteeCount: activeCountByMentor.get(p.id) ?? 0,
      ...eligibility(p, null)
    }))
    .sort(byPickOrder)

  const mentees = menteeIds
    .map((id) => profileById.get(id))
    .map((p) => {
      const active = activeByMentee.get(p.id) ?? null
      return {
        ...p,
        focus:           seeking.get(p.id) ?? [],
        activePairingId: active?.id ?? null,
        mentorId:        active?.mentor_id ?? null,
        ...eligibility(p, active)
      }
    })
    .sort(byPickOrder)

  const pairings = pairingRows.map((p) => ({
    id:        p.id,
    isActive:  p.is_active,
    startedAt: p.started_at,
    endedAt:   p.ended_at,
    mentor:    p.mentor,
    mentee:    p.mentee,
    // D15. Surfaced on the row, never auto-ended. Deactivation is often
    // administrative and temporary.
    mentorInactive: p.is_active && p.mentor?.is_active === false
  }))

  return { pairings, mentors, mentees }
}

// The confirm dialog states how many meetings the end will cancel, so it has
// to know before the write. end_pairing returns the count afterwards, which is
// what the success line uses.
export async function countScheduledMeetings(pairingId) {
  const { count, error } = await supabase
    .from('meetings')
    .select('id', { count: 'exact', head: true })
    .eq('pairing_id', pairingId)
    .eq('status', 'scheduled')

  if (error) throw error
  return count ?? 0
}

/* ============ Writes ============ */

// create_pairing() checks admin, both parties active, both parties onboarded,
// mentor holds the mentor role, and no existing active pairing for the mentee.
export async function createPairing(mentorId, menteeId, label = null) {
  const { data, error } = await supabase.rpc('create_pairing', {
    p_mentor_id: mentorId,
    p_mentee_id: menteeId
  })
  if (error) throw error

  const row = first(data)
  logAdminAction('create_pairing', 'pairings', row?.id ?? null, label)
  return row
}

// Returns { pairing, meetingsCancelled }. The count comes back from the RPC so
// the success line reports what actually happened rather than what was predicted.
export async function endPairing(pairingId, label = null) {
  const { data, error } = await supabase.rpc('end_pairing', {
    p_pairing_id: pairingId
  })
  if (error) throw error

  const row = first(data)
  logAdminAction('end_pairing', 'pairings', pairingId, label, {
    meetings_cancelled: row?.meetings_cancelled ?? 0
  })

  return {
    pairing:           row?.pairing ?? null,
    meetingsCancelled: row?.meetings_cancelled ?? 0
  }
}

// End then create in one transaction. Never call endPairing followed by
// createPairing from here: the gap leaves the mentee with no mentor at all.
export async function reassignPairing(menteeId, newMentorId, label = null) {
  const { data, error } = await supabase.rpc('reassign_pairing', {
    p_mentee_id:     menteeId,
    p_new_mentor_id: newMentorId
  })
  if (error) throw error

  const row = first(data)
  logAdminAction('reassign_pairing', 'pairings', row?.id ?? null, label, {
    mentee_id: menteeId,
    mentor_id: newMentorId
  })
  return row
}

// One notifier per domain, kind as a parameter, matching sendMeetingEmail.
// Never throws: a failed email must not read as a failed pairing.
export async function sendPairingEmail(pairingId, kind = 'created', previousMentorId = null) {
  try {
    const { data, error } = await supabase.functions.invoke('pairing-notify', {
      body: {
        pairing_id:         pairingId,
        kind,
        previous_mentor_id: previousMentorId
      }
    })
    if (error) {
      console.error('[pairing-notify] invoke error:', error)
      return { sent: false, reason: 'invoke-failed' }
    }
    return data || { sent: false, reason: 'no-response' }
  } catch (e) {
    console.error('[pairing-notify] threw:', e)
    return { sent: false, reason: 'threw' }
  }
}

/* ============ Errors ============ */

// The RPCs raise sentences a person can read, so those pass through unchanged.
// Constraint violations that slip past the UI filters get translated, because
// "duplicate key value violates unique constraint" is not an answer.
export function friendlyPairingError(err) {
  if (!err) return 'Something went wrong.'

  const code = err.code || ''
  const raw  = (err.message || '').trim()

  if (code === '23505' || /one_active_per_mentee/i.test(raw)) {
    return 'That mentee already has an active mentor. Reassign instead.'
  }
  if (code === '23514' && /mentor_not_mentee/i.test(raw)) {
    return 'A person cannot mentor themselves.'
  }
  if (code === '23514' && /pairings_check1/i.test(raw)) {
    return 'That pairing is in an inconsistent state. Reload and try again.'
  }
  if (code === '42501' || /permission denied/i.test(raw)) {
    return 'You do not have permission to do that.'
  }
  if (/JWT|session/i.test(raw)) {
    return 'Your session expired. Sign in again.'
  }

  return raw || 'Something went wrong.'
}

/* ============ Internals ============ */

// PostgREST returns a bare object for a composite return and an array for a
// table return. 0029 uses both, so normalise once here.
function first(data) {
  if (Array.isArray(data)) return data[0] ?? null
  return data ?? null
}

async function fetchFocusFor(userIds, kind) {
  const byUser = new Map()
  if (!userIds || userIds.length === 0) return byUser

  const { data, error } = await supabase
    .from('user_focus')
    .select('user_id, category_id, mentoring_categories ( id, slug, label, sort_order )')
    .in('user_id', userIds)
    .eq('kind', kind)

  if (error) throw error

  for (const row of data ?? []) {
    if (!row.mentoring_categories) continue
    const list = byUser.get(row.user_id) ?? []
    list.push({
      categoryId: row.category_id,
      slug:       row.mentoring_categories.slug,
      label:      row.mentoring_categories.label,
      sortOrder:  row.mentoring_categories.sort_order ?? 0
    })
    byUser.set(row.user_id, list)
  }
  for (const list of byUser.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder)
  }
  return byUser
}

// Mirrors the gates inside create_pairing so the UI can explain a refusal
// before the admin triggers one. The database remains the authority.
function eligibility(profile, activePairing) {
  if (profile.is_active === false) {
    return { eligible: false, reason: INELIGIBLE_REASON.deactivated }
  }
  if (profile.onboarded !== true) {
    return { eligible: false, reason: INELIGIBLE_REASON.onboarding }
  }
  if (activePairing) {
    return { eligible: false, reason: INELIGIBLE_REASON.alreadyPaired }
  }
  return { eligible: true, reason: null }
}

function toHistoryRow(row) {
  return {
    id:        row.id,
    isActive:  row.is_active,
    startedAt: row.started_at,
    endedAt:   row.ended_at,
    mentor:    row.mentor ?? null
  }
}

// People who can be paired sort to the top. Alphabetical alone buries the
// only rows an admin can act on underneath the ones they cannot.
function byPickOrder(a, b) {
  if (a.eligible !== b.eligible) return a.eligible ? -1 : 1
  return (a.full_name || '').localeCompare(b.full_name || '')
}
