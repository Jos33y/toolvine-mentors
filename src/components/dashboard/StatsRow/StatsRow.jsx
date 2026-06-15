import { Icon } from '@/components/shared/Icon/Icon'
import './statsRow.css'

// Four headline metrics. Honours the SOW promise of "assigned mentees,
// upcoming meetings, completed meetings, total hours" without inheriting
// the demo's pastel-icon system. Brand palette only: numbers in tv-text by
// default, amber on the actionable one (upcoming meetings). Icons are
// monoline next to labels in currentColor, so they inherit tv-text-muted
// from the label.
export function StatsRow({ stats, loading }) {
  const display = (n) => loading ? '–' : String(n)

  return (
    <ul className="stats-row" aria-label="Mentoring overview">
      <Stat icon="users"        label="Assigned mentees"   value={display(stats.assignedMentees)} />
      <Stat icon="calendar"     label="Upcoming meetings"  value={display(stats.upcomingMeetings)}  accent />
      <Stat icon="checkCircle"  label="Completed meetings" value={display(stats.completedMeetings)} />
      <Stat icon="clock"        label="Hours mentored"     value={display(stats.hoursMentored)} />
    </ul>
  )
}

function Stat({ icon, label, value, accent }) {
  return (
    <li className={`stats-row__stat ${accent ? 'stats-row__stat--accent' : ''}`}>
      <span className="stats-row__num">{value}</span>
      <span className="stats-row__label">
        <Icon name={icon} size={14} strokeWidth={1.5} className="stats-row__icon" />
        {label}
      </span>
    </li>
  )
}
