import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/useAuth'
import './auth.css'

const schema = z.object({
  password: z.string().min(8, 'Use at least 8 characters'),
  confirm:  z.string()
}).refine((d) => d.password === d.confirm, {
  path: ['confirm'],
  message: 'Passwords do not match'
})

export function ResetConfirm() {
  const setPassword = useAuth((s) => s.setPassword)
  const navigate    = useNavigate()

  const [status,    setStatus]     = useState('checking')
  const [authError, setAuthError]  = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' }
  })

  useEffect(() => {
    let cancelled = false

    // PASSWORD_RECOVERY fires when Supabase processes the recovery link hash.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setStatus('ready')
      }
    })

    // Backup path: if the hash was processed before this effect ran the event
    // never fires, so verify directly after a short delay.
    const t = setTimeout(async () => {
      if (cancelled) return
      const { data } = await supabase.auth.getSession()
      setStatus(data.session ? 'ready' : 'invalid')
    }, 700)

    return () => {
      cancelled = true
      subscription.unsubscribe()
      clearTimeout(t)
    }
  }, [])

  const onSubmit = async (values) => {
    setAuthError('')
    setSubmitting(true)
    try {
      await setPassword({ password: values.password })
      navigate('/auth/callback', { replace: true })
    } catch (err) {
      setAuthError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const lede = status === 'invalid'
    ? 'This link is no longer valid or has expired. Request a new one below.'
    : 'Choose a new password for your account.'

  return (
    <section className="auth__panel">
      <header className="auth__panel-head">
        <span className="auth__eyebrow">Password reset</span>
        <h1 className="auth__title">Set a new password</h1>
        <p  className="auth__lede">{lede}</p>
      </header>

      {authError && (
        <div className="auth__alert auth__alert--error" role="alert">{authError}</div>
      )}

      {status === 'invalid' ? (
        <div className="auth__form">
          <Link to="/auth/reset" className="auth__btn auth__btn--primary">
            Request a new link
          </Link>
        </div>
      ) : (
        <form className="auth__form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="auth__field">
            <label className="auth__label" htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="auth__input"
              disabled={status !== 'ready'}
              {...register('password')}
            />
            <span className="auth__field-hint">At least eight characters.</span>
            {errors.password && (
              <span className="auth__field-error">{errors.password.message}</span>
            )}
          </div>

          <div className="auth__field">
            <label className="auth__label" htmlFor="confirm">Confirm new password</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              className="auth__input"
              disabled={status !== 'ready'}
              {...register('confirm')}
            />
            {errors.confirm && (
              <span className="auth__field-error">{errors.confirm.message}</span>
            )}
          </div>

          <button
            type="submit"
            className="auth__btn auth__btn--primary"
            disabled={submitting || status !== 'ready'}
          >
            {submitting
              ? 'Updating'
              : status === 'checking'
                ? 'Checking link'
                : 'Update password'}
          </button>
        </form>
      )}

      <p className="auth__meta">
        Back to <Link to="/auth/sign-in" className="auth__meta-link">sign in</Link>
      </p>
    </section>
  )
}

function friendlyError(err) {
  const msg = (err?.message || '').toLowerCase()
  if (msg.includes('session missing') || msg.includes('not authenticated'))
    return 'This link is no longer valid. Request a new reset link.'
  if (msg.includes('same') || msg.includes('different from'))
    return 'Choose a password you have not used before on this account.'
  if (msg.includes('weak') || msg.includes('password should'))
    return 'That password is too weak. Try something longer.'
  if (msg.includes('rate limit'))
    return 'Too many attempts. Wait a minute and try again.'
  return 'We could not update your password. Try again, or request a new reset link.'
}
