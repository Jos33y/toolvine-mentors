import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import { ROLES, primaryRole } from '@/lib/roles'
import './OnboardingBanner.css'

// Per-session key. Dismissing hides the banner for this tab session; the banner
// returns on the next visit. Aligns with the soft-gate philosophy: nudge, do
// not pester.
const SESSION_KEY = 'tv.onbBannerDismissed'

// What onboarding actually gates differs by role, so the nudge does too. A
// mentor is not waiting to be given a mentor, and nothing pairs an admin at
// all. Keyed on primaryRole, so a mentor who is also a mentee gets the mentor
// framing, matching which dashboard they land on.
const COPY = {
  [ROLES.MENTOR]: {
    title: 'Finish setting up so we can assign your mentees.',
    sub:   'A few minutes. Mentees cannot be assigned until your profile is complete.'
  },
  [ROLES.MENTEE]: {
    title: 'Finish setting up so we can pair you.',
    sub:   'A few minutes. Your mentor cannot be assigned until your profile is complete.'
  },
  [ROLES.ADMIN]: {
    title: 'Finish setting up your profile.',
    sub:   'A few minutes. Your details show up across the platform wherever you act.'
  }
}

export function OnboardingBanner() {
  const profile = useAuth((s) => s.profile)
  const roles   = useAuth((s) => s.roles)
  const [dismissed, setDismissed] = useState(() => {
    if (typeof sessionStorage === 'undefined') return false
    try { return sessionStorage.getItem(SESSION_KEY) === '1' } catch { return false }
  })

  // Verify takes the banner slot when the user has not confirmed their email
  // yet; this banner waits its turn. Once email_verified flips true, the
  // verify banner returns null and this one renders.
  if (!profile)               return null
  if (!profile.email_verified) return null
  if (profile.onboarded)      return null
  if (dismissed)              return null

  const copy = COPY[primaryRole(roles)] ?? COPY[ROLES.MENTEE]

  const dismiss = () => {
    try { sessionStorage.setItem(SESSION_KEY, '1') } catch { /* private mode */ }
    setDismissed(true)
  }

  return (
    <div className="onbb" role="status">
      <div className="onbb__body">
        <span className="onbb__icon" aria-hidden="true">
          {/* Clipboard with three list lines: reads as "form to fill" rather
              than "task complete." */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="4" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9 4v-1a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9 10h6M9 14h6M9 18h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
        <div className="onbb__text">
          <p className="onbb__title">{copy.title}</p>
          <p className="onbb__sub">{copy.sub}</p>
        </div>
      </div>

      <div className="onbb__actions">
        <Link to="/onboarding" className="onbb__cta">Complete profile</Link>
        <button
          type="button"
          className="onbb__dismiss"
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
