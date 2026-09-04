import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/adminLog'

// Testimonies arrive three ways and land in one table.
//
//   member       submitted through the platform, pending until approved
//   admin        relayed. Heard in a meeting, sent over WhatsApp, told in
//                person. Approved on arrival, because the admin typing it is
//                the person who would approve it
//   vinethoughts lifted from an edition. No author, so nobody can withdraw it
//
// Q42 gives withdrawal to the author, and the author is whoever lived the
// thing rather than whoever typed it. So a relayed testimony with a linked
// account is withdrawable by that person, and the notification raised on
// insert is how they find out it exists.
//
// Nothing here reads the base table for the public site. testimonies_public
// returns four columns and no author id, so a name on the wall cannot be
// joined back to an account.

/* ============ Constants ============ */

export const TESTIMONY_STATUS = Object.freeze({
  PENDING:   'pending',
  APPROVED:  'approved',
  REJECTED:  'rejected',
  WITHDRAWN: 'withdrawn'
})

export const TESTIMONY_STATUS_LABELS = Object.freeze({
  pending:   'Waiting',
  approved:  'Published',
  rejected:  'Declined',
  withdrawn: 'Withdrawn'
})

export const TESTIMONY_SOURCE = Object.freeze({
  MEMBER:       'member',
  ADMIN:        'admin',
  VINETHOUGHTS: 'vinethoughts'
})

export const TESTIMONY_SOURCE_LABELS = Object.freeze({
  member:       'Submitted',
  admin:        'Relayed',
  vinethoughts: 'Vinethoughts'
})

export const TESTIMONY_FILTERS = [
  { key: 'pending',   label: 'Waiting' },
  { key: 'approved',  label: 'Published' },
  { key: 'rejected',  label: 'Declined' },
  { key: 'withdrawn', label: 'Withdrawn' }
]

export const DEFAULT_TESTIMONY_FILTER = 'pending'

export const BODY_MIN = 40
export const BODY_MAX = 1200

const FIELDS = `
  id, source, author_id, recorded_by, display_name, role_label, body,
  status, rejection_reason, edition_num, is_featured,
  requested_by, requested_at, created_at, updated_at, approved_at
`

/* ============ Reads ============ */

