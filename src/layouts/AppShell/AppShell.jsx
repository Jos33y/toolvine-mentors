import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import { ROLES, joinRoleLabels } from '@/lib/roles'
import { Logo } from '@/components/shared/Logo/Logo'
import { Icon } from '@/components/shared/Icon/Icon'
import { OnboardingBanner } from '@/components/shared/OnboardingBanner/OnboardingBanner'
import { VerifyEmailBanner } from '@/components/shared/VerifyEmailBanner/VerifyEmailBanner'
import { NotificationBell } from '@/components/shared/NotificationBell/NotificationBell'
import { useNotifications } from '@/hooks/useNotifications'
import './AppShell.css'

// NAV_ITEMS is the registry. Display order is then overridden per role via
// PRIMARY_BY_ROLE so each role sees its highest-value tools in the mobile
// tab bar. Resolved orderings:
//
//   Admin:  Dashboard · Users · Pairings · Activity log ·
//           [everything else in More, grouped]
//   Mentor: Dashboard · Mentees · Meetings · Profile · [Library, Notifications in More]
//   Mentee: Dashboard · My Mentor · Meetings · Profile · [Library, Notifications in More]
//
// Notifications stays out of the tab bar too. The bell sits in the topbar on
// every screen and is the primary way in; the page is where somebody goes to
// read back through, which is not a daily action.
//
// Library stays out of the tab bar on every role, D51. It is where somebody
// goes when a mentor points them at something, not a daily surface, and
// displacing Profile would pull it further from the onboarding nudge that
// asks people to finish it.
//
// Profile sits at the end across all roles. Contact messages moves to More for
// admin since they arrive infrequently and Activity log, Users and Pairings
// carry the daily admin workload.
//
// Labels earn their place or they get changed. An admin reported that they
// could not upload to the library, and they were right to: /library and
// /admin/resources were both in this list, four rows apart, called Library and
// Resources. They clicked the browse view, found no upload control, and filed
// a defect against a feature that had shipped. Manage library says which is
// which in the word itself.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard', allow: null, end: true, group: null },

  // Role-primary daily action (one shows per single-role user).
  // Both sides of the pairing take the mentoring glyph. No role sees both, so
  // nothing collides, and it leaves users to Users and user to Profile.
  { to: '/mentees',   label: 'Mentees',   icon: 'mentoring', allow: [ROLES.ADMIN, ROLES.MENTOR], group: 'mentoring' },
  { to: '/mentor',    label: 'My Mentor', icon: 'mentoring', allow: [ROLES.MENTEE],              group: 'mentoring' },

  // Shared by every signed-in user.
  { to: '/meetings',  label: 'Meetings',  icon: 'meetings',  allow: null, group: 'mentoring' },
  { to: '/library',   label: 'Library',   icon: 'resources', allow: null, group: 'mentoring' },

  // Admin tools fill the slots between Meetings and Profile so admin's
  // mobile tab bar carries platform-running shortcuts, not settings.
  { to: '/admin/users',        label: 'Users',            icon: 'users',      allow: [ROLES.ADMIN], group: 'people' },
  { to: '/admin/invites',      label: 'Invites',          icon: 'plus',       allow: [ROLES.ADMIN], group: 'people' },
  { to: '/admin/pairings',     label: 'Pairings',         icon: 'pairings',   allow: [ROLES.ADMIN], group: 'people' },

  { to: '/admin/resources',    label: 'Manage library',   icon: 'bookOpen',   allow: [ROLES.ADMIN], group: 'content' },
  { to: '/admin/verse',        label: 'Verse of the week', icon: 'sunrise',   allow: [ROLES.ADMIN], group: 'content' },
  { to: '/admin/partners',     label: 'Partners',         icon: 'handshake',  allow: [ROLES.ADMIN], group: 'content' },

  // mail belongs to inbound post, so Invites moved off it above. Two rows
  // carrying the same glyph read as the same row twice at 18px on dark.
  { to: '/admin/submissions',  label: 'Contact messages', icon: 'mail',       allow: [ROLES.ADMIN], group: 'oversight' },
  { to: '/admin/insights',     label: 'Analytics',        icon: 'trendingUp', allow: [ROLES.ADMIN], group: 'oversight' },
  { to: '/admin/activity',     label: 'Activity log',     icon: 'activity',   allow: [ROLES.ADMIN], group: 'oversight' },

  // Notifications and Profile last. Both low-frequency and settings-tier:
  // the bell in the topbar is the way into notifications day to day.
  { to: '/notifications', label: 'Notifications', icon: 'bell', allow: null, group: 'account' },
  { to: '/profile',       label: 'Profile',       icon: 'user', allow: null, group: 'account' }
]

// Headings for the grouped sidebar. Ordered: what an admin does as a member of
// the community, then what they do as its operator.
const GROUPS = [
  { key: 'mentoring', label: 'Mentoring' },
  { key: 'people',    label: 'People' },
  { key: 'content',   label: 'Content' },
  { key: 'oversight', label: 'Oversight' },
  { key: 'account',   label: 'Account' }
]

// Below this, headings cost more than they give. A mentor sees six items and
// reads them at a glance; an admin sees fifteen and cannot. The client did not
// report the flat list, they reported that Analytics was overlooked, which is
// what a flat list of fifteen does to its ninth row.
const GROUPING_THRESHOLD = 8

// Mobile bottom tab bar capacity. Items beyond this index move to the More
// sheet. 4 + a fixed "More" slot = 5 visible tabs.
const MOBILE_TAB_LIMIT = 4

