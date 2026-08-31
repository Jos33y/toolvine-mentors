import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/adminLog'

// Attendees only ever exist on convened meetings. Identities come back through
// profiles_visible, which returns a name, a photo, a title and a role label and
// nothing else. profiles_select_self_admin_or_paired grants the whole row, and
// putting a group of attendees behind that policy would have handed everybody
// in a room each other's email, both phone numbers and their reminder counters.
//
// The join is done here rather than by PostgREST. meeting_attendees.profile_id
// references profiles, not the view, so an embed would depend on PostgREST
// inferring a relationship it has no foreign key for.

/* ============ Reads ============ */

const ATTENDEE_FIELDS = 'meeting_id, profile_id, can_write_notes, added_by, created_at'

export async function fetchAttendees(meetingId) {
  if (!meetingId) return []

  const { data: rows, error } = await supabase
    .from('meeting_attendees')
    .select(ATTENDEE_FIELDS)
    .eq('meeting_id', meetingId)

  if (error) throw error
  if (!rows || rows.length === 0) return []

  return withProfiles(rows)
}

// One round trip for a whole list page rather than one per meeting.
// Returns a Map keyed by meeting_id.
export async function fetchAttendeesForMeetings(meetingIds) {
  const ids = (meetingIds ?? []).filter(Boolean)
  if (ids.length === 0) return new Map()

  const { data: rows, error } = await supabase
    .from('meeting_attendees')
    .select(ATTENDEE_FIELDS)
    .in('meeting_id', ids)

  if (error) throw error

  const shaped = await withProfiles(rows ?? [])
  const byMeeting = new Map()
  for (const row of shaped) {
    const list = byMeeting.get(row.meetingId) ?? []
    list.push(row)
    byMeeting.set(row.meetingId, list)
  }
  return byMeeting
}

// Meeting ids the caller attends. Used by the dashboard reads, which resolve
// their meetings through pairings and would otherwise never show a member the
// meeting an admin called them into.
export async function fetchMyAttendedMeetingIds(profileId) {
  if (!profileId) return []

  const { data, error } = await supabase
    .from('meeting_attendees')
    .select('meeting_id')
    .eq('profile_id', profileId)

  if (error) throw error
  return (data ?? []).map((r) => r.meeting_id)
}

// Who an admin can put in a room. Reads profiles directly because only an
// admin reaches this surface and RLS returns them every row. Deactivated
// accounts are excluded: they cannot sign in, so they cannot attend.
export async function fetchAttendeeCandidates() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, photo_url, display_title, is_active')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (error) throw error
  return data ?? []
}

/* ============ Writes ============ */

// Each row raises its own notification through meeting_attendees_notify, so
// adding three people sends three notices and adding a fourth later sends one.
export async function addAttendees(meetingId, entries, { label = null } = {}) {
  const rows = normalise(meetingId, entries)
  if (rows.length === 0) return []

  const { data, error } = await supabase
    .from('meeting_attendees')
    .insert(rows)
    .select(ATTENDEE_FIELDS)

  if (error) throw error
  logAdminAction('add_meeting_attendees', 'meetings', meetingId, label, {
    count: rows.length
  })
  return withProfiles(data ?? [])
}

export async function removeAttendee(meetingId, profileId, { label = null } = {}) {
  const { error } = await supabase
    .from('meeting_attendees')
    .delete()
    .eq('meeting_id', meetingId)
    .eq('profile_id', profileId)

  if (error) throw error
  logAdminAction('remove_meeting_attendee', 'meetings', meetingId, label, {
    profile_id: profileId
  })
}

// Who keeps the record. Set by the admin, never inferred from a role: a user
// can hold mentor and mentee at once, so inferring it would let the person
// being discussed read what was written about them.
export async function setCanWriteNotes(meetingId, profileId, canWrite) {
  const { data, error } = await supabase
    .from('meeting_attendees')
    .update({ can_write_notes: canWrite === true })
    .eq('meeting_id', meetingId)
    .eq('profile_id', profileId)
    .select(ATTENDEE_FIELDS)
    .single()

  if (error) throw error
  const [shaped] = await withProfiles([data])
  return shaped ?? null
}

/* ============ Contacts ============ */

// meeting_contacts returns rows only when the meeting mode is phone and the
// caller is in the meeting. A link meeting returns nothing, because the link
// is the contact.
export async function fetchMeetingContacts(meetingId) {
  if (!meetingId) return []

  const { data, error } = await supabase
    .from('meeting_contacts')
    .select('meeting_id, profile_id, full_name, whatsapp_phone, other_phone')
    .eq('meeting_id', meetingId)

  if (error) throw error
  return data ?? []
}

// Same precedence as mentorPhone in meetings.js, so a number reads the same
// whichever surface asked for it.
export function contactNumber(contacts, profileId) {
  const row = (contacts ?? []).find((c) => c.profile_id === profileId)
  if (!row) return null
  const raw = row.whatsapp_phone || row.other_phone || null
  return raw ? String(raw).trim() || null : null
}

/* ============ Errors ============ */

export function friendlyAttendeeError(err) {
  if (!err) return 'Something went wrong.'

  const raw  = (err.message || '').trim()
  const code = err.code || ''

  if (code === '23505') {
    return 'That person is already on this meeting.'
  }
  if (code === '23503') {
    return 'That meeting or account no longer exists. Reload the page.'
  }
  if (code === '42501' || /permission denied|row-level security/i.test(raw)) {
    return 'Only an admin can change who is on this meeting.'
  }
  if (/JWT|session/i.test(raw)) {
    return 'Your session expired. Sign in again.'
  }

  return raw || 'Something went wrong.'
}

/* ============ Internals ============ */

function normalise(meetingId, entries) {
  const seen = new Set()
  const rows = []

  for (const entry of entries ?? []) {
    const profileId = typeof entry === 'string' ? entry : entry?.profileId
    if (!profileId || seen.has(profileId)) continue
    seen.add(profileId)
    rows.push({
      meeting_id:      meetingId,
      profile_id:      profileId,
      can_write_notes: typeof entry === 'string' ? false : entry?.canWriteNotes === true
    })
  }

  return rows
}

async function withProfiles(rows) {
  const ids = [...new Set(rows.map((r) => r.profile_id).filter(Boolean))]
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('profiles_visible')
    .select('id, full_name, photo_url, display_title, role_label')
    .in('id', ids)

  if (error) throw error

  const byId = new Map((data ?? []).map((p) => [p.id, p]))

  return rows.map((row) => {
    const profile = byId.get(row.profile_id) ?? null
    return {
      meetingId:     row.meeting_id,
      profileId:     row.profile_id,
      canWriteNotes: row.can_write_notes === true,
      addedBy:       row.added_by ?? null,
      createdAt:     row.created_at ?? null,
      // Null when the view withholds the row rather than when the account is
      // missing. The caller renders the gap instead of inventing a name.
      fullName:      profile?.full_name ?? null,
      photoUrl:      profile?.photo_url ?? null,
      displayTitle:  profile?.display_title ?? null,
      roleLabel:     profile?.role_label ?? null
    }
  })
}
