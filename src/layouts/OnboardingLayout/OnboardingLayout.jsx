import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import { homeFor } from '@/lib/roles'
import { Logo } from '@/components/shared/Logo/Logo'
import { NAMES } from '@/lib/taglines'
import './OnboardingLayout.css'

// Bare layout for post-sign-up onboarding. Brand mark top-left, centered form
// on warm cream, terms link at the foot. Mirrors the auth surface aesthetically
// so the cream canvas continues from sign-up through the form completion.

export function OnboardingLayout() {
  const session = useAuth((s) => s.session)
  const roles   = useAuth((s) => s.roles)

  // Signed-in users mid-onboarding: brand mark doubles as the back-to-dashboard
  // affordance. Falls back to the public home only if no session is present
  // (shouldn't happen here since RequireAuth wraps this route).
  const brandHref  = session && roles.length > 0 ? homeFor(roles) : '/'
  const brandLabel = session ? 'Back to dashboard' : `${NAMES.short} home`

  return (
    <div className="onb">
      <header className="onb__top">
        <Link to={brandHref} className="onb__brand-link" aria-label={brandLabel}>
          <Logo variant="mark" size={28} />
          <span className="onb__brand-name">{NAMES.short}</span>
        </Link>
      </header>

      <main className="onb__main">
        <Outlet />
      </main>

      <footer className="onb__bottom">
        <p className="onb__foot">
          By continuing, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy</Link>.
        </p>
      </footer>
    </div>
  )
}
