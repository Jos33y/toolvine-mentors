import { useEffect, useState } from 'react'
import { fetchUserEmailEvents } from '@/lib/adminUsers'

// Delivery record for the drawer. Loads when a person is opened rather than
// with the list, because this table grows for the life of the account.
//
// The webhook receiver was built on 24 August, so anything sent before that
// has no record. Empty means unknown, not undelivered, and the surface has to
// say so or it repeats the mistake it was built to fix.
export function useUserEmailEvents(userId) {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoading(true)

    fetchUserEmailEvents(userId)
      .then((rows) => {
        if (cancelled) return
        setEvents(rows)
        setError(null)
      })
      .catch((e) => { if (!cancelled) setError(e) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [userId])

  return { events, loading, error }
}