// The caller's own, in any state, so they can read a decision and its reason.
// One live per author is enforced by testimonies_one_live_per_author, but a
// withdrawn or declined one stays as history, so this takes the newest.
export async function fetchMyTestimony(authorId) {
  if (!authorId) return null

  const { data, error } = await supabase
    .from('testimonies')
    .select(FIELDS)
    .eq('author_id', authorId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  return (data ?? [])[0] ?? null
}

// The public wall. Reads the view, which is approved rows and four columns.
// Available to anon, so the marketing site calls this without a session.
export async function fetchPublicTestimonies({ limit = 60 } = {}) {
  const { data, error } = await supabase
    .from('testimonies_public')
    .select('id, display_name, role_label, body, is_featured, created_at')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

// Q39. Three completed sessions, or an admin asked, and nothing live already.
// Derived in the database rather than counted here, so the rule has one home.
export async function isPromptDue() {
  const { data, error } = await supabase.rpc('testimony_prompt_due')
  if (error) throw error
  return data === true
}

/* ============ Admin queue ============ */

// Same shape as adminSubmissions: a status filter, a page, and a count hook
// kept separate so the dashboard does not pay the list fetch cost.
export async function fetchTestimonies({
  status   = DEFAULT_TESTIMONY_FILTER,
  page     = 0,
  pageSize = 25
} = {}) {
  let q = supabase
    .from('testimonies')
    .select(`
      ${FIELDS},
      author:profiles!testimonies_author_id_fkey ( id, full_name, photo_url ),
      recorder:profiles!testimonies_recorded_by_fkey ( id, full_name )
    `, { count: 'exact' })

  if (status) q = q.eq('status', status)

  const from = page * pageSize
  const to   = from + pageSize - 1

  const { data, error, count } = await q
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error
  return { rows: data ?? [], total: count ?? 0 }
}

export async function countPendingTestimonies() {
  const { count, error } = await supabase
    .from('testimonies')
    .select('id', { count: 'exact', head: true })
    .eq('status', TESTIMONY_STATUS.PENDING)

  if (error) throw error
  return count ?? 0
}

// Who an admin can attach a relayed testimony to. Same list the convene picker
// uses, and it now comes from the same place: this one selected a name and a
// photo and nothing else, so two accounts sharing a name were indistinguishable
// and linking the wrong one is not a small mistake. It publishes somebody's
// words under another person's account and hands them the right to take it
// down.
export { fetchActivePeople as fetchTestimonyCandidates } from '@/lib/people'

/* ============ Writes ============ */

// A member's own. status, is_featured and edition_num are all absent: the
// insert policy pins them, so sending one is at best redundant and at worst a
// write that fails after the click.
export async function submitTestimony({ authorId, displayName, roleLabel, body }) {
  const { data, error } = await supabase
    .from('testimonies')
    .insert({
      source:       TESTIMONY_SOURCE.MEMBER,
      author_id:    authorId,
      recorded_by:  authorId,
      display_name: String(displayName || '').trim(),
      role_label:   roleLabel || null,
      body:         String(body || '').trim()
    })
    .select(FIELDS)
    .single()

  if (error) throw error
  return data
}

// An admin relaying what somebody told them. Approved on arrival, because the
// person typing it is the person who would approve it.
//
// authorId is the whole difference between the two cases. Linked, and the
// person is notified and can withdraw it. Unlinked, and nobody can, so the
// admin has to be right the first time. The form makes that a choice rather
// than a default.
export async function recordTestimony({
  authorId = null,
  recordedBy,
  displayName,
  roleLabel,
  body,
  label = null
}) {
  const { data, error } = await supabase
    .from('testimonies')
    .insert({
      source:       TESTIMONY_SOURCE.ADMIN,
      author_id:    authorId,
      recorded_by:  recordedBy,
      display_name: String(displayName || '').trim(),
      role_label:   roleLabel || null,
      body:         String(body || '').trim(),
      status:       TESTIMONY_STATUS.APPROVED,
      approved_at:  new Date().toISOString()
    })
    .select(FIELDS)
    .single()

  if (error) throw error
  logAdminAction('testimony_recorded', 'testimonies', data.id, label ?? data.display_name)
  return data
}

// testimonies_approved_check ties approved to approved_at and
// testimonies_rejection_check ties rejected to a reason, so each pair moves in
// one statement or the write fails. is_featured is cleared on the way out of
// approved because testimonies_featured_check would refuse the row otherwise.
export async function setTestimonyStatus(id, status, { reason = null, label = null } = {}) {
  const payload = { status }

  if (status === TESTIMONY_STATUS.APPROVED) {
    payload.approved_at      = new Date().toISOString()
    payload.rejection_reason = null
  } else {
    payload.is_featured = false
    if (status === TESTIMONY_STATUS.REJECTED) {
      payload.rejection_reason = String(reason || '').trim()
    } else {
      payload.rejection_reason = null
    }
  }

  const { data, error } = await supabase
    .from('testimonies')
    .update(payload)
    .eq('id', id)
    .select(FIELDS)
    .single()

  if (error) throw error

  if (status === TESTIMONY_STATUS.APPROVED) {
    logAdminAction('testimony_approved', 'testimonies', id, label ?? data.display_name)
  } else if (status === TESTIMONY_STATUS.REJECTED) {
    logAdminAction('testimony_declined', 'testimonies', id, label ?? data.display_name)
  }

  return data
}

export async function setTestimonyFeatured(id, featured, { label = null } = {}) {
  const { data, error } = await supabase
    .from('testimonies')
    .update({ is_featured: featured === true })
    .eq('id', id)
    .select(FIELDS)
    .single()

  if (error) throw error
  if (featured === true) {
    logAdminAction('testimony_featured', 'testimonies', id, label ?? data.display_name)
  }
  return data
}

// Correcting a transcription, not rewriting somebody's words. The trigger in
// 0052 refuses body and display_name on a member row whoever the caller is,
// and pins source and author_id on every row, so this cannot be turned into a
// way to edit what a member wrote.
export async function editTestimony(id, { body, displayName, label = null } = {}) {
  const payload = {}
  if (typeof body === 'string')        payload.body = body.trim()
  if (typeof displayName === 'string') payload.display_name = displayName.trim()
  if (Object.keys(payload).length === 0) return null

  const { data, error } = await supabase
    .from('testimonies')
    .update(payload)
    .eq('id', id)
    .select(FIELDS)
    .single()

  if (error) throw error
  logAdminAction('testimony_edited', 'testimonies', id, label ?? data.display_name)
  return data
}

// Typos and test data, which is the carve-out principle 06 allows and nothing
// wider. The policy in 0052 permits it only where the row was declined and
// nobody owns it, so anything that reached the wall stays on the record
// whether or not it is still visible.
export async function deleteTestimony(id, { label = null } = {}) {
  const { error, count } = await supabase
    .from('testimonies')
    .delete({ count: 'exact' })
    .eq('id', id)

  if (error) throw error

  // RLS filters a refused delete to zero rows rather than raising, so the
  // count is the only signal that it did not happen.
  if (count === 0) {
    throw new Error('That testimony cannot be deleted. Decline it first, and only ones nobody wrote can be removed.')
  }

  logAdminAction('testimony_deleted', 'testimonies', id, label)
  return true
}

// Q42. The RPC checks the caller is the author or an admin, which a policy
// could not: an UPDATE policy loose enough to admit a withdrawal is loose
// enough to admit an author flipping their own row to approved. D107.
export async function withdrawTestimony(id) {
  const { data, error } = await supabase.rpc('withdraw_testimony', { p_id: id })
  if (error) throw error
  return data ?? null
}

// Q39. The request sits on the person, not on a testimony, because at this
// point there is no testimony to sit on. Cleared automatically when one
// arrives, by the testimonies_clear_request trigger.
export async function requestTestimony(profileId, adminId, { label = null } = {}) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      testimony_requested_at: new Date().toISOString(),
      testimony_requested_by: adminId
    })
    .eq('id', profileId)
    .select('id, full_name, testimony_requested_at')
    .single()

  if (error) throw error
  logAdminAction('testimony_requested', 'profiles', profileId, label ?? data.full_name)
  return data
}

