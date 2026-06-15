import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchAdminUsers } from '@/lib/adminUsers'

export function useAdminUsers() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const cancelledRef = useRef(false)

  const load = useCallback(async () => {
    try {
      const data = await fetchAdminUsers()
      if (!cancelledRef.current) {
        setUsers(data)
        setError(null)
      }
    } catch (e) {
      if (!cancelledRef.current) setError(e)
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    load()

    // Multi-admin: keep the list current when another admin changes roles
    // or deactivates someone.
    const channel = supabase
      .channel('admin_users_changes')
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          () => load())
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'user_roles' },
          () => load())
      .subscribe()

    return () => {
      cancelledRef.current = true
      supabase.removeChannel(channel)
    }
  }, [load])

  // Optimistic patch when an action has just succeeded. Saves the round-trip
  // wait before the realtime echo lands.
  const patchUser = useCallback((id, partial) => {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...partial } : u))
  }, [])

  return { users, loading, error, reload: load, patchUser }
}
