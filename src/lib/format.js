// Display helpers for dates and times across the dashboard. Mentor-readable
// phrasing without weekdays-and-seconds clutter. Uses the browser timezone
// so a mentor in Lagos sees Lagos times without us pretending the platform
// is UTC-only.
//
// Times are 12-hour with uppercase AM and PM, per the brand guide. The
// browser locale decides that on its own otherwise, and en-GB returns
// lowercase, so every time in the product goes through timeOfDay().

// Future date, mentor-readable. Used by NextSessionsCard.
//   today        → "Today, 5:00 PM"
//   tomorrow     → "Tomorrow, 5:00 PM"
//   this week    → "Fri, 5:00 PM"
//   further out  → "Jun 22, 5:00 PM"
//   past         → "Jun 14, 5:00 PM"  (rare in upcoming lists)
export function formatSessionTime(iso, now = new Date()) {
  if (!iso) return null

  const d   = new Date(iso)
  const ms  = d.getTime() - now.getTime()
  const day = 24 * 60 * 60 * 1000

  const time = timeOfDay(d)

  if (ms < 0) {
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`
  }

  if (isSameDay(d, now))                 return `Today, ${time}`
  if (isSameDay(d, addDays(now, 1)))     return `Tomorrow, ${time}`
  if (ms < 7 * day) {
    return `${d.toLocaleDateString([], { weekday: 'short' })}, ${time}`
  }
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`
}

// 12-hour clock with uppercase meridiem. "5:00 PM", never "5:00 pm".
export function timeOfDay(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return d
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s*(am|pm)$/i, (_, m) => ` ${m.toUpperCase()}`)
}

// Full line for a meeting row or detail head.
// "Saturday 22 August at 9:05 AM"
export function meetingWhen(iso) {
  if (!iso) return null
  const d = new Date(iso)
  const date = d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })
  return `${date} at ${timeOfDay(d)}`
}

// Day + month for the date-stub block. Returns { day: '18', month: 'JUN' }.
export function dateStub(iso) {
  if (!iso) return { day: '--', month: '---' }
  const d = new Date(iso)
  return {
    day:   String(d.getDate()),
    month: d.toLocaleDateString([], { month: 'short' }).toUpperCase()
  }
}

// "Paired since Mar 2026" line on MenteesListCard.
export function pairedSinceLabel(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString([], { month: 'short', year: 'numeric' })
}

// Date range for an ended pairing. Month and year alone reads as
// "Aug 2026 to Aug 2026" when a pairing starts and ends in the same month,
// which says nothing, so that case falls back to days.
export function pairingRangeLabel(startIso, endIso) {
  if (!startIso) return null
  const start = new Date(startIso)
  if (!endIso) return pairedSinceLabel(startIso)

  const end = new Date(endIso)
  const sameMonth = start.getFullYear() === end.getFullYear()
                 && start.getMonth()    === end.getMonth()

  if (sameMonth) {
    const month = end.toLocaleDateString([], { month: 'short', year: 'numeric' })
    if (isSameDay(start, end)) return `${start.getDate()} ${month}`
    return `${start.getDate()} to ${end.getDate()} ${month}`
  }

  return `${pairedSinceLabel(startIso)} to ${pairedSinceLabel(endIso)}`
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate()
}

function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
