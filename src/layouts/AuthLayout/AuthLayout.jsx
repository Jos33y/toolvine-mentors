import { Link, Outlet } from 'react-router-dom'
import { Logo } from '@/components/shared/Logo/Logo'
import { TAGLINES, NAMES } from '@/lib/taglines'
import './AuthLayout.css'

// UK long-form date, fixed at first render for the page session.
const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const todayLong = dateFormatter.format(new Date()).toUpperCase()

export function AuthLayout() {
  return (
    <div className="auth">
      <header className="auth__top">
        <Link to="/" className="auth__brand-link" aria-label={`${NAMES.short} home`}>
          <Logo variant="mark" size={28} />
          <span className="auth__brand-name">{NAMES.short}</span>
        </Link>
        <time className="auth__date">{todayLong}</time>
      </header>

      <main className="auth__main">
        <div className="auth__panel-wrap">
          <Outlet />

          <div className="auth__inscription">
            <span className="auth__inscription-rule" aria-hidden="true" />
            <p className="auth__inscription-text">{TAGLINES.authScreens}</p>
          </div>
        </div>
      </main>

      <footer className="auth__bottom">
        <p className="auth__foot">
          By continuing, you agree to our <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy</Link>.
        </p>
      </footer>
    </div>
  )
}
