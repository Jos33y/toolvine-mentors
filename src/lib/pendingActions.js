import { supabase } from '@/lib/supabase'
import { countNewSubmissions } from '@/lib/adminSubmissions'

// Five counts feeding the Pending Actions Card. Each one is a thing the admin
// should resolve. All zeros means a clean "nothing waiting on you" state.
//
// Runs in parallel. Falls back to zero on any individual query failure so the
// card can still render the rest. Set the loading flag in the hook, not here.
export async function fetchPendingActions() {
  const [pendingReviews, newSubmissions, stalledOnboardings, unverifiedOver72h, unpairedOver30d] = await Promise.all([
    countPendingMentorReviews().catch(emitAndZero('pendingReviews')),
    countNewSubmissions().catch(emitAndZero('newSubmissions')),
    countStalledOnboardings().catch(emitAndZero('stalledOnboardings')),
    countUnverifiedOver72h().catch(emitAndZero('unverifiedOver72h')),
    countUnpairedMenteesOver30d().catch(emitAndZero('unpairedOver30d'))
  ])

  return {
    pendingReviews,
    newSubmissions,
    stalledOnboardings,
    unverifiedOver72h,
    unpairedOver30d
  }
}

function emitAndZero(label) {
  return (err) => {
    console.warn(`[pendingActions:${label}] failed:`, err?.message ?? err)
    return 0
  }
}

// Active, onboarded users whose intent is mentor (or undecided) and who do
// not yet hold admin or mentor roles. Mirrors fetchAdminUsers bucket logic.
async function countPendingMentorReviews() {
  const [profilesRes, rolesRes] = await Promise.all([
    supabase.from('profiles')
      .select('id')
      .eq('is_active', true)
      .eq('onboarded', true)
      .or('role_intent.eq.mentor,role_undecided.eq.true'),
    supabase.from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'mentor'])
  ])
  if (profilesRes.error) throw profilesRes.error
  if (rolesRes.error)    throw rolesRes.error

  const excluded = new Set((rolesRes.data ?? []).map((r) => r.user_id))
  return (profilesRes.data ?? []).filter((p) => !excluded.has(p.id)).length
}

// Verified email, never finished onboarding, registered more than 14 days
// ago. They got past the first hurdle then dropped. Admin can nudge.
async function countStalledOnboardings() {
  const fourteenAgoIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('email_verified', true)
    .eq('onboarded', false)
    .lt('created_at', fourteenAgoIso)
  if (error) throw error
  return count ?? 0
}

// Signed up more than 72 hours ago and still has not verified email.
async function countUnverifiedOver72h() {
  const seventyTwoAgoIso = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('email_verified', false)
    .lt('created_at', seventyTwoAgoIso)
  if (error) throw error
  return count ?? 0
}

// Onboarded mentees who are not in any active pairing and registered more
// than 30 days ago. They have been waiting longer than they should.
async function countUnpairedMenteesOver30d() {
  const thirtyAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [menteesRes, pairedRes] = await Promise.all([
    supabase.from('user_roles').select('user_id').eq('role', 'mentee'),
    supabase.from('pairings').select('mentee_id').eq('is_active', true)
  ])
  if (menteesRes.error) throw menteesRes.error
  if (pairedRes.error)  throw pairedRes.error

  const pairedSet = new Set((pairedRes.data ?? []).map((r) => r.mentee_id))
  const candidateIds = (menteesRes.data ?? [])
    .map((r) => r.user_id)
    .filter((id) => !pairedSet.has(id))

  if (candidateIds.length === 0) return 0

  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .in('id', candidateIds)
    .eq('is_active', true)
    .eq('onboarded', true)
    .lt('created_at', thirtyAgoIso)
  if (error) throw error
  return count ?? 0
}
