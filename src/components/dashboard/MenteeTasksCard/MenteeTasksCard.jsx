import { useState } from 'react'
import { useMenteeTasks } from '@/hooks/useMenteeTasks'
import { Icon } from '@/components/shared/Icon/Icon'
import { setActionItemStatus, friendlyItemError, ITEM_STATUS } from '@/lib/meetingActionItems'
import './menteeTasksCard.css'

const DISPLAY_CAP = 6

// The mentee's view of what their mentor set them. Marking done goes through
// set_action_item_status, a narrow security-definer RPC, because a mentee has
// no UPDATE policy on the table: one that let them tick a box would also let
// them rewrite the text, reassign it, or move the due date.
//
// The bullet the card shipped with was a placeholder for exactly this control,
// so the rhythm does not change now that it is real.
export function MenteeTasksCard({ menteeId }) {
  const { items, loading, refresh } = useMenteeTasks(menteeId)

  const [busyId, setBusyId] = useState(null)
  const [error, setError]   = useState('')

  async function onDone(item) {
    setBusyId(item.id)
    setError('')
    try {
      await setActionItemStatus(item.id, ITEM_STATUS.DONE)
      await refresh()
    } catch (e) {
      setError(friendlyItemError(e))
    } finally {
      setBusyId(null)
    }
  }

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

      {error && <p className="tasks-card__error" role="alert">{error}</p>}

      <ul className="tasks-card__list">
        {shown.map((item) => (
          <li key={item.id} className="tasks-card__item">
            <TaskRow item={item} busy={busyId === item.id} onDone={() => onDone(item)} />
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

function TaskRow({ item, busy, onDone }) {
  const meetingAt = item.meeting?.scheduled_for ?? null
  const dueOn     = item.due_on ?? null
  const overdue   = isOverdue(dueOn)

  return (
    <div className="task-row">
      <button
        type="button"
        className="task-row__check"
        onClick={onDone}
        disabled={busy}
        aria-label={`Mark done: ${item.body}`}
      >
        {busy && <Icon name="check" size={12} strokeWidth={2.5} />}
      </button>

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
