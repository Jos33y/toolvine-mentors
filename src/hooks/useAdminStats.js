import { useCallback, useEffect, useState } from 'react'
import { fetchAdminStats, fetchAdminTrends } from '@/lib/adminStats'

// Powers AdminStatsRow (six numbers) and EngagementSnapshot (three trends).
// Both data sources run in parallel on mount. refetch() repeats both.
export function useAdminStats() {
  const [stats,  setStats]  = useState(null)
  const [trends, setTrends] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [s, t] = await Promise.all([fetchAdminStats(), fetchAdminTrends()])
      setStats(s)
      setTrends(t)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { stats, trends, loading, error, refetch: load }
}
