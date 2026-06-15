import { useMenteeTasks } from '@/hooks/useMenteeTasks'
import './menteeTasksCard.css'

const DISPLAY_CAP = 6

// The mentee's view of what their mentor set them. The card the platform
// existed to surface and the demo skipped. Read-only in Block C; a later
// block grants the assignee a narrow update policy to mark items done.
// The open-circle bullet sits where the future checkbox will land, so when
// mark-done ships the visual rhythm of the card does not change.
export function MenteeTasksCard({ menteeId }) {
  const { items, loading } = useMenteeTasks(menteeId)

  if (loading) {
    return (
      <article className="tasks-card tasks-card--loading">
        <Header />
        <div className="tasks-card__skeleton" aria-hidden="true" />
      </article>
    )
  }

  if (items.length === 0) {
    return (
      <article className="tasks-card tasks-card--empty">
        <Header />
        <p className="tasks-card__copy">
          No action items yet. After a session, anything your mentor sets for you will appear here.
        </p>
      </article>
    )
  }

  const shown    = items.slice(0, DISPLAY_CAP)
  const overflow = Math.max(0, items.length - DISPLAY_CAP)

  return (
    <article className="tasks-card">
      <Header count={items.length} />

      <ul className="tasks-card__list">
        {shown.map((item) => (
          <li key={item.id} className="tasks-card__item">
            <TaskRow item={item} />
          </li>
        ))}
      </ul>

      {overflow > 0 && (
        <p className="tasks-card__overflow">+ {overflow} more</p>
      )}
    </article>
  )
}

function Header({ count }) {
  return (
    <header className="tasks-card__head">
      <p className="tasks-card__eyebrow">Action items</p>
      <h2 className="tasks-card__title">
        From your mentor{count ? <span className="tasks-card__count"> · {count}</span> : null}
      </h2>
    </header>
  )
}

function TaskRow({ item }) {
  const meetingAt = item.meeting?.scheduled_for ?? null
  const dueOn     = item.due_on ?? null
  const overdue   = isOverdue(dueOn)

  return (
    <div className="task-row">
      <span className="task-row__bullet" aria-hidden="true" />

      <div className="task-row__body">
        <p className="task-row__text">{item.body}</p>
        <p className="task-row__meta">
          {meetingAt && <span>{`From ${shortDate(meetingAt)} session`}</span>}
          {meetingAt && dueOn && <Sep />}
          {dueOn && (
            <span className={overdue ? 'task-row__due task-row__due--over' : 'task-row__due'}>
              {overdue ? `Overdue · ${shortDate(dueOn)}` : `Due ${shortDate(dueOn)}`}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

function Sep() {
  return <span className="task-row__sep" aria-hidden="true">·</span>
}

function shortDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function isOverdue(dateStr) {
  if (!dateStr) return false
  const due = new Date(dateStr)
  const now = new Date()
  due.setHours(23, 59, 59, 999)
  return due.getTime() < now.getTime()
}
