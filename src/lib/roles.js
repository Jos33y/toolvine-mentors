export const ROLES = Object.freeze({
  ADMIN:  'admin',
  MENTOR: 'mentor',
  MENTEE: 'mentee'
})

export const ROLE_LABEL = Object.freeze({
  [ROLES.ADMIN]:  'Admin',
  [ROLES.MENTOR]: 'Mentor',
  [ROLES.MENTEE]: 'Mentee'
})

// Priority when a user holds multiple roles. Admin tools first; then mentor;
// then mentee. Drives primaryRole() (default dashboard view) and
// joinRoleLabels() (sidebar identity block).
const HOME_PRIORITY = [ROLES.ADMIN, ROLES.MENTOR, ROLES.MENTEE]

export function isRole(value) {
  return Object.values(ROLES).includes(value)
}

export function hasRole(roles, role) {
  return Array.isArray(roles) && roles.includes(role)
}

export function hasAnyRole(roles, allowed) {
  if (!Array.isArray(roles) || roles.length === 0) return false
  return allowed.some((r) => roles.includes(r))
}

// All signed-in users land at /dashboard after the v2.5 route refactor. The
// Dashboard component delegates to the per-role view internally via primaryRole.
export function homeFor(roles) {
  if (!Array.isArray(roles) || roles.length === 0) return '/'
  return '/dashboard'
}

// Picks which role's dashboard renders by default at /dashboard. Multi-role
// users get the highest-priority view first; the role switcher (v3) will let
// them flip between contexts.
export function primaryRole(roles) {
  if (!Array.isArray(roles) || roles.length === 0) return null
  for (const r of HOME_PRIORITY) if (roles.includes(r)) return r
  return null
}

// "Mentor · Mentee" for a dual-role user; "Admin" for a single. Used in the
// sidebar identity block to show every surface this user can act in.
export function joinRoleLabels(roles) {
  if (!Array.isArray(roles) || roles.length === 0) return ''
  const order = HOME_PRIORITY.filter((r) => roles.includes(r))
  return order.map((r) => ROLE_LABEL[r]).join(' · ')
}

export function hasPrivilege(privileges, name) {
  return Boolean(privileges && privileges[name] === true)
}
