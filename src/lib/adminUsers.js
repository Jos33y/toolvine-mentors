import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/adminLog'

// Fetches every profile and joins their role rows client-side. v1 user count
// is small enough that a single select is faster and simpler than a view.
export async function fetchAdminUsers() {
  const [pRes, rRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, photo_url, is_active, onboarded, role_intent, role_undecided, email_verified, whatsapp_phone, country, location, monthly_hours, created_at, verification_reminder_count, verification_last_reminder_at, onboarding_reminder_count, onboarding_last_reminder_at')
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

// Which loop a person is in, or null if neither. The cron uses the same rule
// in reminder_candidates: unverified is chased first, and onboarding only
// once the address is confirmed.
export function reminderKindFor(user) {
  if (!user.is_active) return null
  if (!user.email_verified) return 'verification'
  if (!user.onboarded) return 'onboarding'
  return null
}

export function reminderStateFor(user) {
  const kind = reminderKindFor(user)
  if (!kind) return null

  const sent = kind === 'verification'
    ? (user.verification_reminder_count ?? 0)
    : (user.onboarding_reminder_count ?? 0)

  const last = kind === 'verification'
    ? user.verification_last_reminder_at
    : user.onboarding_last_reminder_at

  // Three sent and still stalled means email has stopped working on this
  // person. That is the moment somebody should pick up a phone, and it is the
  // one thing this whole loop exists to surface.
  return { kind, sent, last, exhausted: sent >= 3 }
}

// Manual send, for when an admin has just spoken to somebody. Deliberately
// ignores quiet hours and the cap of three: the admin chose this moment, and
// the cap exists to stop a machine nagging, not to stop a person following up.
export async function sendReminderNow(userId, kind) {
  try {
    const { data, error } = await supabase.functions.invoke('reminder-send', {
      body: { user_id: userId, kind }
    })

    if (error) {
      // invoke throws away the response body on a non-2xx, so the status is
      // read back off the context. Without it every failure looked identical
      // and the row blamed the email address for all of them.
      const status = error?.context?.status ?? null
      console.error('[reminder-send] invoke error:', status, error)
      return { sent: 0, reason: reasonFromStatus(status) }
    }

    return data || { sent: 0, reason: 'no-response' }
  } catch (e) {
    console.error('[reminder-send] threw:', e)
    return { sent: 0, reason: 'network' }
  }
}

function reasonFromStatus(status) {
  if (status === 401) return 'not-signed-in'
  if (status === 403) return 'not-admin'
  if (status === 404) return 'not-deployed'
  if (status === 400) return 'bad-request'
  if (status >= 500)  return 'server'
  return 'unknown'
}

// One message per cause. "Check the address" for a permission failure sends
// somebody hunting through a profile for a fault that is not there.
export function reminderFailureMessage(reason) {
  switch (reason) {
    case 'not-signed-in': return 'Your session has expired. Sign in again and retry.'
    case 'not-admin':     return 'Only an administrator can send a reminder.'
    case 'not-deployed':  return 'The reminder service is not reachable. It may not be deployed yet.'
    case 'bad-request':   return 'That person is not waiting on a reminder.'
    case 'server':        return 'The reminder service failed. The logs will say why.'
    case 'network':       return 'Could not reach the reminder service. Check your connection.'
    default:              return 'The reminder did not send. Check the logs and try again.'
  }
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
