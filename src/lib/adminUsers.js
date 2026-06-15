import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/adminLog'

// Fetches every profile and joins their role rows client-side. v1 user count
// is small enough that a single select is faster and simpler than a view.
export async function fetchAdminUsers() {
  const [pRes, rRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, photo_url, is_active, onboarded, role_intent, role_undecided, email_verified, whatsapp_phone, country, location, monthly_hours, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('user_roles')
      .select('user_id, role')
  ])

  if (pRes.error) throw pRes.error
  if (rRes.error) throw rRes.error

  const rolesByUser = new Map()
  for (const r of rRes.data) {
    if (!rolesByUser.has(r.user_id)) rolesByUser.set(r.user_id, [])
    rolesByUser.get(r.user_id).push(r.role)
  }

  return pRes.data.map((p) => ({
    ...p,
    roles: rolesByUser.get(p.id) || []
  }))
}

// Atomic role change via SECURITY DEFINER RPC. Logs the action client-side
// after success. Fire-and-forget log: a failed log entry must not roll back
// the role change.
export async function applyRoleDecision(targetUserId, decision, targetLabel = null) {
  const { data, error } = await supabase.rpc('admin_apply_role_decision', {
    target_user_id: targetUserId,
    decision
  })
  if (error) throw error

  logAdminAction(decision, 'profiles', targetUserId, targetLabel)

  return data?.[0] || null
}

// Best-effort role-change notification. Server-side gates on email_verified
// and returns { sent, reason } so the caller can show appropriate feedback.
// Never throws: a failed notification must not roll back a successful decision.
export async function sendRoleDecisionEmail(targetUserId, decision) {
  try {
    const { data, error } = await supabase.functions.invoke('role-decision-send', {
      body: { user_id: targetUserId, decision }
    })
    if (error) {
      console.error('[role-decision-send] invoke error:', error)
      return { sent: false, reason: 'invoke-failed' }
    }
    return data || { sent: false, reason: 'no-response' }
  } catch (e) {
    console.error('[role-decision-send] threw:', e)
    return { sent: false, reason: 'threw' }
  }
}

// Deactivate or reactivate a user. The new RPC updates BOTH profiles.is_active
// and auth.users.banned_until atomically, so an existing JWT cannot refresh
// and new sign-ins are blocked. Audit logging happens server-side inside the
// RPC, so no client-side logAdminAction call is needed.
export async function setUserActive(targetUserId, isActive) {
  const { data, error } = await supabase.rpc('admin_set_user_active', {
    p_user_id: targetUserId,
    p_active:  isActive
  })
  if (error) throw error
  return data?.[0] ?? null
}

// Bucket priority: deactivated > admin > mentor > pending > mentee.
// Admin trumps every other state. An admin who happens to have a pending
// mentor intent is still an admin: their application has nothing to review.
export function bucketFor(user) {
  if (!user.is_active) return 'deactivated'

  const isAdmin  = user.roles.includes('admin')
  if (isAdmin) return 'admin'

  const isMentor = user.roles.includes('mentor')
  if (isMentor) return 'mentor'

  const wantsMentor = user.role_intent === 'mentor'
  const undecided   = user.role_undecided === true
  if (wantsMentor || undecided) return 'pending'

  return 'mentee'
}