// Per-role display order. The first four entries here become the visible
// mobile tabs; everything else flows to More. Admin sees admin tools first;
// mentor/mentee see their relationship surface first.
const PRIMARY_BY_ROLE = {
  [ROLES.ADMIN]:  ['/dashboard', '/admin/users', '/admin/pairings', '/admin/activity'],
  [ROLES.MENTOR]: ['/dashboard', '/mentees', '/meetings', '/profile'],
  [ROLES.MENTEE]: ['/dashboard', '/mentor',  '/meetings', '/profile']
}

// Sidebar order is the registry order, grouped. The tab-bar priority list
// above deliberately does not reorder the sidebar: a grouped column that
// reshuffles itself per role would teach nobody where anything lives.
function groupItems(list) {
  const seen = new Map()
  for (const item of list) {
    const key = item.group ?? '_top'
    if (!seen.has(key)) seen.set(key, [])
    seen.get(key).push(item)
  }

  const sections = []
  if (seen.has('_top')) sections.push({ key: '_top', label: null, items: seen.get('_top') })
  for (const g of GROUPS) {
    if (seen.has(g.key)) sections.push({ key: g.key, label: g.label, items: seen.get(g.key) })
  }
  return sections
}

function primaryRole(roles) {
  if (roles.includes(ROLES.ADMIN))  return ROLES.ADMIN
  if (roles.includes(ROLES.MENTOR)) return ROLES.MENTOR
  if (roles.includes(ROLES.MENTEE)) return ROLES.MENTEE
  return null
}

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

  // Filter the nav to items the user's roles unlock. Two orderings come out of
  // this. The sidebar keeps registry order so the groups stay intact; the tab
  // bar reorders by primary role so the four visible tabs are the daily tools.
  const allowed = useMemo(() => NAV_ITEMS.filter((item) =>
    !item.allow || item.allow.some((r) => roles.includes(r))
  ), [roles])

  const items = useMemo(() => {
    const primary = primaryRole(roles)
    const order   = PRIMARY_BY_ROLE[primary] ?? []

    const prioritized = order
      .map((to) => allowed.find((item) => item.to === to))
      .filter(Boolean)

    const used      = new Set(prioritized.map((item) => item.to))
    const remaining = allowed.filter((item) => !used.has(item.to))

    return [...prioritized, ...remaining]
  }, [allowed, roles])

  // Headings only where the list is long enough to need them. Admin crosses
  // the threshold, mentor and mentee do not and stay a plain column.
  const grouped = useMemo(
    () => (allowed.length >= GROUPING_THRESHOLD ? groupItems(allowed) : null),
    [allowed]
  )

  // One notifications subscription for the whole app. The bell reads it here
  // and the page reads it through the outlet, rather than each opening a
  // channel of its own.
  const notifications = useNotifications({ enabled: Boolean(profile) })

  // Page title for the topbar. Derived from the active route. We sort by `to`
  // length so '/mentees' beats '/' when both prefix-match an item.
  const pageTitle = useMemo(() => {
    const sorted = [...allowed].sort((a, b) => b.to.length - a.to.length)
    const match = sorted.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
    )
    return match?.label ?? ''
  }, [allowed, location.pathname])

  // Split items between the visible tab bar (first MOBILE_TAB_LIMIT) and the
  // More sheet (the rest).
  const visibleTabs = items.slice(0, MOBILE_TAB_LIMIT)
  const overflow    = items.slice(MOBILE_TAB_LIMIT)

  // The sheet takes headings on the same rule as the sidebar. Admin overflows
  // eleven items into it, which is a scroll of undifferentiated rows without
  // them. Registry order, not tab-bar order, so the groups stay contiguous.
  const overflowGroups = useMemo(() => {
    if (overflow.length < GROUPING_THRESHOLD) return null
    const inOverflow = new Set(overflow.map((item) => item.to))
    return groupItems(allowed.filter((item) => inOverflow.has(item.to)))
  }, [allowed, overflow])

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
          <Logo variant="client-mark" height={30} />
          <span className="shell-sidebar-brand-name">Toolvine</span>
        </div>

        <nav className="shell-nav" aria-label="Primary navigation">
          {grouped
            ? grouped.map((section) => (
                <div key={section.key} className="shell-nav-group">
                  {section.label && (
                    <p className="shell-nav-heading" id={`nav-${section.key}`}>{section.label}</p>
                  )}
                  <div
                    className="shell-nav-list"
                    role="group"
                    aria-labelledby={section.label ? `nav-${section.key}` : undefined}
                  >
                    {section.items.map((item) => (
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
                  </div>
                </div>
              ))
            : allowed.map((item) => (
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
          <NotificationBell
            items={notifications.items}
            unread={notifications.unread}
            onReadOne={notifications.readOne}
            onReadAll={notifications.readAll}
          />
        </header>

        <VerifyEmailBanner />
        <OnboardingBanner />

        <main id="main" className="shell-content" tabIndex={-1}>
          <Outlet context={{ notifications }} />
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
            {overflowGroups
              ? overflowGroups.map((section) => (
                  <div key={section.key} className="shell-sheet-group">
                    {section.label && (
                      <p className="shell-sheet-heading" id={`sheet-${section.key}`}>{section.label}</p>
                    )}
                    <div
                      className="shell-sheet-list"
                      role="group"
                      aria-labelledby={section.label ? `sheet-${section.key}` : undefined}
                    >
                      {section.items.map((item) => (
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
                    </div>
                  </div>
                ))
              : overflow.map((item) => (
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
