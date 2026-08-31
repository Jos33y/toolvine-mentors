// Constants only, no imports. meetingTime.js needs MEETING_STATUS and
// meetings.js re-exports both modules, so holding these in meetings.js would
// have made the two files import each other.

/* ============ Status ============ */

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

/* ============ Kind ============ */

// A pairing meeting belongs to a mentor and a mentee. A convened meeting is
// called by an admin and its members are rows in meeting_attendees.
// meetings_kind_pairing_check makes the two mutually exclusive: a convened
// meeting never carries a pairing, so membership has one source per row.
export const MEETING_KIND = Object.freeze({
  PAIRING: 'pairing',
  ADMIN:   'admin'
})

export const KIND_LABELS = Object.freeze({
  pairing: 'Pairing',
  admin:   'Convened'
})

export function isConvened(meeting) {
  return meeting?.kind === MEETING_KIND.ADMIN
}

// meetings_kind_status_check keeps the request states off convened meetings,
// so a form that offers them would fail on submit.
export function statusesFor(kind) {
  if (kind === MEETING_KIND.ADMIN) {
    return [MEETING_STATUS.SCHEDULED, MEETING_STATUS.COMPLETED, MEETING_STATUS.CANCELLED]
  }
  return Object.values(MEETING_STATUS)
}
