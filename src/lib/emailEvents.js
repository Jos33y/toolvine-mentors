import { supabase } from '@/lib/supabase'

// Email events for one user, newest first. Each row is a webhook event from
// Resend (delivered, opened, bounced, complained, etc.) attached to a send.
// Used by the Users detail panel Communication tab.
//
// Schema reference: email_events writes from the Resend webhook with at least
// { id, user_id, email, template, event_type, occurred_at, meta }. If the
// shape diverges, adjust the select accordingly.
export async function fetchEmailEventsForUser(userId, { limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('email_events')
    .select('id, user_id, email, template, event_type, occurred_at, meta')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

// Compact summary for headlines on the user detail page. Returns totals per
// event type so the panel can render "12 sent, 9 opened, 1 bounced" instead
// of forcing the admin to count rows.
export async function summariseEmailEventsForUser(userId, { sinceDays = 90 } = {}) {
  const sinceIso = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('email_events')
    .select('event_type')
    .eq('user_id', userId)
    .gte('occurred_at', sinceIso)

  if (error) throw error

  const summary = { sent: 0, delivered: 0, opened: 0, bounced: 0, complained: 0, total: 0 }
  for (const row of data ?? []) {
    const t = row.event_type
    if (t in summary) summary[t] = (summary[t] ?? 0) + 1
    summary.total += 1
  }
  return summary
}
