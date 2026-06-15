import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchActiveMenteesForMentor } from '@/lib/pairings'
import { fetchUpcomingMeetingsForMentor, fetchMentorStats } from '@/lib/meetings'
import { fetchOpenItemsForMentor, countOpenItemsByPairing } from '@/lib/meetingActionItems'
import { deriveStatus } from '@/lib/mentorStatus'

const DEBOUNCE_MS = 300

// Composes everything the mentor dashboard reads: mentees enriched with focus
// + open count + derived status, upcoming sessions, the mentor's own open
// tasks, headline stats, and the admin-tuned thresholds.
//
// Subscribes to pairings (filtered to this mentor), meetings, and
// meeting_action_items. Realtime events are debounced so a burst (admin pairs
// two mentees back to back, or a webhook updates several rows) collapses to a
// single refresh instead of thrashing the UI.
export function useMentorDashboard(mentorId) {
  const [mentees, setMentees]         = useState([])
  const [upcoming, setUpcoming]       = useState([])
  const [actionItems, setActionItems] = useState([])
  const [stats, setStats]             = useState({
    assignedMentees: 0, upcomingMeetings: 0, completedMeetings: 0, hoursMentored: 0
  })
  const [thresholds, setThresholds]   = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  const cancelledRef = useRef(false)
  const debounceRef  = useRef(null)

  const load = useCallback(async () => {
    if (!mentorId) return
    try {
      const [menteesRaw, upcomingRows, items, statRow, settingsRow] = await Promise.all([
        fetchActiveMenteesForMentor(mentorId),
        fetchUpcomingMeetingsForMentor(mentorId, 5),
        fetchOpenItemsForMentor(mentorId, 5),
        fetchMentorStats(mentorId),
        supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'status_thresholds')
          .maybeSingle()
      ])

      if (cancelledRef.current) return

      const t = settingsRow?.data?.value ?? null

      // Open counts per pairing, used to flavour status.
      const pairingIds  = menteesRaw.map((m) => m.id)
      const countsByPid = await countOpenItemsByPairing(pairingIds)

      if (cancelledRef.current) return

      const enriched = menteesRaw.map((m) => {
        const openItemsCount = countsByPid.get(m.id) ?? 0
        const status = deriveStatus({
          pairingStartedAt: m.startedAt,
          lastMetAt:        m.lastMetAt,
          openItemsCount,
          thresholds: t
        })
        return { ...m, openItemsCount, status }
      })

      setMentees(enriched)
      setUpcoming(upcomingRows)
      setActionItems(items)
      setStats(statRow)
      setThresholds(t)
      setError(null)
    } catch (e) {
      if (!cancelledRef.current) setError(e)
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }, [mentorId])

  const scheduleReload = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      load()
      debounceRef.current = null
    }, DEBOUNCE_MS)
  }, [load])

  useEffect(() => {
    cancelledRef.current = false
    if (!mentorId) {
      setLoading(false)
      return undefined
    }
    setLoading(true)
    load()

    // Postgres realtime does not honour RLS in delivery; we receive all events
    // on meetings and meeting_action_items and let the next fetch filter
    // properly. Pairings filter on mentor_id since that one is cheap.
    const channel = supabase
      .channel(`mentor_dashboard_${mentorId}`)
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'pairings', filter: `mentor_id=eq.${mentorId}` },
          () => scheduleReload())
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'meetings' },
          () => scheduleReload())
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'meeting_action_items' },
          () => scheduleReload())
      .subscribe()

    return () => {
      cancelledRef.current = true
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [mentorId, load, scheduleReload])

  return { mentees, upcoming, actionItems, stats, thresholds, loading, error, refresh: load }
}
