import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import { ROLES, joinRoleLabels } from '@/lib/roles'
import { Logo } from '@/components/shared/Logo/Logo'
import { Icon } from '@/components/shared/Icon/Icon'
import { OnboardingBanner } from '@/components/shared/OnboardingBanner/OnboardingBanner'
import { VerifyEmailBanner } from '@/components/shared/VerifyEmailBanner/VerifyEmailBanner'
import './AppShell.css'

// One declarative list. Order matters: items higher in the array land in the
// mobile bottom tab bar first. Admin tools sit at the end so they spill into
// the More sheet for users who hold many roles.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', allow: null, end: true },

  // Role-primary daily action (only one of these shows per single-role user).
  { to: '/mentees',   label: 'Mentees',   icon: 'users',     allow: [ROLES.ADMIN, ROLES.MENTOR] },
  { to: '/mentor',    label: 'My Mentor', icon: 'user',      allow: [ROLES.MENTEE] },

  // Shared by every signed-in user.
  { to: '/meetings',  label: 'Meetings',  icon: 'meetings',  allow: null },
  { to: '/profile',   label: 'Profile',   icon: 'user',      allow: null },

  // Admin tools sit last so they spill to the More sheet on mobile when the
  // user holds many roles.
  { to: '/pairings',  label: 'Pairings',  icon: 'pairings',  allow: [ROLES.ADMIN] },
  { to: '/users',     label: 'Users',     icon: 'users',     allow: [ROLES.ADMIN] }
]

// Mobile bottom tab bar capacity. Items beyond this index move to the More
// sheet. 4 + a fixed "More" slot = 5 visible tabs.
const MOBILE_TAB_LIMIT = 4

export function AppShell() {
  const profile = useAuth((s) => s.profile)
  const roles   = useAuth((s) => s.roles)
  const signOut = useAuth((s) => s.signOut)
  const navigate = useNavigate()
  const location = useLocation()

  const [moreOpen, setMoreOpen] = useState(false)

  // Lock body scroll while the more sheet is open. Native-app behavior:
  // the page underneath should not move while a sheet is up.
  useEffect(() => {
    if (moreOpen) {
      const previous = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = previous }
    }
  }, [moreOpen])

  // Filter the nav to items the user's roles unlock.
  const items = useMemo(() => (
    NAV_ITEMS.filter((item) => !item.allow || item.allow.some((r) => roles.includes(r)))
  ), [roles])

  // Page title for the topbar. Derived from the active route. We sort by `to`
  // length so '/mentees' beats '/' when both prefix-match an item.
  const pageTitle = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.to.length - a.to.length)
    const match = sorted.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
    )
    return match?.label ?? ''
  }, [items, location.pathname])

  // Split items between the visible tab bar (first MOBILE_TAB_LIMIT) and the
  // More sheet (the rest).
  const visibleTabs = items.slice(0, MOBILE_TAB_LIMIT)
  const overflow    = items.slice(MOBILE_TAB_LIMIT)

  const handleSignOut = async () => {
    setMoreOpen(false)
    await signOut()
    navigate('/auth/sign-in', { replace: true })
  }

  const fullName   = profile?.full_name || profile?.email || ''
  const rolesLabel = joinRoleLabels(roles)

  return (
    <div className="shell">
      <a href="#main" className="skip-link">Skip to content</a>

      {/* ============ Desktop sidebar ============ */}
      <aside className="shell-sidebar" aria-label="Primary">
        <div className="shell-sidebar-brand">
          <Logo variant="mark-light" size={32} />
          <span className="shell-sidebar-brand-name">ToolVine</span>
        </div>

        <nav className="shell-nav" aria-label="Primary navigation">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `shell-nav-item ${isActive ? 'is-active' : ''}`}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {profile && (
          <div className="shell-identity">
            <div className="shell-identity-avatar" aria-hidden="true">{initials(fullName)}</div>
            <div className="shell-identity-text">
              <p className="shell-identity-name">{firstName(fullName)}</p>
              <p className="shell-identity-roles">{rolesLabel}</p>
            </div>
            <button
              type="button"
              className="shell-identity-signout"
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        )}
      </aside>

      {/* ============ Main column ============ */}
      <div className="shell-main">
        <header className="shell-topbar">
          <h1 className="shell-topbar-title">{pageTitle}</h1>
        </header>

        <VerifyEmailBanner />
        <OnboardingBanner />

        <main id="main" className="shell-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      {/* ============ Mobile bottom tab bar ============ */}
      <nav className="shell-tabs" aria-label="Primary navigation (mobile)">
        {visibleTabs.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `shell-tab ${isActive ? 'is-active' : ''}`}
          >
            <span className="shell-tab-icon"><Icon name={item.icon} size={20} /></span>
            <span className="shell-tab-label">{item.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className={`shell-tab ${moreOpen ? 'is-active' : ''}`}
          onClick={() => setMoreOpen(true)}
          aria-label="More"
          aria-expanded={moreOpen}
        >
          <span className="shell-tab-icon"><Icon name="menu" size={20} /></span>
          <span className="shell-tab-label">More</span>
        </button>
      </nav>

      {/* ============ Mobile More sheet ============ */}
      {moreOpen && (
        <button
          type="button"
          className="shell-sheet-backdrop"
          onClick={() => setMoreOpen(false)}
          aria-label="Close more menu"
        />
      )}

      <aside
        className={`shell-sheet ${moreOpen ? 'is-open' : ''}`}
        aria-label="More"
        aria-hidden={!moreOpen}
      >
        <div className="shell-sheet-handle" aria-hidden="true" />

        {overflow.length > 0 && (
          <nav className="shell-sheet-nav" aria-label="More navigation">
            {overflow.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `shell-sheet-link ${isActive ? 'is-active' : ''}`}
                onClick={() => setMoreOpen(false)}
              >
                <Icon name={item.icon} size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        )}

        {profile && (
          <div className="shell-sheet-identity">
            <div className="shell-identity-avatar" aria-hidden="true">{initials(fullName)}</div>
            <div className="shell-identity-text">
              <p className="shell-identity-name">{firstName(fullName)}</p>
              <p className="shell-identity-roles">{rolesLabel}</p>
            </div>
          </div>
        )}

        <button type="button" className="shell-sheet-signout" onClick={handleSignOut}>
          <Icon name="logout" size={18} />
          <span>Sign out</span>
        </button>
      </aside>
    </div>
  )
}

function firstName(full) {
  return full.trim().split(/\s+/)[0]
}

function initials(full) {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
