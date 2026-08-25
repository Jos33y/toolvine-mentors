import { supabase } from '@/lib/supabase'
import { logAdminAction } from '@/lib/adminLog'
import { timeOfDay } from '@/lib/format'

// RLS on meetings already scopes every read: an admin sees all rows, a mentor
// or mentee sees only meetings under a pairing they belong to. So the reads
// below do not filter by role. Adding a client-side pairing filter would
// duplicate the policy and drift from it.

/* ============ Constants ============ */

export const MEETING_STATUS = Object.freeze({
  PENDING:   'pending',
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REJECTED:  'rejected',
  WITHDRAWN: 'withdrawn'
})

export const STATUS_LABELS = Object.freeze({
  pending:   'Pending',
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected:  'Declined',
  withdrawn: 'Withdrawn'
})

// The three states a request can be in. None of them is a meeting, which is
// why withdrawn exists instead of reusing cancelled: a request that was never
// a meeting must not count against the cancelled record.
export const REQUEST_STATUSES = Object.freeze(['pending', 'rejected', 'withdrawn'])

export function isRequestStatus(status) {
  return REQUEST_STATUSES.includes(status)
}

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
// copied onto every meeting row where it would drift.
export function modeUsesMentorPhone(mode) {
  return mode === 'phone'
}

export function mentorPhone(mentor) {
  if (!mentor) return null
  const raw = mentor.whatsapp_phone || mentor.other_phone || null
  return raw ? String(raw).trim() || null : null
}

/* ============ Column lists ============ */

