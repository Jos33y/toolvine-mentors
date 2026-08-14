import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchActiveCategories } from '@/lib/categories'

// Cached fetch of active mentoring categories. Subscribes to the table so an
// admin toggle or new entry surfaces without a refresh.
//
// `categories` stays the focus list, which is what onboarding and any
// focus-edit surface already read. Before the two taxonomies split every row
// was a focus row, so that name keeps meaning what it always meant and no
// existing caller changes. Library and admin surfaces read resourceCategories.
export function useCategories() {
  const [all, setAll]         = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await fetchActiveCategories()
        if (cancelled) return
        setAll(data)
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

  const categories = useMemo(() => all.filter((c) => c.is_focus_category !== false), [all])
  const resourceCategories = useMemo(() => all.filter((c) => c.is_resource_category !== false), [all])

  return { categories, resourceCategories, allCategories: all, loading, error }
}
