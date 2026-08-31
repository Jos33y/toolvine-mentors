import { useCallback, useEffect, useState } from 'react'
import {
  fetchTestimonies,
  countPendingTestimonies,
  setTestimonyStatus,
  setTestimonyFeatured,
  editTestimony,
  deleteTestimony
} from '@/lib/testimonies'

// Paginated moderation queue for /admin/testimonies. Same shape as
// useAdminSubmissions, because it is the same job: a status filter, a page,
// and optimistic local updates so working through a list feels immediate.
//
// A row stays visible in its old bucket after a decision, so the admin keeps
// their place instead of watching it vanish mid-read. Switching tabs refetches
// the truth.
export function useAdminTestimonies({ status = 'pending', pageSize = 25 } = {}) {
  const [page,    setPage]    = useState(0)
  const [rows,    setRows]    = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetchTestimonies({ status, page, pageSize })
      setRows(res.rows)
      setTotal(res.total)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [status, page, pageSize])

  useEffect(() => { load() }, [load])

  useEffect(() => { setPage(0) }, [status])

  // The write decides approved_at, the rejection reason and is_featured
  // together, because three CHECK constraints tie them. The optimistic patch
  // here only moves status; the row is replaced with what came back.
  const decide = useCallback(async (id, next, opts = {}) => {
    setRows((cur) => cur.map((r) => r.id === id ? { ...r, status: next } : r))
    try {
      const updated = await setTestimonyStatus(id, next, opts)
      setRows((cur) => cur.map((r) => r.id === id ? { ...r, ...updated } : r))
      return updated
    } catch (e) {
      setError(e)
      load()
      throw e
    }
  }, [load])

  const feature = useCallback(async (id, on) => {
    setRows((cur) => cur.map((r) => r.id === id ? { ...r, is_featured: on } : r))
    try {
      const updated = await setTestimonyFeatured(id, on)
      setRows((cur) => cur.map((r) => r.id === id ? { ...r, ...updated } : r))
    } catch (e) {
      setError(e)
      load()
    }
  }, [load])

  // No optimistic patch. A correction is the one action here where showing
  // the new text before the write lands would leave the wrong words on screen
  // if it failed.
  const edit = useCallback(async (id, patch) => {
    const updated = await editTestimony(id, patch)
    setRows((cur) => cur.map((r) => r.id === id ? { ...r, ...updated } : r))
    return updated
  }, [])

  // Removed locally only after the delete returns, because RLS filters a
  // refused delete to zero rows rather than raising and the lib turns that
  // into an error.
  const remove = useCallback(async (id) => {
    await deleteTestimony(id)
    setRows((cur) => cur.filter((r) => r.id !== id))
    setTotal((n) => Math.max(0, n - 1))
  }, [])

  return {
    rows, total, page, pageSize, setPage,
    loading, error, refetch: load, decide, feature, edit, remove
  }
}

// Count only, for the sidebar badge and the dashboard band. Separate so those
// surfaces do not pay for the list fetch.
//
// enabled matches the shape useNotifications already uses in AppShell. The
// sidebar mounts for every role and hooks cannot be called conditionally, so
// the flag is what stops a mentee firing a query that RLS would answer with
// their own row count anyway.
export function usePendingTestimoniesCount({ enabled = true } = {}) {
  const [count,   setCount]   = useState(0)
  const [loading, setLoading] = useState(Boolean(enabled))
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    if (!enabled) { setCount(0); setLoading(false); return }
    setError(null)
    try {
      setCount(await countPendingTestimonies())
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => { load() }, [load])

  return { count, loading, error, refetch: load }
}