// Named explicitly and never spread back into a write.
// meetings.actual_duration_minutes is a stored generated column, so any
// payload that names it fails. Reads may select it; writes may not.
const MEETING_FIELDS = `
  id, pairing_id, scheduled_for, duration_minutes, mode, external_link, location,
  status, completed_at, request_note, rejection_reason, created_by, created_at,
  actual_duration_minutes
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
export async function fetchMeetings({ scope = DEFAULT_MEETING_FILTER, limit = 100 } = {}) {
  const nowIso = new Date().toISOString()

  let query = supabase
    .from('meetings')
    .select(`${MEETING_FIELDS}, ${PAIRING_JOIN}`)

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
  return (data ?? []).map(shape)
}

// Requests still waiting on an answer. Feeds the count on the Requests tab so
// a mentor can see there is something to do without opening it.
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
  return data ? shape(data) : null
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
  return row ? shape(row) : null
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
// one_active_pairing_per_mentee makes maybeSingle safe.
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
  return shape(data)
}

// Explicit allowlist. Never spread a fetched row into this: it carries
// actual_duration_minutes, and naming a generated column in an update fails.
const UPDATABLE = ['scheduled_for', 'duration_minutes', 'mode', 'external_link', 'location']

export async function updateMeeting(id, patch = {}) {
  const payload = {}
  for (const key of UPDATABLE) {
    if (key in patch) payload[key] = patch[key]
  }
  if ('mode' in payload) {
    if (!modeNeedsLink(payload.mode))     payload.external_link = null
    if (!modeNeedsLocation(payload.mode)) payload.location = null
  }
  if (Object.keys(payload).length === 0) return null

  const { data, error } = await supabase
    .from('meetings')
    .update(payload)
    .eq('id', id)
    .select(`${MEETING_FIELDS}, ${PAIRING_JOIN}`)
    .single()

  if (error) throw error
  return shape(data)
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
  return shape(data)
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
  return shape(data)
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
  return shape(data)
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

/* ============ Time helpers ============ */

// datetime-local gives and takes a wall-clock string with no zone, so both
// directions go through the browser's own offset rather than through toISOString.
export function toLocalInputValue(iso) {
  if (!iso) return ''
  const d      = new Date(iso)
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 16)
}

export function fromLocalInputValue(value) {
  if (!value) return null
  return new Date(value).toISOString()
}

// D19. Only rendered when the counterpart actually has a timezone set. Seven
// of twelve profiles do, and telling a mentee their UK mentor is in Lagos is
// worse than telling them nothing.
export function counterpartTime(iso, timezone) {
  if (!iso || !timezone) return null
  try {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: 'numeric', minute: '2-digit', hour12: true,
      timeZone: timezone
    })
      .format(new Date(iso))
      .replace(/\s*(am|pm)$/i, (_, m) => ` ${m.toUpperCase()}`)
  } catch {
    return null
  }
}

// Same clock, viewer's own zone. Kept here so the detail view reads both
// sides from one module.
export function viewerTime(iso) {
  return iso ? timeOfDay(iso) : null
}

export function isPast(iso) {
  return Boolean(iso) && new Date(iso).getTime() < Date.now()
}

// When completion unlocks, said as time rather than narrated as a rule.
// Returns null once the moment has passed, so the caller renders the control
// instead. Beyond a fortnight it returns null too and the caller shows the
// date, because "in 63 days" is noise.
export function opensForCompletionIn(iso, now = new Date()) {
  if (!iso) return null
  const ms = new Date(iso).getTime() - now.getTime()
  if (ms <= 0) return null

  const mins = Math.round(ms / 60000)
  if (mins < 60) return `in ${mins} min`

  const hours = Math.round(mins / 60)
  if (hours < 24) return `in ${hours} ${hours === 1 ? 'hour' : 'hours'}`

  const days = Math.round(hours / 24)
  if (days <= 14) return `in ${days} ${days === 1 ? 'day' : 'days'}`

  return null
}

// The date block on a list row. Both the meeting row and the request row
// render it, and they now live in two files.
export function dayNumber(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric' })
}

export function monthShort(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()
}

// Next sensible slot: tomorrow at 5pm, which is when this community meets.
export function defaultMeetingSlot() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(17, 0, 0, 0)
  return toLocalInputValue(d.toISOString())
}

// A request whose time has passed with nobody answering. Nothing prunes it,
// because nothing in this platform prunes anything, so the surface says so
// instead and offers the withdrawal.
export function isStaleRequest(meeting) {
  return Boolean(meeting)
    && meeting.status === MEETING_STATUS.PENDING
    && isPast(meeting.scheduledFor)
}

/* ============ Internals ============ */

// Flattens the pairing join so callers read meeting.mentor rather than
// meeting.pairing.mentor, and keeps the raw pairing for the detail view.
// The request RPCs return a row with no join at all, so mentor and mentee come
// back null there by design.
function shape(row) {
  const pairing = row.pairing ?? null
  return {
    id:              row.id,
    pairingId:       row.pairing_id,
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
    mentee:          pairing?.mentee ?? null
  }
}

/* ============ Carried from Block C ============ */

// Upcoming scheduled meetings across all this mentor's active pairings.
// Soonest first. Used by NextSessionsCard. Each meeting joined with the
// mentee profile so the card can render "Session with Sarah" without a
// second fetch. Pending is excluded by the status filter, so a request never
// appears as a session the mentor has agreed to.
export async function fetchUpcomingMeetingsForMentor(mentorId, { limit = 5 } = {}) {
  const { data: pairings, error: pErr } = await supabase
    .from('pairings')
    .select('id, mentee_id, mentee:profiles!pairings_mentee_id_fkey ( id, full_name, photo_url )')
    .eq('mentor_id', mentorId)
    .eq('is_active', true)

  if (pErr) throw pErr
  if (!pairings || pairings.length === 0) return []

  const pairingIds      = pairings.map((p) => p.id)
  const menteeByPairing = new Map(pairings.map((p) => [p.id, p.mentee]))

  const nowIso = new Date().toISOString()

  const { data: meetings, error: mErr } = await supabase
    .from('meetings')
    .select('id, pairing_id, scheduled_for, duration_minutes, mode, external_link, status')
    .in('pairing_id', pairingIds)
    .eq('status', 'scheduled')
    .gte('scheduled_for', nowIso)
    .order('scheduled_for', { ascending: true })
    .limit(limit)

  if (mErr) throw mErr

  return (meetings ?? []).map((m) => ({
    ...m,
    mentee: menteeByPairing.get(m.pairing_id) ?? null
  }))
}

// Four headline numbers for the mentor dashboard StatsRow. Lifetime activity,
// not just active pairings: a mentor whose pairing ended still has completed
// meetings and hours. Hours use actual_duration_minutes when present (native
// calls), falling back to the scheduled duration_minutes.
export async function fetchMentorStats(mentorId) {
  const { data: pairings, error: pErr } = await supabase
    .from('pairings')
    .select('id, is_active')
    .eq('mentor_id', mentorId)

  if (pErr) throw pErr

  const allPairingIds  = (pairings ?? []).map((p) => p.id)
  const activePairings = (pairings ?? []).filter((p) => p.is_active).length

  if (allPairingIds.length === 0) {
    return { assignedMentees: 0, upcomingMeetings: 0, completedMeetings: 0, hoursMentored: 0 }
  }

  const nowIso = new Date().toISOString()

  const [upcomingRes, completedRes] = await Promise.all([
    supabase
      .from('meetings')
      .select('id', { count: 'exact', head: true })
      .in('pairing_id', allPairingIds)
      .eq('status', 'scheduled')
      .gte('scheduled_for', nowIso),
    supabase
      .from('meetings')
      .select('actual_duration_minutes, duration_minutes')
      .in('pairing_id', allPairingIds)
      .eq('status', 'completed')
  ])

  if (upcomingRes.error)  throw upcomingRes.error
  if (completedRes.error) throw completedRes.error

  const completedRows = completedRes.data ?? []
  const totalMinutes  = completedRows.reduce((acc, m) => {
    const mins = m.actual_duration_minutes ?? m.duration_minutes ?? 0
    return acc + (mins || 0)
  }, 0)

  return {
    assignedMentees:   activePairings,
    upcomingMeetings:  upcomingRes.count ?? 0,
    completedMeetings: completedRows.length,
    hoursMentored:     Math.round(totalMinutes / 60)
  }
}
