import { useEffect } from 'react'
import { useAuth } from '@/stores/useAuth'
import { useFlags } from '@/stores/useFlags'
import { Router } from './router'

export function App() {
  const initAuth = useAuth((s) => s.init)
  const hydrateFlags = useFlags((s) => s.hydrate)
  const resetFlags = useFlags((s) => s.reset)
  const session = useAuth((s) => s.session)

  useEffect(() => {
    initAuth()
  }, [initAuth])

  // Flags depend on the auth context, so re-hydrate on session change.
  useEffect(() => {
    if (session) hydrateFlags()
    else resetFlags()
  }, [session, hydrateFlags, resetFlags])

  return <Router />
}
