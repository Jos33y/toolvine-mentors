import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/adminLog'
import { MEETING_STATUS, MEETING_KIND, REQUEST_STATUSES } from '@/lib/meetingStatus'
import { addAttendees, fetchAttendeesForMeetings } from '@/lib/meetingAttendees'

// RLS on meetings already scopes every read: an admin sees all rows, a mentor
// or mentee sees only meetings under a pairing they belong to or a convened
// meeting they attend. So the reads below do not filter by role. Adding a
// client-side membership filter would duplicate the policy and drift from it.

export {
  MEETING_STATUS,
  STATUS_LABELS,
  REQUEST_STATUSES,
  isRequestStatus,
  MEETING_KIND,
  KIND_LABELS,
  isConvened,
  statusesFor
} from '@/lib/meetingStatus'

export {
  toLocalInputValue,
  fromLocalInputValue,
  counterpartTime,
  viewerTime,
  dayNumber,
  monthShort,
  isPast,
  opensForCompletionIn,
  defaultMeetingSlot,
  isStaleRequest
} from '@/lib/meetingTime'

/* ============ Constants ============ */

// Native modes are gated behind native_calls_enabled. D21: while the flag is
// off they are absent from the form, not disabled in it.
export const MEETING_MODES = Object.freeze([
  { value: 'external',     label: 'Online link',  hint: 'Zoom, Meet, or any other link', needs: 'link',     native: false },
  { value: 'phone',        label: 'Phone',        hint: 'A call, no link needed',        needs: null,       native: false },
  { value: 'in_person',    label: 'In person',    hint: 'Somewhere you both go',         needs: 'location', native: false },
  { value: 'native_video', label: 'Video',        hint: 'Video call on Toolvine',        needs: null,       native: true },
  { value: 'native_audio', label: 'Audio',        hint: 'Audio call on Toolvine',        needs: null,       native: true }
])

export const MODE_LABELS = Object.freeze(
  Object.fromEntries(MEETING_MODES.map((m) => [m.value, m.label]))
)

// Lives here rather than in each page. It was declared separately in
// Meetings.jsx and again in Meeting.jsx, so a sixth mode would have needed
// finding in two places and would have rendered nothing in whichever one got
// missed.
export const MODE_ICONS = Object.freeze({
  external:     'externalLink',
  phone:        'phone',
  in_person:    'mapPin',
  native_video: 'video',
  native_audio: 'mic'
})

export const DURATION_MIN = 5
export const DURATION_MAX = 480
export const DEFAULT_DURATION = 60

