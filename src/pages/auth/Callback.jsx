import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import { homeFor } from '@/lib/roles'
import './auth.css'

export function Callback() {
  const navigate = useNavigate()
  const session = useAuth((s) => s.session)
  const profile = useAuth((s) => s.profile)
  const roles   = useAuth((s) => s.roles)
  const loading = useAuth((s) => s.loading)

  useEffect(() => {
    if (loading) return

    if (!session) {
      navigate('/auth/sign-in', { replace: true })
      return
    }

    // Wait until both the profile row and user_roles rows have hydrated.
    // homeFor expects an array and picks the highest-priority role.
    if (profile && roles.length > 0) {
      navigate(homeFor(roles), { replace: true })
    }
  }, [loading, session, profile, roles, navigate])

  return (
    <section className="auth__panel">
      <header className="auth__panel-head">
        <span className="auth__eyebrow">One moment</span>
        <h1 className="auth__title">Signing you in</h1>
        <p className="auth__lede">Loading your dashboard.</p>
      </header>
    </section>
  )
}
