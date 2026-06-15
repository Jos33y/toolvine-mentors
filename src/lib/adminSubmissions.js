import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/adminLog'

// Contact submissions list, paginated and filterable by status. The schema
// from migration 0009 uses status values: 'new', 'read', 'replied', 'archived'.
export async function fetchSubmissions({
  status   = null,
  page     = 0,
  pageSize = 25
} = {}) {
  let q = supabase
    .from('contact_submissions')
    .select(`
      id, subject, name, email, message, user_agent, referrer,
      status, admin_notes, reviewed_at, created_at,
      reviewer:profiles!contact_submissions_reviewed_by_fkey ( id, full_name )
    `, { count: 'exact' })

  if (status) q = q.eq('status', status)

  const from = page * pageSize
  const to   = from + pageSize - 1

  const { data, error, count } = await q
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error
  return { rows: data ?? [], total: count ?? 0 }
}

// Count of new submissions, for the Pending Actions Card.
export async function countNewSubmissions() {
  const { count, error } = await supabase
    .from('contact_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'new')

  if (error) throw error
  return count ?? 0
}

// Set the status pill. 'read' on first open, 'replied' once admin sends a
// response, 'archived' to dismiss. Stamps reviewed_by and reviewed_at when
// admin acts beyond just opening.
export async function setSubmissionStatus(submissionId, status, { adminNotes = null } = {}) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr) throw authErr
  if (!user)   throw new Error('Not signed in')

  const patch = { status }
  if (status !== 'new')        { patch.reviewed_by = user.id; patch.reviewed_at = new Date().toISOString() }
  if (adminNotes !== null)     { patch.admin_notes = adminNotes }

  const { data, error } = await supabase
    .from('contact_submissions')
    .update(patch)
    .eq('id', submissionId)
    .select('id, status, reviewed_by, reviewed_at, admin_notes')
    .single()

  if (error) throw error

  logAdminAction(
    `submission_${status}`,
    'contact_submissions',
    submissionId,
    null,
    adminNotes ? { admin_notes: adminNotes } : {}
  )

  return data
}
