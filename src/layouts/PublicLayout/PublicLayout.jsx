import { NavLink, Outlet, Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@/stores/useAuth'
import { homeFor } from '@/lib/roles'
import { NAMES } from '@/lib/taglines'
import { Logo } from '@/components/shared/Logo/Logo'
import { Icon } from '@/components/shared/Icon/Icon'
import { PublicFooter } from '@/components/shared/PublicFooter/PublicFooter'
import './PublicLayout.css'

const NAV = [
  { to: '/',             label: 'Home',          end: true },
  { to: '/about',        label: 'About' },
  { to: '/programs',     label: 'Programs' },
  { to: '/how-it-works', label: 'How it Works' },
  { to: '/resources',    label: 'Resources' },
  { to: '/contact',      label: 'Contact' }
]

export function PublicLayout() {
  const session = useAuth((s) => s.session)
  const roles   = useAuth((s) => s.roles)
  const [open, setOpen] = useState(false)

  // homeFor expects the roles array (role no longer lives on profiles).
  // Guard on session AND roles so a hydrating-but-not-ready state falls back
  // safely to sign-in instead of resolving to an undefined route.
  const dashboardHref = session && roles.length > 0 ? homeFor(roles) : '/auth/sign-in'

  return (
    <div className="public">
      <a href="#main" className="skip-link">Skip to content</a>

      <header className="public-header">
        <div className="public-header-inner">
          <Link to="/" className="public-brand" onClick={() => setOpen(false)}>
            <Logo variant="mark" size={34} />
            <span className="public-brand-name">{NAMES.short}</span>
          </Link>

          <nav className="public-nav-desktop" aria-label="Primary">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `public-nav-link ${isActive ? 'is-active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="public-cta-desktop">
            {session ? (
              <Link to={dashboardHref} className="public-cta-btn">Dashboard</Link>
            ) : (
              <>
                <Link to="/auth/sign-in" className="public-cta-link">Sign in</Link>
                <Link to="/auth/sign-up" className="public-cta-btn">Get started</Link>
              </>
            )}
          </div>

          <button
            className={`public-menu-btn${open ? ' is-open' : ''}`}
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            <Icon name={open ? 'close' : 'menu'} size={26} strokeWidth={2} />
          </button>
        </div>
      </header>

      {open && (
        <nav className="public-nav-mobile" aria-label="Primary mobile">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `public-nav-mobile-link ${isActive ? 'is-active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          <div className="public-nav-mobile-cta">
            {session ? (
              <Link to={dashboardHref} className="public-cta-btn" onClick={() => setOpen(false)}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/auth/sign-in" className="public-cta-link" onClick={() => setOpen(false)}>
                  Sign in
                </Link>
                <Link to="/auth/sign-up" className="public-cta-btn" onClick={() => setOpen(false)}>
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>
      )}

      <main id="main" className="public-main">
        <Outlet />
      </main>

      <PublicFooter />
    </div>
  )
}
