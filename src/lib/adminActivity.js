import { supabase } from '@/lib/supabase'

// Recent audit log entries for the ActivityLogCard. Joins actor profile so
// the card can render "Tofunmi approved Chiamaka as mentor".
export async function fetchRecentActivity({ limit = 8 } = {}) {
  const { data, error } = await supabase
    .from('admin_actions')
    .select(`
      id, action, target_table, target_id, target_label, meta, created_at,
      actor:profiles!admin_actions_actor_id_fkey ( id, full_name, photo_url )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

// Paginated audit log for the dedicated /admin/activity page.
export async function fetchActivityPage({
  page       = 0,
  pageSize   = 50,
  actorId    = null,
  action     = null,
  fromDate   = null,
  toDate     = null
} = {}) {
  let q = supabase
    .from('admin_actions')
    .select(`
      id, action, target_table, target_id, target_label, meta, created_at,
      actor:profiles!admin_actions_actor_id_fkey ( id, full_name, photo_url )
    `, { count: 'exact' })

  if (actorId)  q = q.eq('actor_id', actorId)
  if (action)   q = q.eq('action', action)
  if (fromDate) q = q.gte('created_at', fromDate)
  if (toDate)   q = q.lte('created_at', toDate)

  const from = page * pageSize
  const to   = from + pageSize - 1

  const { data, error, count } = await q
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error
  return { rows: data ?? [], total: count ?? 0 }
}

// Sentence template for each known action. {target} marks where the target
// label should be inserted by the renderer. Templates that need no target
// (e.g. system-wide events later) just omit the placeholder.
const TEMPLATES = {
  approve_mentor:    'approved {target} as mentor',
  confirm_mentee:    'confirmed {target} as mentee',
  revoke_mentor:     "revoked {target}\u2019s mentor role",
  deactivate_user:   'deactivated {target}',
  reactivate_user:   'reactivated {target}',
  add_note:          'added a note about {target}',
  update_note:       'edited a note about {target}',
  delete_note:       'deleted a note about {target}',
  pair_users:        'paired {target}',
  end_pairing:       'ended a pairing for {target}',
  archive_resource:  'archived the resource {target}',
  submission_read:   'opened a submission from {target}',
  submission_replied:'replied to a submission from {target}',
  submission_archived:'archived a submission from {target}'
}

export function templateForAction(action) {
  return TEMPLATES[action] ?? `${action.replace(/_/g, ' ')} {target}`
}

// Plain phrase form (no target slot) for places that show actions in a
// filter dropdown or summary list.
export function labelForAction(action) {
  const t = templateForAction(action)
  return t.replace(' {target}', '').replace('{target}', '').trim()
}
