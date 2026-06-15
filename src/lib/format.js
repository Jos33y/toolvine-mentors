// Display helpers for dates and times across the dashboard. Mentor-readable
// phrasing without weekdays-and-seconds clutter. Uses the browser timezone
// so a mentor in Lagos sees Lagos times without us pretending the platform
// is UTC-only.

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

  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

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
