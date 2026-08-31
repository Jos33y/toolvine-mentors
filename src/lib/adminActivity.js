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
//
// Six of these were added after querying admin_actions rather than reading
// this file: pair_users and archive_resource had no matching writer and 20 of
// the 21 rows in the log were falling through to the slug fallback below.
// The two apparent orphans are left in place until the code that would write
// them has actually been read.
//
// Seven more were added after diffing the logged action names against this
// list rather than against the log. Five had never fired because logIfAdmin
// only writes when an admin is the actor and no admin had scheduled,
// completed, cancelled or reopened a meeting since the log shipped. Two were
// mine, from item 6, and had no template at all. D90: the pair ships together.
//
// Two naming conventions coexist here. Actions on people and relationships
// read verb first (approve_mentor, end_pairing); content objects read noun
// first (resource_created, submission_archived). Testimonies are a moderation
// queue like submissions, so they follow that side.
const TEMPLATES = {
  approve_mentor:    'approved {target} as mentor',
  confirm_mentee:    'confirmed {target} as mentee',
  revoke_mentor:     "revoked {target}\u2019s mentor role",
  grant_admin:       'made {target} an admin',
  revoke_admin:      "removed {target}\u2019s admin access",
  deactivate_user:   'deactivated {target}',
  reactivate_user:   'reactivated {target}',
  resource_created:  'added the resource {target}',
  resource_updated:  'edited the resource {target}',
  create_pairing:    'paired {target}',
  reschedule_meeting:'rescheduled a meeting for {target}',
  invite_created:    'created an invite for {target}',
  invite_sent:       'sent an invite to {target}',
  add_note:          'added a note about {target}',
  update_note:       'edited a note about {target}',
  delete_note:       'deleted a note about {target}',
  pair_users:        'paired {target}',
  end_pairing:       'ended a pairing for {target}',
  archive_resource:  'archived the resource {target}',
  submission_read:   'opened a submission from {target}',
  submission_replied:'replied to a submission from {target}',
  submission_archived:'archived a submission from {target}',

  // Meetings. reschedule_meeting was already here; the rest were logged by
  // meetings.js with nothing to render them.
  schedule_meeting:  'scheduled a meeting for {target}',
  complete_meeting:  'marked a meeting complete for {target}',
  cancel_meeting:    'cancelled a meeting for {target}',
  reopen_meeting:    'reopened a meeting for {target}',
  reassign_pairing:  'reassigned {target}',

  // Convened meetings, item 6.
  add_meeting_attendees:   'added people to {target}',
  remove_meeting_attendee: 'removed somebody from {target}',

  // Testimonies, item 7.
  testimony_recorded:  'recorded a testimony from {target}',
  testimony_requested: 'asked {target} for a testimony',
  testimony_approved:  'published a testimony from {target}',
  testimony_declined:  'declined a testimony from {target}',
  testimony_featured:  'featured a testimony from {target}',
  testimony_edited:    'corrected a testimony from {target}',
  testimony_deleted:   'removed a declined testimony'
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
