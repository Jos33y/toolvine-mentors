import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/stores/useAuth'
import './auth.css'

const schema = z.object({
  email: z.string().email('Please enter a valid email address')
})

export function Reset() {
  const resetPassword = useAuth((s) => s.resetPassword)

  const [sent, setSent]             = useState('')
  const [authError, setAuthError]   = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '' }
  })

  const onSubmit = async (values) => {
    setAuthError('')
    setSubmitting(true)
    try {
      await resetPassword({ email: values.email })
      // Phrased so we do not confirm whether an account exists for that email.
      setSent(`If an account exists for ${values.email}, a reset link is on its way.`)
    } catch (err) {
      setAuthError('We could not send the reset link. Try again, or contact support.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth__panel">
      <header className="auth__panel-head">
        <span className="auth__eyebrow">Password reset</span>
        <h1 className="auth__title">Reset your password</h1>
        <p className="auth__lede">Enter the email on your account. We will send you a reset link.</p>
      </header>

      {authError && <div className="auth__alert auth__alert--error"   role="alert">{authError}</div>}
      {sent      && <div className="auth__alert auth__alert--success" role="status">{sent}</div>}

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

        <button type="submit" className="auth__btn auth__btn--primary" disabled={submitting}>
          {submitting ? 'Sending' : 'Send reset link'}
        </button>
      </form>

      <p className="auth__meta">
        Remembered it? <Link to="/auth/sign-in" className="auth__meta-link">Sign in</Link>
      </p>
    </section>
  )
}
