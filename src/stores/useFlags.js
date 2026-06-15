import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useFlags = create((set, get) => ({
  values: {},
  loaded: false,
  channel: null,

  hydrate: async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')

    if (error) {
      if (import.meta.env.DEV) console.warn('[flags] hydrate failed:', error.message)
      set({ values: {}, loaded: true })
      return
    }

    const values = {}
    for (const row of data) values[row.key] = row.value
    set({ values, loaded: true })

    get()._subscribe()
  },

  _subscribe: () => {
    if (get().channel) return

    const channel = supabase
      .channel('app_settings_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        (payload) => {
          set((s) => {
            const next = { ...s.values }
            if (payload.eventType === 'DELETE') {
              delete next[payload.old.key]
            } else if (payload.new) {
              next[payload.new.key] = payload.new.value
            }
            return { values: next }
          })
        }
      )
      .subscribe()

    set({ channel })
  },

  reset: () => {
    const ch = get().channel
    if (ch) supabase.removeChannel(ch)
    set({ values: {}, loaded: false, channel: null })
  },

  get: (key) => get().values[key]
}))
