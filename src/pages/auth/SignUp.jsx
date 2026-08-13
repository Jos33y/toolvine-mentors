import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/stores/useAuth'
import { supabase } from '@/lib/supabase'
import './auth.css'

// Role hint is a self-declaration at sign-up. Onboarding revisits it. Backend
// trigger reads role_hint from user_metadata and sets profiles.role_intent +
// role_undecided. Public sign-up still lands as mentee in user_roles; admin
// promotes from there.
//
// An invited sign-up is different. The token is validated inside
// handle_new_user, which grants the invited role directly and marks the email
// verified. The form's job is only to carry the token and to stop the person
// changing the address it was issued for. Every guarantee is enforced
// server-side; the locked field is courtesy, not security.
const ROLE_OPTIONS = [
  { value: 'mentor',    label: 'Mentor' },
  { value: 'mentee',    label: 'Mentee' },
  { value: 'undecided', label: 'Not sure' }
]

const ROLE_LABELS = {
  mentor:    'Mentor',
  mentee:    'Mentee',
  undecided: 'Still deciding'
}

const schema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name'),
  email:    z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters'),
  roleHint: z.enum(['mentor', 'mentee', 'undecided'])
})

export function SignUp() {
  const navigate = useNavigate()
  const signUp = useAuth((s) => s.signUp)
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const [authError, setAuthError]           = useState('')
  const [submitting, setSubmitting]         = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState('')

  // null means no token in the URL. 'checking' while we resolve it. An object
  // means it is live. 'invalid' means it is dead, and we fall back to the
  // ordinary form rather than blocking sign-up over a stale link.
  const [invite, setInvite] = useState(inviteToken ? 'checking' : null)

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '', roleHint: 'mentee' }
  })

  const roleHint = useWatch({ control, name: 'roleHint' })

  useEffect(() => {
    if (!inviteToken) return
    let alive = true

    supabase
      .rpc('invite_preview', { p_token: inviteToken })
      .then(({ data, error }) => {
        if (!alive) return
        const row = Array.isArray(data) ? data[0] : data
        if (error || !row) {
          setInvite('invalid')
          return
        }
        setInvite(row)
        setValue('email', row.email)
        setValue('roleHint', row.role_hint)
      })

    return () => { alive = false }
  }, [inviteToken, setValue])

  const invited = invite && invite !== 'checking' && invite !== 'invalid'

  const onSubmit = async (values) => {
    setAuthError('')
    setPendingConfirm('')
    setSubmitting(true)
    try {
      // Pass roleHint straight through. The trigger handles 'undecided' by
      // setting role_intent = null and role_undecided = true. Coercing here
      // would lose that signal.
      const result = await signUp({
        email:       invited ? invite.email : values.email,
        password:    values.password,
        fullName:    values.fullName,
        role:        values.roleHint,
        inviteToken: invited ? inviteToken : null
      })

      if (result.session) {
        navigate('/auth/callback', { replace: true })
      } else {
        setPendingConfirm(
          `Almost there. We sent a confirmation to ${values.email}. Open it, then sign in.`
        )
      }
    } catch (err) {
      setAuthError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth__panel">
      <header className="auth__panel-head">
        <span className="auth__eyebrow">{invited ? 'You are invited' : 'Get started'}</span>
        <h1 className="auth__title">Create your account</h1>
      </header>

      {invite === 'checking' && (
        <div className="auth__alert auth__alert--notice" role="status">
          Checking your invitation.
        </div>
      )}

      {invite === 'invalid' && (
        <div className="auth__alert auth__alert--error" role="alert">
          That invitation link is no longer valid. It may have expired or already been used.
          You can still create an account below, or write to us at hello@toolvinementors.com.
        </div>
      )}

      {invited && (
        <div className="auth__alert auth__alert--success" role="status">
          You have been invited to join as a {ROLE_LABELS[invite.role_hint].toLowerCase()}.
          Set a password below and your account is ready.
        </div>
      )}

      {authError      && <div className="auth__alert auth__alert--error"   role="alert">{authError}</div>}
      {pendingConfirm && <div className="auth__alert auth__alert--success" role="status">{pendingConfirm}</div>}

      <form className="auth__form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="auth__field">
          <label className="auth__label" htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            className="auth__input"
            placeholder="Your full name"
            {...register('fullName')}
          />
          {errors.fullName && <span className="auth__field-error">{errors.fullName.message}</span>}
        </div>

        <div className="auth__field">
          <label className="auth__label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="auth__input"
            placeholder="you@example.com"
            readOnly={invited}
            aria-readonly={invited || undefined}
            {...register('email')}
          />
          {errors.email && <span className="auth__field-error">{errors.email.message}</span>}
          {invited && (
            <span className="auth__field-hint">
              This invitation was sent to this address, so it cannot be changed here.
            </span>
          )}
        </div>

        <div className="auth__field">
          <label className="auth__label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="auth__input"
            placeholder="At least 8 characters"
            {...register('password')}
          />
          {errors.password && <span className="auth__field-error">{errors.password.message}</span>}
          <span className="auth__field-hint">A passphrase you can remember works best.</span>
        </div>

        {invited ? (
          // Read-only. The role came from the invite and is already granted
          // server-side, so offering the choice again would let role_intent
          // and user_roles disagree from the first second of the account.
          <div className="auth__field">
            <span className="auth__label">I am joining as</span>
            <p className="auth__readonly">{ROLE_LABELS[invite.role_hint]}</p>
            <span className="auth__field-hint">Set by your invitation.</span>
          </div>
        ) : (
          <div className="auth__field">
            <span className="auth__label" id="role-hint-label">I am joining as</span>
            <div className="auth__roles" role="radiogroup" aria-labelledby="role-hint-label">
              {ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`auth__role ${roleHint === opt.value ? 'auth__role--active' : ''}`}
                >
                  <input
                    type="radio"
                    value={opt.value}
                    className="auth__role-input"
                    {...register('roleHint')}
                  />
                  <span className="auth__role-label">{opt.label}</span>
                </label>
              ))}
            </div>
            <span className="auth__field-hint">
              We will confirm this with you after sign-up. Pick the closest fit for now.
            </span>
          </div>
        )}

        <button
          type="submit"
          className="auth__btn auth__btn--primary"
          disabled={submitting || invite === 'checking'}
        >
          {submitting ? 'Creating account' : 'Create account'}
        </button>
      </form>

      <p className="auth__meta">
        Already have an account? <Link to="/auth/sign-in" className="auth__meta-link">Sign in</Link>
      </p>
    </section>
  )
}

function friendlyError(err) {
  const msg = (err?.message || '').toLowerCase()
  if (msg.includes('already registered')) return 'An account with that email already exists. Try signing in instead.'
  if (msg.includes('rate limit'))         return 'Too many attempts. Please wait a minute and try again.'
  if (msg.includes('password'))           return 'That password is not allowed. Try a longer one.'
  return 'We could not create your account. Check your details and try again.'
}
