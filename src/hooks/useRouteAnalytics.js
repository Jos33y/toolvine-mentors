import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import { recordPageView } from '@/lib/pageViews'

// Mounted once in App.jsx. Fires recordPageView on every route change. The
// lib already handles dedup, DNT, dev-mode skip, and never throws, so this
// hook stays minimal.
export function useRouteAnalytics() {
  const location = useLocation()
  const userId   = useAuth((s) => s.session?.user?.id) ?? null

  useEffect(() => {
    recordPageView({ path: location.pathname, userId })
  }, [location.pathname, userId])
}
