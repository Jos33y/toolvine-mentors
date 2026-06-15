import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchRecentActivity, fetchActivityPage } from '@/lib/adminActivity'

// Recent activity for the dashboard card. Subscribes to admin_actions INSERT
// events so the feed updates within a second when another admin acts.
export function useAdminActivity({ limit = 8 } = {}) {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await fetchRecentActivity({ limit })
      setRows(data)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    load()

    const channel = supabase
      .channel('admin_actions_feed')
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'admin_actions'
      }, () => { load() })
      .subscribe()

    return () => { try { supabase.removeChannel(channel) } catch { /* gone */ } }
  }, [load])

  return { rows, loading, error, refetch: load }
}

// Paginated audit log for /admin/activity. Pure read; no realtime here.
// Filters are passed through to the lib call.
export function useAdminActivityPage({
  page     = 0,
  pageSize = 50,
  actorId  = null,
  action   = null,
  fromDate = null,
  toDate   = null
} = {}) {
  const [rows,    setRows]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetchActivityPage({ page, pageSize, actorId, action, fromDate, toDate })
      setRows(res.rows)
      setTotal(res.total)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, actorId, action, fromDate, toDate])

  useEffect(() => { load() }, [load])

  return { rows, total, loading, error, refetch: load }
}
