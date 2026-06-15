import { supabase } from '@/lib/supabase'

// Open tasks this mentor authored across all their pairings. Used by the
// mentor dashboard ActionItemsCard. The created_by filter narrows to the
// mentor's own tasks (an admin could theoretically write a task in their
// pairing too; those belong on admin surfaces).
export async function fetchOpenItemsForMentor(mentorId, { limit = 5 } = {}) {
  const { data, error } = await supabase
    .from('meeting_action_items')
    .select(`
      id,
      body,
      status,
      due_on,
      created_at,
      assigned_to,
      meeting_id,
      pairing_id,
      assignee:profiles!meeting_action_items_assigned_to_fkey ( id, full_name, photo_url ),
      meeting:meetings!meeting_action_items_meeting_id_fkey ( id, scheduled_for )
    `)
    .eq('created_by', mentorId)
    .eq('status', 'open')
    .order('due_on', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

// Open tasks assigned to this mentee across all their pairings. Used by the
// mentee dashboard MenteeTasksCard. Read-only in Block C; a later block
// adds the mark-done action.
export async function fetchOpenItemsForMentee(menteeId, { limit = 10 } = {}) {
  const { data, error } = await supabase
    .from('meeting_action_items')
    .select(`
      id,
      body,
      status,
      due_on,
      created_at,
      assigned_to,
      meeting_id,
      pairing_id,
      meeting:meetings!meeting_action_items_meeting_id_fkey ( id, scheduled_for )
    `)
    .eq('assigned_to', menteeId)
    .eq('status', 'open')
    .order('due_on', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

// Open-task counts per pairing. Used to flavour MenteesListCard status and
// to badge rows with "N open". Returns a Map keyed by pairing_id.
export async function countOpenItemsByPairing(pairingIds) {
  if (!pairingIds || pairingIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('meeting_action_items')
    .select('pairing_id')
    .in('pairing_id', pairingIds)
    .eq('status', 'open')

  if (error) throw error

  const counts = new Map()
  for (const row of data ?? []) {
    counts.set(row.pairing_id, (counts.get(row.pairing_id) ?? 0) + 1)
  }
  return counts
}
