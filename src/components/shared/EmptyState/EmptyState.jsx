import { Icon } from '@/components/shared/Icon/Icon'

export function EmptyState({ icon = 'info', title, children }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={22} />
      </div>
      <div className="empty-title">{title}</div>
      <p className="empty-body">{children}</p>
    </div>
  )
}
