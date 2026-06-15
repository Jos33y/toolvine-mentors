import { useCallback, useEffect, useState } from 'react'
import {
  visitsLastNDays,
  topPaths,
  deviceSplit,
  visitsByDay,
  signupFunnel
} from '@/lib/siteInsights'

// Powers SiteInsightsCard (compact preview) and /admin/insights (full view).
// Defaults match the card display: last 7 days for headline numbers, top 3
// paths, last 30 days for the chart. Pass overrides for the page.
export function useSiteInsights({
  headlineDays = 7,
  chartDays    = 30,
  pathsLimit   = 5
} = {}) {
  const [visits,     setVisits]     = useState(0)
  const [paths,      setPaths]      = useState([])
  const [devices,    setDevices]    = useState({ mobile: 0, tablet: 0, desktop: 0, unknown: 0, total: 0 })
  const [series,     setSeries]     = useState([])
  const [funnel,     setFunnel]     = useState({ visitors: 0, signups: 0, onboarded: 0 })
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [v, p, d, s, f] = await Promise.all([
        visitsLastNDays(headlineDays),
        topPaths({ days: headlineDays, limit: pathsLimit }),
        deviceSplit({ days: headlineDays }),
        visitsByDay({ days: chartDays }),
        signupFunnel({ days: chartDays })
      ])
      setVisits(v)
      setPaths(p)
      setDevices(d)
      setSeries(s)
      setFunnel(f)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [headlineDays, chartDays, pathsLimit])

  useEffect(() => { load() }, [load])

  return { visits, paths, devices, series, funnel, loading, error, refetch: load }
}
