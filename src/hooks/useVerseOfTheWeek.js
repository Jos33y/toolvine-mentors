import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchCurrentVerse, isVerseStale } from '@/lib/verseOfTheWeek'

export function useVerseOfTheWeek() {
  const [verse, setVerse]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const v = await fetchCurrentVerse()
        if (cancelled) return
        setVerse(v)
        setError(null)
      } catch (e) {
        if (!cancelled) setError(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    // Refetch on any admin change so mounted dashboards stay current.
    const channel = supabase
      .channel('verse_of_the_week_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'verse_of_the_week' },
        () => load()
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  const stale   = verse ? isVerseStale(verse) : true
  const visible = !!verse && !stale

  return { verse, loading, error, visible }
}
