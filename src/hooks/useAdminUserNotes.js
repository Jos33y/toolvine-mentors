import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  fetchNotesForUser,
  createNote   as libCreateNote,
  updateNote   as libUpdateNote,
  deleteNote   as libDeleteNote
} from '@/lib/adminUserNotes'

// Admin notes attached to one user, newest first. Realtime-subscribed so a
// second admin's note shows up in the drawer without a refresh.
export function useAdminUserNotes(userId, { targetLabel = null } = {}) {
  const [notes,   setNotes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [saving,  setSaving]  = useState(false)

  const load = useCallback(async () => {
    if (!userId) return
    setError(null)
    setLoading(true)
    try {
      const data = await fetchNotesForUser(userId)
      setNotes(data)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    load()

    const channel = supabase
      .channel(`admin_user_notes_${userId}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'admin_user_notes',
        filter: `user_id=eq.${userId}`
      }, () => { load() })
      .subscribe()

    return () => { try { supabase.removeChannel(channel) } catch { /* gone */ } }
  }, [userId, load])

  const create = useCallback(async (body) => {
    if (!userId || !body?.trim()) return
    setSaving(true)
    setError(null)
    try {
      await libCreateNote(userId, body.trim(), { targetLabel })
      // Realtime fires the refetch. No optimistic insert needed.
    } catch (e) {
      setError(e)
    } finally {
      setSaving(false)
    }
  }, [userId, targetLabel])

  const update = useCallback(async (noteId, body) => {
    if (!body?.trim()) return
    setSaving(true)
    setError(null)
    try {
      await libUpdateNote(noteId, body.trim(), { userId, targetLabel })
    } catch (e) {
      setError(e)
    } finally {
      setSaving(false)
    }
  }, [userId, targetLabel])

  const remove = useCallback(async (noteId) => {
    setSaving(true)
    setError(null)
    try {
      await libDeleteNote(noteId, { userId, targetLabel })
    } catch (e) {
      setError(e)
    } finally {
      setSaving(false)
    }
  }, [userId, targetLabel])

  return { notes, loading, error, saving, refetch: load, create, update, remove }
}
