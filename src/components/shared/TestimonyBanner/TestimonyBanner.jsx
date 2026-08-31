import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import { isPromptDue } from '@/lib/testimonies'
import './TestimonyBanner.css'

// Per-session key, same as the onboarding banner. Dismissing hides it for this
// tab session and it returns on the next visit. Nudge, do not pester.
const SESSION_KEY = 'tv.tstBannerDismissed'

// Q39. After roughly three sessions, or when an admin has asked. Both live in
// testimony_prompt_due, so the rule has one home and this component does not
// count meetings itself.
//
// Third in the banner queue. Verify takes the slot first, onboarding second,
// and this one waits behind both: somebody who has not confirmed their email
// is not being asked for a testimony.
export function TestimonyBanner() {
  const profile = useAuth((s) => s.profile)

  const [due, setDue] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    if (typeof sessionStorage === 'undefined') return false
    try { return sessionStorage.getItem(SESSION_KEY) === '1' } catch { return false }
  })

  const eligible = Boolean(profile?.email_verified) && Boolean(profile?.onboarded)

  useEffect(() => {
    if (!eligible || dismissed) return undefined

    let cancelled = false
    isPromptDue()
      .then((value) => { if (!cancelled) setDue(value) })
      // A banner that cannot decide whether to appear does not appear. There
      // is nothing here a member could act on.
      .catch(() => { if (!cancelled) setDue(false) })

    return () => { cancelled = true }
  }, [eligible, dismissed, profile?.id])

  if (!eligible)  return null
  if (dismissed)  return null
  if (!due)       return null

  const dismiss = () => {
    try { sessionStorage.setItem(SESSION_KEY, '1') } catch { /* private mode */ }
    setDismissed(true)
  }

  return (
    <div className="tstb" role="status">
      <div className="tstb__body">
        <span className="tstb__icon" aria-hidden="true">
          {/* Open quote marks. Reads as "say something" rather than as a task
              with a deadline, which is what a clipboard would say. */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 7c-2.5 0-4 2-4 4.5S6.5 16 9 16c.6 0 1.1-.1 1.5-.3-.4 1.6-1.7 2.8-3.5 3.3"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            />
            <path
              d="M18 7c-2.5 0-4 2-4 4.5s1.5 4.5 4 4.5c.6 0 1.1-.1 1.5-.3-.4 1.6-1.7 2.8-3.5 3.3"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="tstb__text">
          <p className="tstb__title">Would you tell us what mentoring has done for you?</p>
          <p className="tstb__sub">
            A few lines. Our team reads it first, only your first name is shown, and
            you can take it down whenever you like.
          </p>
        </div>
      </div>

      <div className="tstb__actions">
        <Link to="/testimony" className="tstb__cta">Write a few lines</Link>
        <button
          type="button"
          className="tstb__dismiss"
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
