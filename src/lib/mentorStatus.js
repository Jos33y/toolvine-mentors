// Pure function. Takes pairing data plus thresholds, returns a status bucket.
// No I/O. Reused by MenteesListCard now and any future admin filter view.
//
// Status answers "who needs my attention?" not "is this mentee good or bad."
// Language is mentor-facing: the action is on the mentor.

export const STATUS = {
  NEW:       'new',
  ON_TRACK:  'on_track',
  FOLLOW_UP: 'follow_up',
  STALLED:   'stalled'
}

const DEFAULT_THRESHOLDS = {
  new_max_days:         14,
  on_track_max_days:    21,
  follow_up_max_days:   42,
  never_met_grace_days: 30
}

// Inputs:
//   pairingStartedAt: ISO string
//   lastMetAt:        ISO string | null  (last completed meeting scheduled_for)
//   openItemsCount:   number             (open tasks across the pairing)
//   thresholds:       object             (from app_settings.status_thresholds)
//   now:              Date               (optional, for tests)
export function deriveStatus({
  pairingStartedAt,
  lastMetAt,
  openItemsCount = 0,
  thresholds = DEFAULT_THRESHOLDS,
  now = new Date()
} = {}) {
  const t = { ...DEFAULT_THRESHOLDS, ...(thresholds || {}) }

  const startedAt        = pairingStartedAt ? new Date(pairingStartedAt) : null
  const daysSincePaired  = startedAt ? daysBetween(startedAt, now) : null

  // Never met yet.
  if (!lastMetAt) {
    if (daysSincePaired !== null && daysSincePaired <= t.new_max_days) {
      return STATUS.NEW
    }
    if (daysSincePaired !== null && daysSincePaired > t.never_met_grace_days) {
      return STATUS.STALLED
    }
    return STATUS.FOLLOW_UP
  }

  // Met at least once.
  const daysSince = daysBetween(new Date(lastMetAt), now)

  if (daysSince <= t.on_track_max_days && openItemsCount === 0) return STATUS.ON_TRACK
  if (daysSince <= t.follow_up_max_days || openItemsCount > 0)   return STATUS.FOLLOW_UP
  return STATUS.STALLED
}

// Human-readable label keyed by status code. Used by pills and any future
// admin filter UI. Kept here so the labels live next to the rule.
export function labelFor(status) {
  switch (status) {
    case STATUS.NEW:       return 'New'
    case STATUS.ON_TRACK:  return 'On track'
    case STATUS.FOLLOW_UP: return 'Follow up'
    case STATUS.STALLED:   return 'Stalled'
    default:               return ''
  }
}

// Relative time helper used by MenteesListCard's "Last met" line and by
// NextSessionsCard's date stub. Returns short, mentor-readable phrasing
// without weekdays or seconds. Always positive (use "ago" or "in" prefix
// outside this helper).
export function daysAgoLabel(iso, now = new Date()) {
  if (!iso) return null
  const days = daysBetween(new Date(iso), now)
  if (days <= 0)   return 'today'
  if (days === 1)  return 'yesterday'
  if (days < 7)    return `${days} days ago`
  if (days < 14)   return 'last week'
  if (days < 30)   return `${Math.round(days / 7)} weeks ago`
  if (days < 60)   return 'last month'
  return `${Math.round(days / 30)} months ago`
}

function daysBetween(earlier, later) {
  const ms = later.getTime() - earlier.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}
