import { Link } from 'react-router-dom'
import { Icon } from '@/components/shared/Icon/Icon'
import './PlaceholderPage.css'

export function PlaceholderPage({ eyebrow, title, body, primaryAction }) {
  return (
    <div className="placeholder">
      <div className="placeholder-inner">
        <div className="placeholder-eyebrow">{eyebrow}</div>
        <h1 className="placeholder-title">{title}</h1>
        <p className="placeholder-body">{body}</p>

        <div className="placeholder-actions">
          {primaryAction ? (
            <Link to={primaryAction.to} className="placeholder-btn-primary">
              {primaryAction.label}
            </Link>
          ) : null}
          <Link to="/" className="placeholder-btn-secondary">
            <Icon name="home" size={18} /> Return home
          </Link>
        </div>
      </div>
    </div>
  )
}
