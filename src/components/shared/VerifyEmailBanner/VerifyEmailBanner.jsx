import { useState } from 'react'
import { useAuth } from '@/stores/useAuth'
import './VerifyEmailBanner.css'

// Per-session dismiss key. Independent of OnboardingBanner so dismissing one
// does not silence the other.
const SESSION_KEY = 'tv.verifyBannerDismissed'

// Mounts above OnboardingBanner. Shown to any signed-in user whose
// profiles.email_verified = false. Returns null otherwise.
//
// Distinguished from OnboardingBanner by a teal left bar (verify is the lower-
// stakes ask), envelope glyph, and Resend action. Dismiss is per-session, so
// the next visit nudges again.
export function VerifyEmailBanner() {
  const profile         = useAuth((s) => s.profile)
  const sendVerifyEmail = useAuth((s) => s.sendVerifyEmail)

  const [dismissed, setDismissed] = useState(() => {
    if (typeof sessionStorage === 'undefined') return false
    try { return sessionStorage.getItem(SESSION_KEY) === '1' } catch { return false }
  })

  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)

  if (!profile || profile.email_verified || dismissed) return null

  const dismiss = () => {
    try { sessionStorage.setItem(SESSION_KEY, '1') } catch { /* private mode */ }
    setDismissed(true)
  }

  const resend = async () => {
    setSending(true)
    setSent(false)
    try {
      await sendVerifyEmail()
      setSent(true)
      // Revert the "Sent" label after a few seconds so the affordance is
      // available again without forcing a page refresh.
      setTimeout(() => setSent(false), 5000)
    } catch {
      // Silent fail. User can press resend again.
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="vfb" role="status">
      <div className="vfb__body">
        <span className="vfb__icon" aria-hidden="true">
          {/* Envelope: rectangle with letter flap. Reads as "an email is waiting." */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="m3 7 9 6 9-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="vfb__text">
          <p className="vfb__title">Verify your email.</p>
          <p className="vfb__sub">
            Click the link we sent to {profile.email} to confirm your account. If it does not arrive, check your spam folder.
          </p>
        </div>
      </div>

      <div className="vfb__actions">
        <button
          type="button"
          className="vfb__cta"
          onClick={resend}
          disabled={sending}
        >
          {sending ? 'Sending' : sent ? 'Sent' : 'Resend email'}
        </button>
        <button
          type="button"
          className="vfb__dismiss"
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
