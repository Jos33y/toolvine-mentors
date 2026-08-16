import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/stores/useAuth'
import { homeFor } from '@/lib/roles'
import { Logo } from '@/components/shared/Logo/Logo'
import { Icon } from '@/components/shared/Icon/Icon'
import { PublicFooter } from '@/components/shared/PublicFooter/PublicFooter'
import './PublicLayout.css'

// Flat nav items (About and Reach out are dropdowns rendered separately
// so their placement in the row is under our control).
const NAV_LEFT = [
  { to: '/',             label: 'Home',          end: true }
]

const NAV_RIGHT = [
  { to: '/programs',     label: 'Programs' },
  { to: '/how-it-works', label: 'How it Works' },
  { to: '/resources',    label: 'Resources' }
]

// About dropdown children. All four are peer destinations; none is
// visually prioritized above the others.
const ABOUT_ITEMS = [
  { to: '/about',    label: 'About',    caption: 'Who we are' },
  { to: '/team',     label: 'Team',     caption: 'The people who carry it' },
  { to: '/outreach', label: 'Outreach', caption: 'In the community' },
  { to: '/partners', label: 'Partners', caption: 'Who we work with' }
]

// Reach out dropdown children. Get Involved is marked primary so it
// visually leads. Contact stays as the quiet default.
const REACH_OUT_ITEMS = [
  { to: '/get-involved', label: 'Get Involved', caption: 'Volunteer, sponsor, donate, or partner', primary: true },
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
            <Logo variant="client-lockup" height={52} className="public-brand-lockup" />
          </Link>

          <nav className="public-nav-desktop" aria-label="Primary">
            {NAV_LEFT.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `public-nav-link ${isActive ? 'is-active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
            <NavDropdown label="About" items={ABOUT_ITEMS} />
            {NAV_RIGHT.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `public-nav-link ${isActive ? 'is-active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
            <NavDropdown label="Reach out" items={REACH_OUT_ITEMS} />
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
            <Icon name={open ? 'closeBold' : 'menu'} size={28} strokeWidth={2.25} />
          </button>
        </div>
      </header>

      {open && (
        <nav className="public-nav-mobile" aria-label="Primary mobile">
          {NAV_LEFT.map((item) => (
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

          <MobileGroup label="About" items={ABOUT_ITEMS} onNavigate={() => setOpen(false)} />

          {NAV_RIGHT.map((item) => (
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

          <MobileGroup label="Reach out" items={REACH_OUT_ITEMS} onNavigate={() => setOpen(false)} />

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

/* ============ NavDropdown ============
   Desktop dropdown used by both About and Reach out. Hover opens; mouse
   leave closes on a short delay to let the pointer travel from trigger to
   panel. Focus opens as well so keyboard users get the same reach.
   Escape closes. Items with primary: true get the highlighted styling. */

function NavDropdown({ label, items }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const closeTimerRef = useRef(null)
  const containerRef  = useRef(null)

  const isActive = items.some((i) => pathname === i.to || pathname.startsWith(i.to + '/'))

  const clearClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const scheduleClose = (delay = 160) => {
    clearClose()
    closeTimerRef.current = setTimeout(() => setOpen(false), delay)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  useEffect(() => () => clearClose(), [])

  // Close whenever the route changes so navigating a child auto-collapses.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div
      ref={containerRef}
      className={`public-nav-dropdown${open ? ' is-open' : ''}`}
      onMouseEnter={() => { clearClose(); setOpen(true) }}
      onMouseLeave={() => scheduleClose()}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        className={`public-nav-link public-nav-dropdown-trigger${isActive ? ' is-active' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onFocus={() => { clearClose(); setOpen(true) }}
        onBlur={() => scheduleClose(120)}
      >
        {label}
        <span className="public-nav-dropdown-caret" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 4 5 6.5 7.5 4" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="public-nav-dropdown-panel" role="menu">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              role="menuitem"
              className={({ isActive: linkActive }) =>
                `public-nav-dropdown-item${linkActive ? ' is-active' : ''}${item.primary ? ' is-primary' : ''}`
              }
              onFocus={() => { clearClose(); setOpen(true) }}
              onBlur={() => scheduleClose(120)}
              onClick={() => setOpen(false)}
            >
              <span className="public-nav-dropdown-item-label">{item.label}</span>
              {item.caption && (
                <span className="public-nav-dropdown-item-caption">{item.caption}</span>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

/* ============ MobileGroup ============
   Auto-expanded group used on the mobile sheet. Children are always
   visible, indented under the group label. */

function MobileGroup({ label, items, onNavigate }) {
  return (
    <div className="public-nav-mobile-group">
      <p className="public-nav-mobile-group-label">{label}</p>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `public-nav-mobile-link public-nav-mobile-sublink ${isActive ? 'is-active' : ''}${item.primary ? ' is-primary' : ''}`
          }
          onClick={onNavigate}
        >
          <span className="public-nav-mobile-sublink-label">{item.label}</span>
          {item.caption && (
            <span className="public-nav-mobile-sublink-caption">{item.caption}</span>
          )}
        </NavLink>
      ))}
    </div>
  )
}
