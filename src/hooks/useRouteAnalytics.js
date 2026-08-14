import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import { recordPageView } from '@/lib/pageViews'

// Mounted once in App.jsx. Fires recordPageView on every route change. The lib
// handles dedup, DNT, dev-mode skip, and never throws.
//
// Waits for the auth store to settle before the first record. Firing earlier
// stamped a null user_id on the opening view of every session, and the 30
// second dedup then dropped the corrected second call, so every session read
// as signed out whoever it belonged to.
export function useRouteAnalytics() {
  const location  = useLocation()
  const authReady = useAuth((s) => !s.loading)
  const userId    = useAuth((s) => s.session?.user?.id ?? null)

  useEffect(() => {
    if (!authReady) return
    recordPageView({ path: location.pathname, userId })
  }, [authReady, location.pathname, userId])
}
