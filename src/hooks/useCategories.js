import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchActiveCategories } from '@/lib/categories'

// Cached fetch of active mentoring categories. Used by onboarding chip groups
// and any future focus-edit surface. Subscribes to mentoring_categories so an
// admin toggle or new entry surfaces without a refresh.
export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await fetchActiveCategories()
        if (cancelled) return
        setCategories(data)
        setError(null)
      } catch (e) {
        if (!cancelled) setError(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    const channel = supabase
      .channel('mentoring_categories_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mentoring_categories' },
        () => load()
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  return { categories, loading, error }
}
