import { useOutletContext } from 'react-router-dom'
import { Notifications } from './Notifications'

// The subscription lives in AppShell so the bell and this page share one
// channel. This reads it back off the outlet rather than opening a second.
export function NotificationsRoute() {
  const { notifications } = useOutletContext()

  return (
    <Notifications
      items={notifications.items}
      unread={notifications.unread}
      loading={notifications.loading}
      onReadOne={notifications.readOne}
      onReadAll={notifications.readAll}
    />
  )
}
