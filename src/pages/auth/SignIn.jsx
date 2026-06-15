import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/stores/useAuth'
import './auth.css'

const schema = z.object({
  email:    z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

export function SignIn() {
  const navigate = useNavigate()
  const location = useLocation()
  const signIn = useAuth((s) => s.signIn)
  const sendMagicLink = useAuth((s) => s.sendMagicLink)

  const [authError, setAuthError]       = useState('')
  const [magicSent, setMagicSent]       = useState('')
  const [notice, setNotice]             = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [sendingMagic, setSendingMagic] = useState(false)

  // Read a one-shot reason from the URL on mount, then strip it. This handles
  // arrivals like /auth/sign-in?reason=deactivated triggered by useAuth when
  // it detects an inactive profile or a mid-session deactivation.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const reason = params.get('reason')
    if (reason) {
      setNotice(noticeFor(reason))
      params.delete('reason')
      const next = params.toString()
      navigate(
        { pathname: location.pathname, search: next ? `?${next}` : '' },
        { replace: true }
      )
    }
    // Only on first mount. Re-runs would loop with our own navigate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSubmit = async (values) => {
    setAuthError('')
    setMagicSent('')
    setSubmitting(true)
    try {
      await signIn(values)
      const fromState = location.state?.from
      navigate(fromState ?? '/auth/callback', { replace: true })
    } catch (err) {
      setAuthError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const onMagicLink = async () => {
    setAuthError('')
    setMagicSent('')
    const email = getValues('email')?.trim()
    if (!email) {
      setAuthError('Enter your email above first, then we can send the sign-in link.')
      return
    }
    setSendingMagic(true)
    try {
      await sendMagicLink({ email })
      setMagicSent(`Sign-in link sent to ${email}. Check your inbox.`)
    } catch (err) {
      setAuthError(friendlyError(err))
    } finally {
      setSendingMagic(false)
    }
  }

  const { register, handleSubmit, getValues, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' }
  })

  return (
    <section className="auth__panel">
      <header className="auth__panel-head">
        <span className="auth__eyebrow">Sign in</span>
        <h1 className="auth__title">Welcome back</h1>
        <p className="auth__lede">Continue where you left off.</p>
      </header>

      {notice && (
        <div className="auth__alert auth__alert--notice" role="status">
          {notice}{' '}
          <Link to="/contact" className="auth__alert-link">Contact us</Link>
          {' '}if you think this is a mistake.
        </div>
      )}
      {authError && <div className="auth__alert auth__alert--error"   role="alert">{authError}</div>}
      {magicSent && <div className="auth__alert auth__alert--success" role="status">{magicSent}</div>}

      <form className="auth__form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="auth__field">
          <label className="auth__label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="auth__input"
            placeholder="you@example.com"
            {...register('email')}
          />
          {errors.email && <span className="auth__field-error">{errors.email.message}</span>}
        </div>

        <div className="auth__field">
          <div className="auth__field-row">
            <label className="auth__label" htmlFor="password">Password</label>
            <Link to="/auth/reset" className="auth__field-link">Forgot it?</Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="auth__input"
            placeholder="At least 8 characters"
            {...register('password')}
          />
          {errors.password && <span className="auth__field-error">{errors.password.message}</span>}
        </div>

        <button type="submit" className="auth__btn auth__btn--primary" disabled={submitting}>
          {submitting ? 'Signing in' : 'Sign in'}
        </button>
      </form>

      <div className="auth__divider"><span>or</span></div>

      <button
        type="button"
        className="auth__btn auth__btn--secondary"
        onClick={onMagicLink}
        disabled={sendingMagic}
      >
        {sendingMagic ? 'Sending link' : 'Send me a sign-in link'}
      </button>

      <p className="auth__meta">
        New to ToolVine? <Link to="/auth/sign-up" className="auth__meta-link">Create an account</Link>
      </p>
    </section>
  )
}

// Map a reason query value to a human notice. Single source of truth, so new
// reasons (suspended, expired, etc.) extend here.
function noticeFor(reason) {
  switch (reason) {
    case 'deactivated': return 'This account is no longer active.'
    default:            return ''
  }
}

function friendlyError(err) {
  const msg = (err?.message || '').toLowerCase()
  // The auth layer returns "User banned" when banned_until is set. Show the
  // same notice copy as the deactivation redirect so the message is consistent
  // whether the user arrived via redirect or attempted a fresh sign-in.
  if (msg.includes('banned') || msg.includes('disabled')) {
    return 'This account is no longer active. If you think this is a mistake, please contact us via the Contact page.'
  }
  if (msg.includes('invalid login'))       return 'That email and password do not match. Try again.'
  if (msg.includes('email not confirmed')) return 'Your email is not confirmed yet. Check your inbox for the confirmation link.'
  if (msg.includes('rate limit'))          return 'Too many attempts. Please wait a minute and try again.'
  return 'We could not sign you in. Check your details and try again.'
}
