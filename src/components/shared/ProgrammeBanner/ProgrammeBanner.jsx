import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import {
  fetchMemberSchedule,
  fetchBannerLeadDays,
  nextWithin,
  programmeWhen
} from '@/lib/programmes'
import './ProgrammeBanner.css'

// Q31. A banner one to two days ahead, and a bell notification. No email:
// reminders are already a sore subject with this audience.
//
// Third in a queue, not a third slot. Verify takes the banner space until the
// email is confirmed, onboarding takes it until the profile is done, and this
// waits behind both. Somebody who has not verified their email does not need
// to know about Saturday, and three stacked banners is not a nudge, it is a
// wall.

const SESSION_KEY = 'tv.progBannerDismissed'

export function ProgrammeBanner() {
  const profile = useAuth((s) => s.profile)

  const [occurrence, setOccurrence] = useState(null)
  const [dismissed, setDismissed] = useState(() => {
    if (typeof sessionStorage === 'undefined') return false
    try { return sessionStorage.getItem(SESSION_KEY) === '1' } catch { return false }
  })

  const ready = Boolean(profile?.email_verified && profile?.onboarded)

  useEffect(() => {
    if (!ready || dismissed) return undefined

    let cancelled = false
    Promise.all([fetchBannerLeadDays(), fetchMemberSchedule()])
      .then(([lead, { occurrences }]) => {
        if (!cancelled) setOccurrence(nextWithin(occurrences, lead))
      })
      .catch((e) => {
        // A missed banner is not worth an error surface, and a silent failure
        // is what cost a debugging round trip on the public page.
        if (!cancelled) console.warn('[programmes] banner lookup failed:', e?.message || e)
      })

    return () => { cancelled = true }
  }, [ready, dismissed])

  if (!ready || dismissed || !occurrence) return null

  const dismiss = () => {
    try { sessionStorage.setItem(SESSION_KEY, '1') } catch { /* private mode */ }
    setDismissed(true)
  }

  const title = occurrence.title || occurrence.programme_name || 'A gathering'

  return (
    <div className="progb" role="status">
      <div className="progb__body">
        <span className="progb__icon" aria-hidden="true">
          {/* Calendar carrying a single mark: one date, not a schedule. */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="12" cy="15.5" r="1.6" fill="currentColor" />
          </svg>
        </span>
        <div className="progb__text">
          <p className="progb__title">{title} is coming up.</p>
          <p className="progb__sub">{programmeWhen(occurrence)}</p>
        </div>
      </div>

      <div className="progb__actions">
        {/* The joining link is the reason anyone reads this, so it is the
            primary action when there is one to give. */}
        {occurrence.joinUrl ? (
          <a
            className="progb__cta"
            href={occurrence.joinUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Join link
          </a>
        ) : (
          <Link to="/programmes" className="progb__cta">See details</Link>
        )}
        <button
          type="button"
          className="progb__dismiss"
          onClick={dismiss}
          aria-label="Dismiss until next visit"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
