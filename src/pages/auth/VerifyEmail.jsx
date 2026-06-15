import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/useAuth'
import { homeFor } from '@/lib/roles'
import '../auth/auth.css'

// /auth/verify-email?token=...
//
// Sits under AuthLayout. Caller may or may not have a session: the verify-email
// link works whether the user is signed in (same browser, post-signup) or
// signed out (different device, signed in elsewhere). The token itself is the
// authority; the page just renders the result and offers the appropriate
// follow-on action.
export function VerifyEmail() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token    = params.get('token')

  const session        = useAuth((s) => s.session)
  const roles          = useAuth((s) => s.roles)
  const refreshUser    = useAuth((s) => s.refreshUser)
  const sendVerifyEmail = useAuth((s) => s.sendVerifyEmail)

  // States: loading | success | expired | used | invalid | error
  const [status, setStatus]     = useState(token ? 'loading' : 'invalid')
  const [resending, setResending] = useState(false)
  const [resent, setResent]       = useState(false)

  // Guard against StrictMode double-invoke in dev. We only want one confirm call
  // per page load; otherwise the second call would see already-used.
  const ran = useRef(false)

  useEffect(() => {
    if (!token || ran.current) return
    ran.current = true

    ;(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-email-confirm', {
          body: { token }
        })

        const code = error ? 'error' : (data?.error || null)
        if (code === null) {
          await refreshUser()
          setStatus('success')
          return
        }
        if (code === 'expired')             setStatus('expired')
        else if (code === 'already-used')   setStatus('used')
        else if (code === 'invalid-token')  setStatus('invalid')
        else                                setStatus('error')
      } catch (err) {
        console.error('[VerifyEmail] confirm failed:', err)
        setStatus('error')
      }
    })()
  }, [token, refreshUser])

  const handleResend = async () => {
    setResending(true)
    setResent(false)
    try {
      await sendVerifyEmail()
      setResent(true)
    } catch {
      // Silent fail; user can try again.
    } finally {
      setResending(false)
    }
  }

  const copy = COPY[status]
  const showResend  = session && (status === 'expired' || status === 'invalid' || status === 'error')
  const showSignIn  = !session && (status === 'expired' || status === 'invalid' || status === 'error' || status === 'used')

  return (
    <section className="auth__panel" aria-busy={status === 'loading'}>
      <header className="auth__panel-head">
        <span className="auth__eyebrow">Verify email</span>
        <h1 className="auth__title">{copy.title}</h1>
        <p className="auth__lede">{copy.lede}</p>
      </header>

      {status === 'loading' && (
        <p className="auth__meta" style={{ textAlign: 'center' }}>Confirming your email.</p>
      )}

      {status === 'success' && (
        session ? (
          <button
            type="button"
            className="auth__btn auth__btn--primary"
            onClick={() => navigate(homeFor(roles), { replace: true })}
          >
            Continue to dashboard
          </button>
        ) : (
          <Link to="/auth/sign-in" className="auth__btn auth__btn--primary">
            Continue to sign in
          </Link>
        )
      )}

      {status === 'used' && session && (
        <button
          type="button"
          className="auth__btn auth__btn--primary"
          onClick={() => navigate(homeFor(roles), { replace: true })}
        >
          Continue to dashboard
        </button>
      )}

      {showResend && (
        <button
          type="button"
          className="auth__btn auth__btn--primary"
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? 'Sending' : resent ? 'Sent. Check your inbox.' : 'Resend verification email'}
        </button>
      )}

      {showSignIn && (
        <Link to="/auth/sign-in" className="auth__btn auth__btn--primary">
          Sign in
        </Link>
      )}
    </section>
  )
}

const COPY = {
  loading: {
    title: 'Confirming your email',
    lede:  'One moment.'
  },
  success: {
    title: 'Email confirmed',
    lede:  'Your account is verified. Welcome to ToolVine.'
  },
  expired: {
    title: 'This link has expired',
    lede:  'Verification links are valid for 24 hours. Request a fresh one and we will send it right away.'
  },
  used: {
    title: 'Already verified',
    lede:  'This link has already been used. Your email is confirmed.'
  },
  invalid: {
    title: 'This link is not valid',
    lede:  'The link in your email may have been broken across two lines. Try copying the full URL into your browser, or request a new one.'
  },
  error: {
    title: 'Something went wrong',
    lede:  'We could not confirm your email right now. Try again, or request a fresh verification link.'
  }
}
