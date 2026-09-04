import { supabase } from '@/lib/supabase'

// Who an admin can put in a room or attribute a testimony to.
//
// Both pickers were reading profiles separately and one of them grew a roles
// join while the other did not. Two active accounts share the name Adedoyin
// Olajumoke Jegede, so a picker that shows a name and nothing else is offering
// a coin flip, and choosing wrong is silent: the meeting simply goes to
// somebody who was not meant to be in it.
//
// Reads profiles directly because only an admin reaches either surface and RLS
// returns them every row.

/* ============ Read ============ */

// Deactivated accounts are excluded: they cannot sign in, so they cannot
// attend a meeting or read a notice about their own testimony.
//
// Incomplete accounts stay and sort to the bottom. Convening a meeting is one
// of the better answers to somebody who has stalled, and the Users page has a
// filter for exactly those people. Pairing is different and v2.5 gates it on
// onboarded, because a pairing is a standing relationship and this is one
// conversation.
export async function fetchActivePeople() {
  const [pRes, rRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, photo_url, display_title, is_active, onboarded, email_verified')
      .eq('is_active', true)
      .order('full_name', { ascending: true }),
    supabase
      .from('user_roles')
      .select('user_id, role')
  ])

  if (pRes.error) throw pRes.error
  if (rRes.error) throw rRes.error

  const rolesByUser = new Map()
  for (const r of rRes.data ?? []) {
    if (!rolesByUser.has(r.user_id)) rolesByUser.set(r.user_id, [])
    rolesByUser.get(r.user_id).push(r.role)
  }

  return (pRes.data ?? [])
    .map((p) => ({
      ...p,
      roles:      rolesByUser.get(p.id) ?? [],
      incomplete: p.onboarded === false || p.email_verified === false
    }))
    .sort((a, b) => {
      if (a.incomplete !== b.incomplete) return a.incomplete ? 1 : -1
      return (a.full_name || '').localeCompare(b.full_name || '')
    })
}

/* ============ Labels ============ */

// Admin, then mentor, then mentee, the same priority homeFor and
// profiles_visible use. All of them, not just the highest: somebody who is a
// mentor and a mentee is exactly the person most likely to be placed on the
// wrong side of a table.
export function roleLabelsFor(roles) {
  const order = ['admin', 'mentor', 'mentee']
  return order
    .filter((r) => (roles ?? []).includes(r))
    .map((r) => r[0].toUpperCase() + r.slice(1))
}

// What is unfinished about an account, in the words the Users page uses.
// Empty for anybody complete.
export function incompleteLabelsFor(person) {
  const out = []
  if (person?.email_verified === false) out.push('Unverified')
  if (person?.onboarded === false)      out.push('Not onboarded')
  return out
}

// One line for a native select, which cannot hold two. The email is what tells
// two people with the same name apart and it is not optional decoration.
export function optionLabelFor(person) {
  const parts = [person?.full_name || 'Unnamed']
  const roles = roleLabelsFor(person?.roles)
  if (roles.length > 0) parts.push(roles.join(' and ').toLowerCase())
  if (person?.email)    parts.push(person.email)
  return parts.join('  \u00B7  ')
}
