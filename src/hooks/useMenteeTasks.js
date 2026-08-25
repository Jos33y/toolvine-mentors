import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchOpenItemsForMentee } from '@/lib/meetingActionItems'

const DEBOUNCE_MS = 300

// Open tasks assigned to the signed-in mentee, and the card that renders them
// is where most items are actually marked done. Subscribes to
// meeting_action_items filtered to this mentee so a task the mentor writes
// appears without a refresh.
//
// The limit is passed as an options object. It used to be passed as a bare
// number, which destructured to nothing and happened to land on the same
// default, so the call worked while ignoring what it asked for.
export function useMenteeTasks(menteeId) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const cancelledRef = useRef(false)
  const debounceRef  = useRef(null)

  const load = useCallback(async () => {
    if (!menteeId) return
    try {
      const data = await fetchOpenItemsForMentee(menteeId, { limit: 10 })
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
