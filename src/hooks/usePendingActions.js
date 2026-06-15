import { useCallback, useEffect, useState } from 'react'
import { fetchPendingActions } from '@/lib/pendingActions'

// Five counts feeding the Pending Actions Card. Returns zero for everything
// while loading so the card can render placeholders without nulls.
export function usePendingActions() {
  const [counts, setCounts] = useState({
    pendingReviews:     0,
    newSubmissions:     0,
    stalledOnboardings: 0,
    unverifiedOver72h:  0,
    unpairedOver30d:    0
  })
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const next = await fetchPendingActions()
      setCounts(next)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Total across all five. Cards use this for the "nothing waiting" empty state.
  const total =
    counts.pendingReviews +
    counts.newSubmissions +
    counts.stalledOnboardings +
    counts.unverifiedOver72h +
    counts.unpairedOver30d

  return { counts, total, loading, error, refetch: load }
}
