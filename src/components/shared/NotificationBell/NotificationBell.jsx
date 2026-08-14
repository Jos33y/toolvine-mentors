import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import { notificationIcon, notificationWhen } from '@/lib/notifications'
import './notificationBell.css'

// A peek, not a page. Opening the full list to see whether anything happened
// would take somebody off whatever they were doing, which is the opposite of
// what a bell is for.
const PEEK = 6

export function NotificationBell({ items, unread, onReadOne, onReadAll }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return

    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  function go(item) {
    setOpen(false)
    if (!item.read_at) onReadOne(item.id)
    if (item.url) navigate(item.url)
  }

  const peek = items.slice(0, PEEK)

  return (
    <div className="bell" ref={wrapRef}>
      <button
        type="button"
        className="bell__button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      >
        <Icon name="bell" size={20} />
        {unread > 0 && (
          <span className="bell__count" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="bell__panel" role="dialog" aria-label="Notifications">
          <div className="bell__panel-head">
            <span className="bell__panel-title">Notifications</span>
            {unread > 0 && (
              <button type="button" className="bell__mark" onClick={onReadAll}>
                Mark all read
              </button>
            )}
          </div>

          {peek.length === 0 ? (
            <p className="bell__empty">
              Nothing yet. Meetings, action items, and new resources appear here.
            </p>
          ) : (
            <ul className="bell__list">
              {peek.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={'bell__item' + (item.read_at ? '' : ' bell__item--unread')}
                    onClick={() => go(item)}
                  >
                    <span className="bell__item-icon">
                      <Icon name={notificationIcon(item.kind)} size={15} />
                    </span>
                    <span className="bell__item-text">
                      <span className="bell__item-title">{item.title}</span>
                      {item.body && <span className="bell__item-body">{item.body}</span>}
                      <span className="bell__item-when">{notificationWhen(item.created_at)}</span>
                    </span>
                    {!item.read_at && <span className="bell__item-dot" aria-hidden="true" />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="bell__all"
            onClick={() => { setOpen(false); navigate('/notifications') }}
          >
            See all
            <Icon name="chevronRight" size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
