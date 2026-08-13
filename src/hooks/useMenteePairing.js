import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchMentorForMentee } from '@/lib/pairings'
import { fetchNextMeeting } from '@/lib/meetings'

const DEBOUNCE_MS = 300

const EMPTY = { pairingId: null, startedAt: null, mentor: null, focus: [], history: [] }

// Everything the mentee side reads about their own relationship: the current
// mentor with their offering focus, every past pairing, and the next
// scheduled meeting. Shared by the dashboard cards and the /mentor page so
// they never disagree.
//
// Subscribes to pairings filtered to this mentee, so an admin creating or
// ending a pairing lands on their screen without a reload.
export function useMenteePairing(menteeId) {
  const [pairing, setPairing] = useState(EMPTY)
  const [nextMeeting, setNextMeeting] = useState(null)
  const [loading, setLoading] = useState(Boolean(menteeId))
  const [error, setError]     = useState(null)

  const cancelledRef = useRef(false)
  const debounceRef  = useRef(null)

  const load = useCallback(async () => {
    if (!menteeId) return
    try {
      // fetchNextMeeting reads through RLS, which already scopes a mentee to
      // their own pairings, so it needs no id of its own.
      const [next, meeting] = await Promise.all([
        fetchMentorForMentee(menteeId),
        fetchNextMeeting()
      ])
      if (cancelledRef.current) return
      setPairing(next)
      setNextMeeting(meeting)
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
      setPairing(EMPTY)
      setNextMeeting(null)
      setLoading(false)
      return undefined
    }

    setLoading(true)
    load()

    const channel = supabase
      .channel(`mentee_pairing_${menteeId}`)
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'pairings', filter: `mentee_id=eq.${menteeId}` },
          () => scheduleReload())
      // Meetings cannot be filtered by mentee_id, so every event arrives and
      // the refetch does the filtering. Debounced, and mentee volume is low.
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'meetings' },
          () => scheduleReload())
      .subscribe()

    return () => {
      cancelledRef.current = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [menteeId, load, scheduleReload])

  return { pairing, nextMeeting, loading, error, refresh: load }
}
