import { supabase } from '@/lib/supabase'

// pairing_id is NOT NULL and every RLS policy keys off it, but nothing here
// supplies it. meeting_action_items_set_pairing is a BEFORE INSERT trigger
// that derives it from the meeting and overwrites anything sent, verified
// against pg_get_functiondef on 12 August. The tracker, the handoff, and
// dev-track v4 all state the opposite; they were written against an empty
// table and never tested.

export const ITEM_STATUS = Object.freeze({
  OPEN:      'open',
  DONE:      'done',
  CANCELLED: 'cancelled'
})

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


/* ============ Meeting detail ============ */

const ITEM_FIELDS = `
  id, meeting_id, pairing_id, assigned_to, body, status, due_on,
  created_by, created_at, updated_at, completed_at,
  assignee:profiles!meeting_action_items_assigned_to_fkey ( id, full_name, photo_url )
`

// Every item on one meeting, open first, then by due date. A mentee sees only
// items assigned to them, which is the select policy rather than a filter
// here: D30 declines to fight RLS for a view nobody asked for.
export async function fetchActionItemsForMeeting(meetingId) {
  const { data, error } = await supabase
    .from('meeting_action_items')
    .select(ITEM_FIELDS)
    .eq('meeting_id', meetingId)
    .order('status', { ascending: true })
    .order('due_on', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

// pairing_id is omitted on purpose. The trigger derives it, so sending one
// is at best redundant and at worst a way to point an item at a pairing its
// meeting does not belong to.
export async function createActionItem({ meetingId, assignedTo, body, dueOn = null, createdBy }) {
  const { data, error } = await supabase
    .from('meeting_action_items')
    .insert({
      meeting_id:  meetingId,
      assigned_to: assignedTo,
      body:        String(body || '').trim(),
      due_on:      dueOn || null,
      created_by:  createdBy
    })
    .select(ITEM_FIELDS)
    .single()

  if (error) throw error
  return data
}

// Explicit allowlist. status never travels this way: it has its own RPC, and
// meeting_action_items_check ties done to completed_at, so the two must move
// together or not at all.
const ITEM_UPDATABLE = ['body', 'assigned_to', 'due_on']

export async function updateActionItem(id, patch = {}) {
  const payload = {}
  for (const key of ITEM_UPDATABLE) {
    if (key in patch) payload[key] = patch[key]
  }
  if ('body' in payload) payload.body = String(payload.body || '').trim()
  if (Object.keys(payload).length === 0) return null

  const { data, error } = await supabase
    .from('meeting_action_items')
    .update(payload)
    .eq('id', id)
    .select(ITEM_FIELDS)
    .single()

  if (error) throw error
  return data
}

// The narrow entry point from 0025. Accepts open and done only, and permits
// the assignee, the pairing's mentor, or an admin. This is what lets a mentee
// mark their own item done without an UPDATE policy that would also let them
// rewrite the body, reassign it, or move the due date.
export async function setActionItemStatus(id, status) {
  const { error } = await supabase.rpc('set_action_item_status', {
    p_item_id: id,
    p_status:  status
  })
  if (error) throw error
}

// D32. Cancelling is a mentor and admin act, through the normal update path,
// because the RPC refuses it. Otherwise work could be dismissed by cancelling
// it rather than doing it.
export async function cancelActionItem(id) {
  const { data, error } = await supabase
    .from('meeting_action_items')
    .update({ status: ITEM_STATUS.CANCELLED })
    .eq('id', id)
    .select(ITEM_FIELDS)
    .single()

  if (error) throw error
  return data
}

/* ============ Errors ============ */

export function friendlyItemError(err) {
  if (!err) return 'Something went wrong.'

  const raw  = (err.message || '').trim()
  const code = err.code || ''

  if (code === '23514' && /body/i.test(raw)) {
    return 'An action item needs some text.'
  }
  if (code === '23514' && /meeting_action_items_check/i.test(raw)) {
    return 'That item is in an inconsistent state. Reload and try again.'
  }
  if (code === '42501' || /row-level security|permission denied/i.test(raw)) {
    return 'You can only assign items to the two people in this pairing.'
  }
  if (/Only open or done/i.test(raw)) {
    return 'An item can be marked open or done. Ask your mentor to cancel it instead.'
  }
  if (/JWT|session/i.test(raw)) {
    return 'Your session expired. Sign in again.'
  }

  return raw || 'Something went wrong.'
}

/* ============ Display helpers ============ */

export function isOverdue(dueOn) {
  if (!dueOn) return false
  const due = new Date(dueOn)
  due.setHours(23, 59, 59, 999)
  return due.getTime() < Date.now()
}

export function dueLabel(dueOn) {
  if (!dueOn) return null
  return new Date(dueOn).toLocaleDateString([], { month: 'short', day: 'numeric' })
}
