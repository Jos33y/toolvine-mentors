import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { uploadAvatar, tryRemoveAvatarObject } from '@/lib/avatar'

// Holds the Supabase session, the profile row, the user's roles, and the union of
// privileges granted across those role rows. Source of truth for route guards.
//
// Deactivation lockout (migration 0020): every loaded session subscribes to
// its own profile row. If is_active flips to false (admin deactivation), the
// listener signs the user out and redirects to /auth/sign-in. A load-time
// guard inside _loadUserData catches the case where they reload a tab while
// already deactivated.
export const useAuth = create((set, get) => ({
  session: null,
  profile: null,
  roles: [],
  privileges: {},
  loading: true,
  error: null,

  // Private. Holds the active realtime channel for the user's own profile row
  // so we can tear it down on sign-out or user switch.
  _profileChannel: null,

  init: async () => {
    set({ loading: true, error: null })

    const { data: { session } } = await supabase.auth.getSession()
    await get()._applySession(session)

    supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      await get()._applySession(nextSession)
    })

    set({ loading: false })
  },

  _applySession: async (session) => {
    if (!session) {
      get()._unsubscribeFromOwnProfile()
      set({ session: null, profile: null, roles: [], privileges: {} })
      return
    }
    set({ session })
    await get()._loadUserData(session.user.id)
  },

  // Pulls profile + user_roles for the given user. Extracted so refreshUser can
  // reuse it without touching the session.
  _loadUserData: async (userId) => {
    const [profileResult, rolesResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_roles').select('role, privileges').eq('user_id', userId)
    ])

    if (profileResult.error) {
      // PGRST116 = .single() found zero rows. For a user with a live session,
      // that almost always means the auth user was deleted server-side while
      // tokens still sit in localStorage. Sign out to clear the bad tokens so
      // the header drops back to logged-out and we stop retrying a dead query.
      if (profileResult.error.code === 'PGRST116') {
        get()._unsubscribeFromOwnProfile()
        await supabase.auth.signOut()
        set({ session: null, profile: null, roles: [], privileges: {} })
        return
      }
      set({ profile: null, roles: [], privileges: {} })
      return
    }

    // Deactivation guard. If the admin deactivated this user between our token
    // being issued and this load, kick them now. Without this, a deactivated
    // user could reach the dashboard for up to one access-token lifetime.
    if (profileResult.data && profileResult.data.is_active === false) {
      get()._unsubscribeFromOwnProfile()
      await supabase.auth.signOut()
      set({ session: null, profile: null, roles: [], privileges: {} })
      if (typeof window !== 'undefined') {
        window.location.replace('/auth/sign-in?reason=deactivated')
      }
      return
    }

    const rows = rolesResult.data ?? []
    const roles = rows.map((r) => r.role)
    // Union: a privilege is granted if ANY role row grants it. Matches the
    // backend has_privilege() helper, which checks across all the user's rows.
    const privileges = rows.reduce((acc, r) => {
      if (r.privileges && typeof r.privileges === 'object') {
        for (const [key, val] of Object.entries(r.privileges)) {
          if (val === true) acc[key] = true
        }
      }
      return acc
    }, {})

    set({ profile: profileResult.data, roles, privileges })

    // Subscribe to UPDATEs on our own profile row so a mid-session
    // deactivation kicks us within a second instead of waiting on a reload.
    get()._subscribeToOwnProfile(userId)
  },

  // Subscribes to UPDATE events on the current user's profile row. If the row
  // flips to inactive, we sign out and redirect. Other profile changes refresh
  // local state. Idempotent: tears down any previous channel before opening
  // the new one so we never leak subscriptions when the user switches.
  _subscribeToOwnProfile: (userId) => {
    get()._unsubscribeFromOwnProfile()

    const channel = supabase
      .channel(`profile_self_${userId}`)
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'profiles',
        filter: `id=eq.${userId}`
      }, async (payload) => {
        const next = payload.new
        if (next && next.is_active === false) {
          get()._unsubscribeFromOwnProfile()
          await supabase.auth.signOut()
          set({ session: null, profile: null, roles: [], privileges: {} })
          if (typeof window !== 'undefined') {
            window.location.replace('/auth/sign-in?reason=deactivated')
          }
          return
        }
        // Any other change: refresh in place so the UI stays current.
        await get()._loadUserData(userId)
      })
      .subscribe()

    set({ _profileChannel: channel })
  },

  _unsubscribeFromOwnProfile: () => {
    const ch = get()._profileChannel
    if (ch) {
      try { supabase.removeChannel(ch) } catch { /* already gone */ }
    }
    set({ _profileChannel: null })
  },

  refreshUser: async () => {
    const session = get().session
    if (!session) return
    await get()._loadUserData(session.user.id)
  },

  signIn: async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  },

  // role travels in user_metadata as role_hint; backend trigger reads it and
  // sets profiles.role_intent + role_undecided. Public sign-up always lands as
  // mentee in user_roles regardless of hint.
  signUp: async ({ email, password, fullName, role }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role_hint: role } }
    })
    if (error) throw error

    if (data.session) {
      supabase.functions.invoke('verify-email-send').catch((err) => {
        console.warn('[useAuth] verify-email-send failed:', err)
      })
    }

    return data
  },

  sendMagicLink: async ({ email }) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${import.meta.env.VITE_SITE_URL ?? window.location.origin}/auth/callback` }
    })
    if (error) throw error
  },

  resetPassword: async ({ email }) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.VITE_SITE_URL ?? window.location.origin}/auth/reset/confirm`
    })
    if (error) throw error
  },

  setPassword: async ({ password }) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  },

  sendVerifyEmail: async () => {
    const { data, error } = await supabase.functions.invoke('verify-email-send')
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return data
  },

  completeOnboarding: async (payload) => {
    const { error } = await supabase.rpc('complete_onboarding', { payload })
    if (error) throw error
    supabase.functions.invoke('welcome-send').catch((err) => {
      console.warn('[useAuth] welcome-send failed:', err)
    })
    await get().refreshUser()
  },

  // Writes user-editable profile fields. Server rejects if onboarded is false.
  updateProfile: async (payload) => {
    const { error } = await supabase.rpc('update_profile', { payload })
    if (error) throw error
    await get().refreshUser()
  },

  // photo_url is user-managed (not in the self-update guard), so a direct
  // UPDATE through RLS is enough. Storage RLS gates writes to {user_id}/...
  updateProfilePhoto: async (file) => {
    const session = get().session
    if (!session) throw new Error('Not authenticated')
    const userId = session.user.id
    const prev = get().profile?.photo_url ?? null

    const url = await uploadAvatar(userId, file)

    const { error } = await supabase
      .from('profiles')
      .update({ photo_url: url })
      .eq('id', userId)
    if (error) throw error

    await tryRemoveAvatarObject(prev)
    await get().refreshUser()
    return url
  },

  removeProfilePhoto: async () => {
    const session = get().session
    if (!session) throw new Error('Not authenticated')
    const userId = session.user.id
    const prev = get().profile?.photo_url ?? null

    const { error } = await supabase
      .from('profiles')
      .update({ photo_url: null })
      .eq('id', userId)
    if (error) throw error

    await tryRemoveAvatarObject(prev)
    await get().refreshUser()
  },

  signOut: async () => {
    get()._unsubscribeFromOwnProfile()
    await supabase.auth.signOut()
    // Clear per-session banner dismissals so the next sign-in nudges again.
    try {
      sessionStorage.removeItem('tv.verifyBannerDismissed')
      sessionStorage.removeItem('tv.onbBannerDismissed')
    } catch { /* private mode */ }
    set({ session: null, profile: null, roles: [], privileges: {} })
  }
}))
