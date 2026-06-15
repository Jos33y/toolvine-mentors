import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchOpenItemsForMentee } from '@/lib/meetingActionItems'

const DEBOUNCE_MS = 300

// Open tasks assigned to the signed-in mentee. Read-only in Block C; the
// mark-done action ships in a later block. Subscribes to meeting_action_items
// filtered to this mentee so a task the mentor writes in Block D appears
// without a refresh.
export function useMenteeTasks(menteeId) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const cancelledRef = useRef(false)
  const debounceRef  = useRef(null)

  const load = useCallback(async () => {
    if (!menteeId) return
    try {
      const data = await fetchOpenItemsForMentee(menteeId, 10)
      if (cancelledRef.current) return
      setItems(data)
      setError(null)
    } catch (e) {
      if (!cancelledRef.current) setError(e)
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }, [menteeId])

  const scheduleReload = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      load()
      debounceRef.current = null
    }, DEBOUNCE_MS)
  }, [load])

  useEffect(() => {
    cancelledRef.current = false
    if (!menteeId) {
      setLoading(false)
      return undefined
    }
    setLoading(true)
    load()

    const channel = supabase
      .channel(`mentee_tasks_${menteeId}`)
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'meeting_action_items', filter: `assigned_to=eq.${menteeId}` },
          () => scheduleReload())
      .subscribe()

    return () => {
      cancelledRef.current = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [menteeId, load, scheduleReload])

  return { items, loading, error, refresh: load }
}
