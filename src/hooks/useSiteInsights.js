import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchSiteInsights, EMPTY_INSIGHTS } from '@/lib/siteInsights'

// Powers SiteInsightsCard (7 day preview) and /admin/insights (range pills).
// Both callers pass `days`, which is the only knob that changes the window.
export function useSiteInsights({ days = 30, pathsLimit = 10 } = {}) {
  const [data,    setData]    = useState(EMPTY_INSIGHTS)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // A slow response for an abandoned range must not overwrite a newer one.
  const requestRef = useRef(0)

  const load = useCallback(async () => {
    const ticket = ++requestRef.current
    setLoading(true)
    setError(null)

    try {
      const next = await fetchSiteInsights({ days, pathsLimit })
      if (ticket !== requestRef.current) return
      setData(next)
    } catch (e) {
      if (ticket !== requestRef.current) return
      setError(e)
    } finally {
      if (ticket === requestRef.current) setLoading(false)
    }
  }, [days, pathsLimit])

  useEffect(() => { load() }, [load])

  return { ...data, loading, error, refetch: load }
}
