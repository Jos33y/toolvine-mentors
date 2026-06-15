import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/adminLog'

// Notes for one user. Sorted newest first. Joins the author's profile so the
// detail panel can render "Tofunmi · 2 days ago" without a second fetch.
export async function fetchNotesForUser(userId) {
  const { data, error } = await supabase
    .from('admin_user_notes')
    .select(`
      id, user_id, body, created_at, updated_at,
      author:profiles!admin_user_notes_created_by_fkey ( id, full_name, photo_url )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function createNote(userId, body, { targetLabel = null } = {}) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr) throw authErr
  if (!user)   throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('admin_user_notes')
    .insert({ user_id: userId, body, created_by: user.id })
    .select(`
      id, user_id, body, created_at, updated_at,
      author:profiles!admin_user_notes_created_by_fkey ( id, full_name, photo_url )
    `)
    .single()

  if (error) throw error

  logAdminAction('add_note', 'profiles', userId, targetLabel)
  return data
}

export async function updateNote(noteId, body, { userId = null, targetLabel = null } = {}) {
  const { data, error } = await supabase
    .from('admin_user_notes')
    .update({ body })
    .eq('id', noteId)
    .select(`
      id, user_id, body, created_at, updated_at,
      author:profiles!admin_user_notes_created_by_fkey ( id, full_name, photo_url )
    `)
    .single()

  if (error) throw error

  logAdminAction('update_note', 'profiles', userId ?? data.user_id, targetLabel)
  return data
}

export async function deleteNote(noteId, { userId = null, targetLabel = null } = {}) {
  const { error } = await supabase
    .from('admin_user_notes')
    .delete()
    .eq('id', noteId)

  if (error) throw error

  logAdminAction('delete_note', 'profiles', userId, targetLabel)
}
