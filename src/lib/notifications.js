import { supabase } from './supabase'

const SELECT = 'id, kind, title, body, url, entity_type, entity_id, read_at, created_at'

// RLS returns the caller's own rows only, so none of these accept a user id
// and none of them can be pointed at anybody else.

export async function fetchNotifications({ unreadOnly = false, limit = 50 } = {}) {
  let query = supabase
    .from('notifications')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) query = query.is('read_at', null)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

// head:true asks for the count without the rows, which is what the bell needs.
export async function fetchUnreadCount() {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)

  if (error) throw error
  return count ?? 0
}

// Both go through an RPC rather than an update policy. RLS cannot restrict
// which columns a writer touches, so a policy permitting update would also
// permit rewriting the title. D60.
export async function markRead(id) {
  const { error } = await supabase.rpc('mark_notification_read', { p_id: id })
  if (error) throw error
}

export async function markAllRead() {
  const { data, error } = await supabase.rpc('mark_all_notifications_read')
  if (error) throw error
  return data ?? 0
}

const KIND_ICON = {
  meeting_scheduled:    'calendar',
  meeting_rescheduled:  'clock',
  meeting_cancelled:    'close',
  meeting_completed:    'checkCircle',
  action_item_assigned: 'check',
  action_item_done:     'checkCircle',
  pairing_created:      'pairings',
  pairing_changed:      'pairings',
  pairing_ended:        'pairings',
  resource_added:       'resources'
}

export function notificationIcon(kind) {
  return KIND_ICON[kind] ?? 'info'
}

// Relative for the first week, then the date. A list where everything says
// "3 weeks ago" has stopped telling anyone anything.
export function notificationWhen(iso) {
  if (!iso) return ''
  const then = new Date(iso)
  const mins = Math.round((Date.now() - then.getTime()) / 60000)

  if (mins < 1)    return 'just now'
  if (mins < 60)   return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24)  return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7)    return `${days}d ago`

  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
