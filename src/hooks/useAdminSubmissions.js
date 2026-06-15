import { useCallback, useEffect, useState } from 'react'
import {
  fetchSubmissions,
  countNewSubmissions,
  setSubmissionStatus
} from '@/lib/adminSubmissions'

// Paginated submissions list for /admin/submissions. Optimistically updates
// the local row when admin changes status so the UI feels instant.
export function useAdminSubmissions({ status = null, pageSize = 25 } = {}) {
  const [page,    setPage]    = useState(0)
  const [rows,    setRows]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetchSubmissions({ status, page, pageSize })
      setRows(res.rows)
      setTotal(res.total)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [status, page, pageSize])

  useEffect(() => { load() }, [load])

  // Reset to first page when the status filter changes.
  useEffect(() => { setPage(0) }, [status])

  const updateStatus = useCallback(async (id, nextStatus, opts = {}) => {
    // Optimistic local update.
    setRows((current) => current.map((r) => r.id === id ? { ...r, status: nextStatus } : r))
    try {
      const updated = await setSubmissionStatus(id, nextStatus, opts)
      setRows((current) => current.map((r) => r.id === id ? { ...r, ...updated } : r))
    } catch (e) {
      setError(e)
      // Roll back by refetching the truth from the server.
      load()
    }
  }, [load])

  return { rows, total, page, pageSize, setPage, loading, error, refetch: load, updateStatus }
}

// Light-weight count hook for the dashboard preview band. Independent of the
// paginated list above so the dashboard does not pay the list fetch cost.
export function useNewSubmissionsCount() {
  const [count,   setCount]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const n = await countNewSubmissions()
      setCount(n)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { count, loading, error, refetch: load }
}
