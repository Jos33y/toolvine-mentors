import { timeOfDay } from '@/lib/format'
import { MEETING_STATUS } from '@/lib/meetingStatus'

// Lifted out of meetings.js unchanged. That file crossed 800 lines once
// attendees landed, and these have no dependency on Supabase or on any query.
// meetings.js re-exports every name here, so existing imports still resolve.

/* ============ Conversion ============ */

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

/* ============ Display ============ */

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

// The date block on a list row. Both the meeting row and the request row
// render it, and they now live in two files.
export function dayNumber(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric' })
}

export function monthShort(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()
}

/* ============ Predicates ============ */

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