export const MEETING_FILTERS = [
  { key: 'upcoming',  label: 'Upcoming' },
  { key: 'requests',  label: 'Requests' },
  { key: 'past',      label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' }
]

export const DEFAULT_MEETING_FILTER = 'upcoming'

// Q21. One list, filtered by type, not a second surface. Kind is a second axis
// across the four scopes rather than a fifth scope, because a convened meeting
// is still upcoming or still past.
export const KIND_FILTERS = [
  { key: 'all',     label: 'All' },
  { key: 'pairing', label: 'Pairings' },
  { key: 'admin',   label: 'Convened' }
]

export const DEFAULT_KIND_FILTER = 'all'

export function availableModes(nativeCallsEnabled) {
  return MEETING_MODES.filter((m) => !m.native || nativeCallsEnabled === true)
}

// A request never offers a native mode, whatever the flag says. request_meeting
// refuses one at the database, so offering it would be a form that fails on
// submit.
export function requestableModes() {
  return MEETING_MODES.filter((m) => !m.native)
}

export function modeNeedsLink(mode) {
  return MEETING_MODES.find((m) => m.value === mode)?.needs === 'link'
}

export function modeNeedsLocation(mode) {
  return MEETING_MODES.find((m) => m.value === mode)?.needs === 'location'
}

// A phone meeting has no field of its own. The number comes off the mentor's
// profile, which the paired counterpart can already read, rather than being
// copied onto every meeting row where it would drift. On a convened meeting
// the numbers come from meeting_contacts instead, which is scoped to the
// meeting rather than to the person.
export function modeUsesMentorPhone(mode) {
  return mode === 'phone'
}

export function mentorPhone(mentor) {
  if (!mentor) return null
  const raw = mentor.whatsapp_phone || mentor.other_phone || null
  return raw ? String(raw).trim() || null : null
}

// What a list row is called. A pairing meeting is named by the person you are
// meeting; a convened meeting carries its own title, which is why
// meetings_kind_title_check makes it required.
export function meetingHeading(meeting, viewerId) {
  if (!meeting) return ''
  if (meeting.kind === MEETING_KIND.ADMIN) return meeting.title || 'Meeting'

  const counterpart = meeting.mentor?.id === viewerId ? meeting.mentee : meeting.mentor
  return counterpart?.full_name || 'Meeting'
}

/* ============ Column lists ============ */

// Named explicitly and never spread back into a write.
// meetings.actual_duration_minutes is a stored generated column, so any
// payload that names it fails. Reads may select it; writes may not.
const MEETING_FIELDS = `
  id, pairing_id, kind, title, scheduled_for, duration_minutes, mode,
  external_link, location, status, completed_at, request_note, rejection_reason,
  created_by, created_at, actual_duration_minutes
`

const PAIRING_JOIN = `
  pairing:pairings!meetings_pairing_id_fkey (
    id, is_active, started_at, ended_at,
    mentor:profiles!pairings_mentor_id_fkey ( id, full_name, email, photo_url, timezone, is_active, whatsapp_phone, other_phone ),
    mentee:profiles!pairings_mentee_id_fkey ( id, full_name, email, photo_url, timezone, is_active, whatsapp_phone, other_phone )
  )
`

/* ============ Reads ============ */

// One list for every role. scope is 'upcoming', 'requests', 'past', or
// 'cancelled'. Upcoming means scheduled and not yet started; past means
// completed, or scheduled and already behind us, because a meeting nobody
// marked complete is still in the past.
//
// Requests is its own scope rather than a slice of the others. A pending row
// is not upcoming, because nobody has agreed to it, and a declined one is not
// past, because it never happened.
export async function fetchMeetings({
  scope = DEFAULT_MEETING_FILTER,
  kind  = DEFAULT_KIND_FILTER,
  limit = 100
} = {}) {
  const nowIso = new Date().toISOString()

  let query = supabase
    .from('meetings')
    .select(`${MEETING_FIELDS}, ${PAIRING_JOIN}`)

  if (kind !== 'all') query = query.eq('kind', kind)

  if (scope === 'upcoming') {
    query = query
      .eq('status', MEETING_STATUS.SCHEDULED)
      .gte('scheduled_for', nowIso)
      .order('scheduled_for', { ascending: true })
  } else if (scope === 'requests') {
    // Newest first, not by meeting time. What matters on this tab is when
    // somebody asked, and the page splits pending from answered itself.
    query = query
      .in('status', REQUEST_STATUSES)
      .order('created_at', { ascending: false })
  } else if (scope === 'cancelled') {
    query = query
      .eq('status', MEETING_STATUS.CANCELLED)
      .order('scheduled_for', { ascending: false })
  } else {
    query = query
      .or(`status.eq.${MEETING_STATUS.COMPLETED},and(status.eq.${MEETING_STATUS.SCHEDULED},scheduled_for.lt.${nowIso})`)
      .order('scheduled_for', { ascending: false })
  }

  const { data, error } = await query.limit(limit)
  if (error) throw error

  return hydrate(data ?? [])
}

// Requests still waiting on an answer. Feeds the count on the Requests tab so
// a mentor can see there is something to do without opening it. Convened
// meetings cannot be pending, so no kind filter is needed here.
export async function countPendingRequests() {
  const { count, error } = await supabase
    .from('meetings')
    .select('id', { count: 'exact', head: true })
    .eq('status', MEETING_STATUS.PENDING)

  if (error) throw error
  return count ?? 0
}

export async function fetchMeeting(id) {
  const { data, error } = await supabase
    .from('meetings')
    .select(`${MEETING_FIELDS}, ${PAIRING_JOIN}`)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const [shaped] = await hydrate([data])
  return shaped ?? null
}

// The single soonest upcoming meeting the caller can see. Feeds
// NextMeetingCard on the mentee dashboard. Pending is excluded by the status
// filter: a request is not a next meeting until somebody accepts it.
export async function fetchNextMeeting() {
  const { data, error } = await supabase
    .from('meetings')
    .select(`${MEETING_FIELDS}, ${PAIRING_JOIN}`)
    .eq('status', MEETING_STATUS.SCHEDULED)
    .gte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(1)

  if (error) throw error
  const row = (data ?? [])[0]
  if (!row) return null

  const [shaped] = await hydrate([row])
  return shaped ?? null
}

// Pairings the caller may schedule against. RLS returns the admin every
// pairing and a mentor only their own. Ended pairings are excluded: a meeting
// under an ended pairing is a meeting that will not happen.
export async function fetchSchedulablePairings() {
  const { data, error } = await supabase
    .from('pairings')
    .select(`
      id, started_at,
      mentor:profiles!pairings_mentor_id_fkey ( id, full_name, timezone, whatsapp_phone, other_phone ),
      mentee:profiles!pairings_mentee_id_fkey ( id, full_name, timezone )
    `)
    .eq('is_active', true)
    .order('started_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

// The caller's own active pairing as the mentee, which is the only thing they
// can request against. Filtered on mentee_id rather than taking the first row
// RLS returns: somebody holding mentor and mentee at once sees both sides, and
// the newest of the two can easily be the one where they are the mentor.
// pairings_one_active_per_mentee makes maybeSingle safe.
export async function fetchRequestablePairing(menteeId) {
  if (!menteeId) return null

  const { data, error } = await supabase
    .from('pairings')
    .select(`
      id, started_at,
      mentor:profiles!pairings_mentor_id_fkey ( id, full_name, timezone, whatsapp_phone, other_phone ),
      mentee:profiles!pairings_mentee_id_fkey ( id, full_name, timezone )
    `)
    .eq('mentee_id', menteeId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  return data ?? null
}

/* ============ Writes ============ */

// A mentor scheduling their own session is not an admin action, and
// admin_actions exists to record admin writes. An admin scheduling into
// someone else's pairing is exactly what the log is for, so the caller passes
// its own role rather than this module guessing.
function logIfAdmin(isAdmin, action, id, label, meta) {
  if (isAdmin === true) logAdminAction(action, 'meetings', id, label, meta)
}

export async function createMeeting({
  pairingId,
  scheduledFor,
  durationMinutes = DEFAULT_DURATION,
  mode = 'external',
  externalLink = null,
  location = null,
  createdBy = null,
  asAdmin = false,
  label = null
}) {
  const payload = {
    pairing_id:       pairingId,
    kind:             MEETING_KIND.PAIRING,
    scheduled_for:    scheduledFor,
    duration_minutes: durationMinutes ?? null,
    mode,
    // D20, extended to location. A stale Zoom link must not survive a switch
    // to in-person, and a stale address must not survive a switch back.
    external_link:    modeNeedsLink(mode)     ? (externalLink || null) : null,
    location:         modeNeedsLocation(mode) ? (location || null)     : null,
    created_by:       createdBy
  }

  const { data, error } = await supabase
    .from('meetings')
    .insert(payload)
    .select(`${MEETING_FIELDS}, ${PAIRING_JOIN}`)
    .single()

  if (error) throw error
  logIfAdmin(asAdmin, 'schedule_meeting', data.id, label)
  const [shaped] = await hydrate([data])
  return shaped
}

// Two statements, not one. There is no RPC, so a convened meeting exists for
// a moment with nobody on it. That direction is the safe one: an attendeeless
// meeting is visible to admins only and can be filled in, whereas attaching
// people to a meeting that failed to insert cannot happen at all.
//
// meeting_attendees_notify raises the notice per row, which is why attendees
// are added after the meeting rather than alongside it.
export async function createConvenedMeeting({
  title,
  scheduledFor,
  durationMinutes = DEFAULT_DURATION,
  mode = 'external',
  externalLink = null,
  location = null,
  attendees = [],
  createdBy = null,
  label = null
}) {
  const payload = {
    pairing_id:       null,
    kind:             MEETING_KIND.ADMIN,
    title:            String(title || '').trim(),
    scheduled_for:    scheduledFor,
    duration_minutes: durationMinutes ?? null,
    mode,
    external_link:    modeNeedsLink(mode)     ? (externalLink || null) : null,
    location:         modeNeedsLocation(mode) ? (location || null)     : null,
    created_by:       createdBy
  }

  const { data, error } = await supabase
    .from('meetings')
    .insert(payload)
    .select(MEETING_FIELDS)
    .single()

  if (error) throw error
  logAdminAction('schedule_meeting', 'meetings', data.id, label, { kind: MEETING_KIND.ADMIN })

  if (attendees.length > 0) {
    await addAttendees(data.id, attendees, { label })
  }

  const [shaped] = await hydrate([data])
  return shaped
}

// Explicit allowlist. Never spread a fetched row into this: it carries
// actual_duration_minutes, and naming a generated column in an update fails.
// kind is absent on purpose. A meeting cannot change from a pairing meeting
// into a convened one, because its membership would change under the people
// already on it.
const UPDATABLE = ['scheduled_for', 'duration_minutes', 'mode', 'external_link', 'location', 'title']

export async function updateMeeting(id, patch = {}) {
  const payload = {}
  for (const key of UPDATABLE) {
    if (key in patch) payload[key] = patch[key]
  }
  if ('mode' in payload) {
    if (!modeNeedsLink(payload.mode))     payload.external_link = null
    if (!modeNeedsLocation(payload.mode)) payload.location = null
  }
  if ('title' in payload) payload.title = String(payload.title || '').trim() || null
  if (Object.keys(payload).length === 0) return null

  const { data, error } = await supabase
    .from('meetings')
    .update(payload)
    .eq('id', id)
    .select(`${MEETING_FIELDS}, ${PAIRING_JOIN}`)
    .single()

  if (error) throw error
  const [shaped] = await hydrate([data])
  return shaped
}

// Reschedule is an update plus a notice that names the old time, so it is its
// own entry point rather than a flag on updateMeeting. Returns both rows so
// the caller can pass the previous time to the notifier.
export async function rescheduleMeeting(id, patch = {}, { asAdmin = false, label = null } = {}) {
  const before = await fetchMeeting(id)
  if (!before) throw new Error('Meeting not found')

  const after = await updateMeeting(id, patch)
  logIfAdmin(asAdmin, 'reschedule_meeting', id, label, {
    from: before.scheduledFor,
    to:   after?.scheduledFor ?? null
  })

  return { before, after }
}

// meetings_check requires completed_at when status is completed, so the two
// move together in one statement or the write fails.
export async function completeMeeting(id, { at = null, asAdmin = false, label = null } = {}) {
  const { data, error } = await supabase
    .from('meetings')
    .update({
      status:       MEETING_STATUS.COMPLETED,
      completed_at: at ?? new Date().toISOString()
    })
    .eq('id', id)
    .select(`${MEETING_FIELDS}, ${PAIRING_JOIN}`)
    .single()

  if (error) throw error
  logIfAdmin(asAdmin, 'complete_meeting', id, label)
  const [shaped] = await hydrate([data])
  return shaped
}

// D16. The meetings_guard_completed trigger blocks this for anyone but an
// admin once a meeting is completed. The UI does not offer it either, but the
// database is what makes it true.
export async function cancelMeeting(id, { asAdmin = false, label = null } = {}) {
  const { data, error } = await supabase
    .from('meetings')
    .update({ status: MEETING_STATUS.CANCELLED })
    .eq('id', id)
    .select(`${MEETING_FIELDS}, ${PAIRING_JOIN}`)
    .single()

  if (error) throw error
  logIfAdmin(asAdmin, 'cancel_meeting', id, label)
  const [shaped] = await hydrate([data])
  return shaped
}

// D17. Reopening a completed meeting is an admin correction, not a status
// toggle anyone can reach. Clears completed_at in the same statement.
export async function reopenMeeting(id, label = null) {
  const { data, error } = await supabase
    .from('meetings')
    .update({ status: MEETING_STATUS.SCHEDULED, completed_at: null })
    .eq('id', id)
    .select(`${MEETING_FIELDS}, ${PAIRING_JOIN}`)
    .single()

  if (error) throw error
  logAdminAction('reopen_meeting', 'meetings', id, label)
  const [shaped] = await hydrate([data])
  return shaped
}

/* ============ Requests ============ */

// All four go through 0042's definer RPCs rather than a widened policy. RLS
// cannot restrict columns, so an INSERT policy loose enough to admit a request
// would also admit a mentee writing status directly, and an UPDATE policy
// loose enough to admit a withdrawal would admit editing a confirmed meeting.
//
// Each RPC returns the bare meetings row, without the pairing join, so the
// shape comes back with a null mentor and mentee. Callers reload the list
// afterwards rather than rendering from the return value.
//
// None of these writes to admin_actions. An admin answering a request is worth
// logging, and D90 is the reason it is not done here: adding an action name
// without its matching template in adminActivity.js is what left twenty of
// twenty-one rows rendering through the slug fallback. That pair ships
// together or not at all.

export async function requestMeeting({
  pairingId,
  scheduledFor,
  durationMinutes = DEFAULT_DURATION,
  mode = 'external',
  externalLink = null,
  location = null,
  note = null
}) {
  const { data, error } = await supabase.rpc('request_meeting', {
    p_pairing_id:       pairingId,
    p_scheduled_for:    scheduledFor,
    p_duration_minutes: durationMinutes ?? null,
    p_mode:             mode,
    p_external_link:    modeNeedsLink(mode)     ? (externalLink || null) : null,
    p_location:         modeNeedsLocation(mode) ? (location || null)     : null,
    p_note:             note ? String(note).trim() || null : null
  })

  if (error) throw error
  return data ? shape(data) : null
}

// Accepting confirms what was asked for. Moving it is a reschedule, which
// already exists and already tells both people what changed.
export async function acceptMeetingRequest(id) {
  const { data, error } = await supabase.rpc('accept_meeting_request', { p_meeting_id: id })
  if (error) throw error
  return data ? shape(data) : null
}

// The reason is not optional and the mentee reads it. The RPC refuses a blank
// one, so the form has to as well or the failure lands after the click.
export async function rejectMeetingRequest(id, reason) {
  const { data, error } = await supabase.rpc('reject_meeting_request', {
    p_meeting_id: id,
    p_reason:     String(reason || '').trim()
  })
  if (error) throw error
  return data ? shape(data) : null
}

export async function withdrawMeetingRequest(id) {
  const { data, error } = await supabase.rpc('withdraw_meeting_request', { p_meeting_id: id })
  if (error) throw error
  return data ? shape(data) : null
}

// One notifier per domain, kind as a parameter. Adding a fourth kind later is
// a copy block in the function, not a new deploy and a new invoke path here.
// Best effort: a failed send must never read as a failed write.
export async function sendMeetingEmail(meetingId, kind = 'scheduled', previousScheduledFor = null) {
  try {
    const { data, error } = await supabase.functions.invoke('meeting-notify', {
      body: {
        meeting_id:             meetingId,
        kind,
        previous_scheduled_for: previousScheduledFor
      }
    })
    if (error) {
      console.error('[meeting-notify] invoke error:', error)
      return { sent: false, reason: 'invoke-failed' }
    }
    return data || { sent: false, reason: 'no-response' }
  } catch (e) {
    console.error('[meeting-notify] threw:', e)
    return { sent: false, reason: 'threw' }
  }
}

/* ============ Errors ============ */

export function friendlyMeetingError(err) {
  if (!err) return 'Something went wrong.'

  const raw  = (err.message || '').trim()
  const code = err.code || ''

  if (/completed meeting cannot be reopened or cancelled/i.test(raw)) {
    return 'That meeting is already recorded as completed. Only an admin can change it.'
  }
  // 0042's request guards raise P0001 with copy already written for the person
  // reading it. Rewriting them here would only make them worse.
  if (code === 'P0001') {
    return raw
  }
  if (code === '23514' && /duration_minutes/i.test(raw)) {
    return `A meeting must run between ${DURATION_MIN} and ${DURATION_MAX} minutes.`
  }
  if (code === '23514' && /meetings_kind_title_check/i.test(raw)) {
    return 'A convened meeting needs a title. Give it one and try again.'
  }
  if (code === '23514' && /meetings_kind_status_check/i.test(raw)) {
    return 'A convened meeting cannot be a request. Reload the page.'
  }
  if (code === '23514' && /meetings_kind_pairing_check/i.test(raw)) {
    return 'A meeting belongs to a pairing or to a list of attendees, not both. Reload the page.'
  }
  if (code === '23514' && /meetings_rejection_check/i.test(raw)) {
    return 'A declined request needs a reason. Write a line and try again.'
  }
  if (code === '23514' && /meetings_check\b/i.test(raw)) {
    return 'A completed meeting needs a completion time. Reload and try again.'
  }
  if (code === '23514' && /status/i.test(raw)) {
    return 'That is not a state a meeting can be in. Reload the page.'
  }
  if (code === '23514' && /mode/i.test(raw)) {
    return 'That meeting type is not available.'
  }
  if (code === '23503') {
    return 'That pairing no longer exists. Reload the page.'
  }
  if (code === '42501' || /permission denied|row-level security/i.test(raw)) {
    return 'You do not have permission to change this meeting.'
  }
  if (/JWT|session/i.test(raw)) {
    return 'Your session expired. Sign in again.'
  }

  return raw || 'Something went wrong.'
}

/* ============ Internals ============ */

// Flattens the pairing join so callers read meeting.mentor rather than
// meeting.pairing.mentor, and keeps the raw pairing for the detail view.
// The request RPCs return a row with no join at all, so mentor and mentee come
// back null there by design. A convened meeting has no pairing to flatten, so
// its people arrive through attendees instead.
function shape(row, attendees = []) {
  const pairing = row.pairing ?? null
  return {
    id:              row.id,
    pairingId:       row.pairing_id,
    kind:            row.kind ?? MEETING_KIND.PAIRING,
    title:           row.title ?? null,
    scheduledFor:    row.scheduled_for,
    durationMinutes: row.duration_minutes,
    mode:            row.mode,
    externalLink:    row.external_link,
    location:        row.location,
    status:          row.status,
    completedAt:     row.completed_at,
    requestNote:     row.request_note ?? null,
    rejectionReason: row.rejection_reason ?? null,
    createdBy:       row.created_by,
    createdAt:       row.created_at,
    actualMinutes:   row.actual_duration_minutes ?? null,
    pairingActive:   pairing?.is_active ?? null,
    mentor:          pairing?.mentor ?? null,
    mentee:          pairing?.mentee ?? null,
    attendees
  }
}

// One attendee query for a whole page, and none at all when the page holds no
// convened meetings.
async function hydrate(rows) {
  const convenedIds = rows
    .filter((r) => r.kind === MEETING_KIND.ADMIN)
    .map((r) => r.id)

  if (convenedIds.length === 0) return rows.map((r) => shape(r))

  const byMeeting = await fetchAttendeesForMeetings(convenedIds)
  return rows.map((r) => shape(r, byMeeting.get(r.id) ?? []))
}

export {
  fetchUpcomingMeetingsForMentor,
  fetchMentorStats
} from '@/lib/mentorDashboard'
