import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchNotifications, fetchUnreadCount, markRead, markAllRead } from '@/lib/notifications'

// One subscription for the whole app, mounted in AppShell. The bell and the
// notifications page both read from here rather than each opening a channel.
export function useNotifications({ enabled = true } = {}) {
  const [items,   setItems]   = useState([])
  const [unread,  setUnread]  = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!enabled) return
    try {
      const [rows, count] = await Promise.all([fetchNotifications(), fetchUnreadCount()])
      setItems(rows)
      setUnread(count)
    } catch {
      // A failed read costs a bell, not a page. Nothing else on the shell
      // should break because notifications did.
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => { load() }, [load])

  // The dot appears while a mentee is sitting on the dashboard, without a poll.
  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => load()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [enabled, load])

  // Optimistic, then reconciled. A row marked read should stop looking unread
  // before the round trip finishes.
  const readOne = useCallback(async (id) => {
    setItems((list) => list.map((n) => (n.id === id && !n.read_at
      ? { ...n, read_at: new Date().toISOString() }
      : n)))
    setUnread((n) => Math.max(0, n - 1))
    try { await markRead(id) } catch { load() }
  }, [load])

  const readAll = useCallback(async () => {
    const now = new Date().toISOString()
    setItems((list) => list.map((n) => (n.read_at ? n : { ...n, read_at: now })))
    setUnread(0)
    try { await markAllRead() } catch { load() }
  }, [load])

  return { items, unread, loading, reload: load, readOne, readAll }
}