/* ============ Helpers ============ */

// Q43. First name generally, so this is a prefill rather than a rule. The
// stored value is whatever the person leaves in the field.
export function firstNameOf(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean)
  return parts[0] ?? ''
}

export function canWithdraw(testimony, viewerId, { isAdmin = false } = {}) {
  if (!testimony) return false
  if (!['pending', 'approved'].includes(testimony.status)) return false
  return isAdmin || (Boolean(testimony.author_id) && testimony.author_id === viewerId)
}

// A relayed or Vinethoughts row is a transcription and can be corrected. A
// member wrote their own, so it cannot. Mirrors guard_testimony_edit.
export function canEdit(testimony) {
  return Boolean(testimony) && testimony.source !== TESTIMONY_SOURCE.MEMBER
}

// Declined, and nobody's own words. Mirrors testimonies_admin_delete.
export function canDelete(testimony) {
  if (!testimony) return false
  return testimony.status === TESTIMONY_STATUS.REJECTED && !testimony.author_id
}

export function bodyProblem(body) {
  const text = String(body || '').trim()
  if (text.length === 0) return 'Write a few lines about what happened.'
  if (text.length < BODY_MIN) return 'A little more. A sentence or two is enough.'
  if (text.length > BODY_MAX) return `That is longer than we can publish. Keep it under ${BODY_MAX} characters.`
  return null
}

/* ============ Errors ============ */

export function friendlyTestimonyError(err) {
  if (!err) return 'Something went wrong.'

  const raw  = (err.message || '').trim()
  const code = err.code || ''

  if (code === 'P0001') {
    return raw
  }
  if (code === '23505') {
    return 'You already have a testimony with us. Withdraw it first if you would like to write another.'
  }
  if (code === '23514' && /body_check/i.test(raw)) {
    return 'Write a few lines about what happened.'
  }
  if (code === '23514' && /display_name_check/i.test(raw)) {
    return 'Add the name you would like shown.'
  }
  if (code === '23514' && /rejection_check/i.test(raw)) {
    return 'A decline needs a reason. The person reads it.'
  }
  if (code === '23514' && /featured_check/i.test(raw)) {
    return 'Only a published testimony can be featured.'
  }
  if (code === '23514' && /role_check/i.test(raw)) {
    return 'A testimony is from a mentor or a mentee.'
  }
  // 0052's guard raises P0001-adjacent 42501 with copy already written for
  // the person reading it.
  if (code === '42501' && /cannot be edited|cannot be renamed|cannot change/i.test(raw)) {
    return raw
  }
  if (code === '42501' || /row-level security|permission denied/i.test(raw)) {
    return 'You do not have permission to change this testimony.'
  }
  if (/JWT|session/i.test(raw)) {
    return 'Your session expired. Sign in again. Copy your text first so you do not lose it.'
  }
  if (/fetch|network|Failed to fetch/i.test(raw)) {
    return 'We could not save that. Your connection may have dropped. Copy your text, then try again.'
  }

  return raw || 'Something went wrong.'
}
