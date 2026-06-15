import './actionItemsCard.css'

const DISPLAY_CAP = 5

// The mentor's open commitments across all active pairings. The card the
// demo skipped. Surfaces what the mentor said they would do, not what they
// asked the mentee to do.
//
// Mentor cannot mark items done in Block C; Block D adds the notes + task
// creation UI. A future block grants the assigned mentee a narrow update
// policy to mark items done.
export function ActionItemsCard({ items = [], loading }) {
  if (loading) {
    return (
      <article className="actions-card actions-card--loading">
        <Header />
        <div className="actions-card__skeleton" aria-hidden="true" />
      </article>
    )
  }

  if (items.length === 0) {
    return (
      <article className="actions-card actions-card--empty">
        <Header />
        <p className="actions-card__copy">
          No open commitments. Action items will appear here as you write them in your meeting notes.
        </p>
      </article>
    )
  }

  const shown    = items.slice(0, DISPLAY_CAP)
  const overflow = Math.max(0, items.length - DISPLAY_CAP)

  return (
    <article className="actions-card">
      <Header count={items.length} />

      <ul className="actions-card__list">
        {shown.map((item) => (
          <li key={item.id} className="actions-card__item">
            <ActionRow item={item} />
          </li>
        ))}
      </ul>

      {overflow > 0 && (
        <p className="actions-card__overflow">+ {overflow} more</p>
      )}
    </article>
  )
}

function Header({ count }) {
  return (
    <header className="actions-card__head">
      <p className="actions-card__eyebrow">Action items</p>
      <h2 className="actions-card__title">
        Open commitments{count ? <span className="actions-card__count"> · {count}</span> : null}
      </h2>
    </header>
  )
}

function ActionRow({ item }) {
  const assignee   = item.assignee?.full_name ?? null
  const meetingAt  = item.meeting?.scheduled_for ?? null
  const dueOn      = item.due_on ?? null
  const overdue    = isOverdue(dueOn)

  return (
    <div className="action-row">
      <span className="action-row__bullet" aria-hidden="true" />

      <div className="action-row__body">
        <p className="action-row__text">{item.body}</p>
        <p className="action-row__meta">
          {assignee && <span>{`Assigned to ${assignee}`}</span>}
          {assignee && meetingAt && <Sep />}
          {meetingAt && <span>{`From ${shortDate(meetingAt)} session`}</span>}
          {dueOn && (assignee || meetingAt) && <Sep />}
          {dueOn && (
            <span className={overdue ? 'action-row__due action-row__due--over' : 'action-row__due'}>
              {overdue ? `Overdue · ${shortDate(dueOn)}` : `Due ${shortDate(dueOn)}`}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

function Sep() {
  return <span className="action-row__sep" aria-hidden="true">·</span>
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
