import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import { EmptyState } from '@/components/shared/EmptyState/EmptyState'
import { notificationIcon, notificationWhen } from '@/lib/notifications'
import './notifications.css'

const FILTERS = [
  { key: 'all',    label: 'Everything' },
  { key: 'unread', label: 'Unread' }
]

export function Notifications({ items, unread, loading, onReadOne, onReadAll }) {
  const [filter, setFilter] = useState('all')

  const visible = useMemo(
    () => (filter === 'unread' ? items.filter((n) => !n.read_at) : items),
    [items, filter]
  )

  // Grouped by day, because a flat list of forty rows with a relative time on
  // each says less about when things happened than three headings do.
  const groups = useMemo(() => {
    const out = []
    for (const item of visible) {
      const label = dayLabel(item.created_at)
      const last = out[out.length - 1]
      if (last && last.label === label) last.items.push(item)
      else out.push({ label, items: [item] })
    }
    return out
  }, [visible])

  return (
    <section className="notifs">
      <header className="page-head">
        <h1 className="page-title">Notifications</h1>
        <p className="page-sub">
          Meetings, action items, pairings, and anything new in the library.
        </p>
      </header>

      <div className="notifs__controls">
        <div className="notifs__filters" role="group" aria-label="Filter notifications">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={'notifs__filter' + (filter === f.key ? ' notifs__filter--active' : '')}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
            >
              {f.label}
              {f.key === 'unread' && unread > 0 && (
                <span className="notifs__filter-count">{unread}</span>
              )}
            </button>
          ))}
        </div>

        {unread > 0 && (
          <button type="button" className="notifs__mark" onClick={onReadAll}>
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <ul className="notifs__list" aria-busy="true">
          {[0, 1, 2, 3].map((i) => <li key={i} className="notifs__row notifs__row--skel" />)}
        </ul>
      ) : visible.length === 0 ? (
        filter === 'unread' ? (
          <EmptyState icon="checkCircle" title="Nothing unread.">
            You are up to date. Switch to Everything to see what came before.
          </EmptyState>
        ) : (
          <EmptyState icon="bell" title="Nothing yet.">
            When a meeting is scheduled, an action item comes your way, or something
            new lands in the library, it appears here.
          </EmptyState>
        )
      ) : (
        groups.map((group) => (
          <div key={group.label} className="notifs__group">
            <h2 className="notifs__day">{group.label}</h2>
            <ul className="notifs__list">
              {group.items.map((item) => (
                <li key={item.id}>
                  <Row item={item} onRead={onReadOne} />
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  )
}

/* ============ Row ============ */

function Row({ item, onRead }) {
  const body = (
    <>
      <span className="notifs__icon">
        <Icon name={notificationIcon(item.kind)} size={16} />
      </span>
      <span className="notifs__text">
        <span className="notifs__title">{item.title}</span>
        {item.body && <span className="notifs__body">{item.body}</span>}
      </span>
      <span className="notifs__when">{notificationWhen(item.created_at)}</span>
    </>
  )

  const className = 'notifs__row' + (item.read_at ? '' : ' notifs__row--unread')

  // A notification whose target was archived still has a record here, but
  // nowhere to send anyone, so it renders without a link rather than
  // navigating to a page that will not resolve.
  if (!item.url) {
    return (
      <div className={className}>
        {body}
        {!item.read_at && (
          <button type="button" className="notifs__read" onClick={() => onRead(item.id)}>
            Mark read
          </button>
        )}
      </div>
    )
  }

  return (
    <Link
      className={className}
      to={item.url}
      onClick={() => { if (!item.read_at) onRead(item.id) }}
    >
      {body}
    </Link>
  )
}

/* ============ Day headings ============ */

function dayLabel(iso) {
  const then = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const same = (a, b) => a.toDateString() === b.toDateString()

  if (same(then, today)) return 'Today'
  if (same(then, yesterday)) return 'Yesterday'

  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
