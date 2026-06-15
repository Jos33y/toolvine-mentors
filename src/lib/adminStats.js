import { supabase } from '@/lib/supabase'

// Six headline numbers for the AdminStatsRow. Each runs as its own count query
// in parallel. v1 scale absorbs the round-trips comfortably; if needed later,
// roll into a SECURITY DEFINER function returning all six in one shot.
export async function fetchAdminStats() {
  const nowIso       = new Date().toISOString()
  const weekFromIso  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    pendingRes,
    activeMembersRes,
    mentorsRes,
    menteesRes,
    activePairingsRes,
    meetingsWeekRes,
    onboardingDataRes
  ] = await Promise.all([
    fetchPendingReviewsCount(),

    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .eq('is_active', true).eq('onboarded', true),

    supabase.from('user_roles').select('user_id', { count: 'exact', head: true })
      .eq('role', 'mentor'),

    supabase.from('user_roles').select('user_id', { count: 'exact', head: true })
      .eq('role', 'mentee'),

    supabase.from('pairings').select('id', { count: 'exact', head: true })
      .eq('is_active', true),

    supabase.from('meetings').select('id', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .gte('scheduled_for', nowIso)
      .lt('scheduled_for', weekFromIso),

    supabase.from('profiles').select('onboarded')
      .gte('created_at', thirtyAgoIso)
  ])

  if (activeMembersRes.error)   throw activeMembersRes.error
  if (mentorsRes.error)         throw mentorsRes.error
  if (menteesRes.error)         throw menteesRes.error
  if (activePairingsRes.error)  throw activePairingsRes.error
  if (meetingsWeekRes.error)    throw meetingsWeekRes.error
  if (onboardingDataRes.error)  throw onboardingDataRes.error

  const onboardingRows = onboardingDataRes.data ?? []
  const onboardingRate = onboardingRows.length === 0
    ? null
    : Math.round((onboardingRows.filter((r) => r.onboarded).length / onboardingRows.length) * 100)

  return {
    pendingReviews:   pendingRes,
    activeMembers:    activeMembersRes.count ?? 0,
    mentorsCount:     mentorsRes.count ?? 0,
    menteesCount:     menteesRes.count ?? 0,
    activePairings:   activePairingsRes.count ?? 0,
    meetingsThisWeek: meetingsWeekRes.count ?? 0,
    onboardingRate
  }
}

// Three trend pairs for the EngagementSnapshot. Labels read naturally when
// concatenated with a delta ("6 vs last month"), and the flat state ignores
// the label entirely.
export async function fetchAdminTrends() {
  const now              = new Date()
  const weekAgoIso       = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString()
  const twoWeeksAgoIso   = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyAgoIso     = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  const [thisWeekMeetingsRes, lastWeekMeetingsRes,
         thisMonthSignupsRes, lastMonthSignupsRes,
         pairingsNowRes,      pairings30Res] = await Promise.all([
    supabase.from('meetings').select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', weekAgoIso),

    supabase.from('meetings').select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('completed_at', twoWeeksAgoIso).lt('completed_at', weekAgoIso),

    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .gte('created_at', startOfThisMonth),

    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .gte('created_at', startOfLastMonth).lt('created_at', startOfThisMonth),

    supabase.from('pairings').select('id', { count: 'exact', head: true })
      .eq('is_active', true),

    // Pairings active 30 days ago: started before 30d and not ended before 30d.
    supabase.from('pairings').select('id', { count: 'exact', head: true })
      .lt('started_at', thirtyAgoIso)
      .or(`ended_at.is.null,ended_at.gt.${thirtyAgoIso}`)
  ])

  return {
    meetingsCompleted: {
      current:  thisWeekMeetingsRes.count ?? 0,
      previous: lastWeekMeetingsRes.count ?? 0,
      label:    'vs last week'
    },
    newSignups: {
      current:  thisMonthSignupsRes.count ?? 0,
      previous: lastMonthSignupsRes.count ?? 0,
      label:    'vs last month'
    },
    activePairings: {
      current:  pairingsNowRes.count ?? 0,
      previous: pairings30Res.count ?? 0,
      label:    'vs 30 days ago'
    }
  }
}

// Pending reviews count. A user is in the pending bucket when active,
// onboarded, intent is mentor (or undecided), and they do not yet hold
// admin or mentor roles. Resolved client-side because PostgREST cannot
// express "not exists" cleanly on a single endpoint.
async function fetchPendingReviewsCount() {
  const [profilesRes, rolesRes] = await Promise.all([
    supabase.from('profiles')
      .select('id, role_intent, role_undecided, is_active, onboarded')
      .eq('is_active', true)
      .eq('onboarded', true)
      .or('role_intent.eq.mentor,role_undecided.eq.true'),

    supabase.from('user_roles')
      .select('user_id, role')
      .in('role', ['admin', 'mentor'])
  ])

  if (profilesRes.error) throw profilesRes.error
  if (rolesRes.error)    throw rolesRes.error

  const excluded = new Set((rolesRes.data ?? []).map((r) => r.user_id))
  return (profilesRes.data ?? []).filter((p) => !excluded.has(p.id)).length
}
