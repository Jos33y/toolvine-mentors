import { supabase } from '@/lib/supabase'

// Fire-and-forget audit log write. Never throws. A failed log entry must
// not roll back the action that already succeeded. Server-side is_admin()
// check in the RPC means a non-admin caller gets a silent no-op.
//
// Use after every successful admin write. Pattern:
//   await applyRoleDecision(id, 'approve_mentor')
//   logAdminAction('approve_mentor', 'profiles', id, name)
export async function logAdminAction(action, targetTable = null, targetId = null, targetLabel = null, meta = {}) {
  try {
    const { error } = await supabase.rpc('log_admin_action', {
      p_action:       action,
      p_target_table: targetTable,
      p_target_id:    targetId,
      p_target_label: targetLabel,
      p_meta:         meta || {}
    })
    if (error) console.warn('[log_admin_action] error:', error.message)
  } catch (e) {
    console.warn('[log_admin_action] threw:', e)
  }
}
