import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getInvolvedSchema, submitGetInvolvedForm, INTERESTS } from '@/lib/getInvolved'
import { Logo } from '@/components/shared/Logo/Logo'
import { Icon } from '@/components/shared/Icon/Icon'
import './GetInvolved.css'

/* ============ Config ============ */

// Message placeholder that adapts to the selected interest so the form
// speaks the visitor's intent back to them.
const MESSAGE_PLACEHOLDERS = {
  volunteer: 'Tell us what you would like to volunteer with. Share what you can offer and when you are available.',
  sponsor:   'Tell us what you would like to sponsor. A program, an outreach, or a specific need.',
  donate:    'Tell us what you would like to give toward. A specific need, or the general work.',
  partner:   'Tell us about your organization and where you see the missions overlap.'
}

/* Minimum elapsed ms between form mount and submit. Anything faster is a bot. */
const MIN_SUBMIT_MS = 2000

/* ============ Component ============ */

export function GetInvolved() {
  const [state, setState] = useState('idle')           // 'idle' | 'sending' | 'sent'
  const [submitError, setSubmitError] = useState('')
  const mountTimeRef = useRef(Date.now())
  const formRef      = useRef(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(getInvolvedSchema),
    defaultValues: {
      interest:     '',
      name:         '',
      email:        '',
      phone:        '',
      organization: '',
      message:      '',
      website:      ''                                  // honeypot
    }
  })

  const interest      = watch('interest')
  const messageLength = (watch('message') ?? '').length

  const choosePath = (value) => {
    setValue('interest', value, { shouldValidate: true })
    // Scroll form into view once the interest is selected.
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const onSubmit = async (values) => {
    /* Bot checks: silent fake success so spammers do not learn what tripped them. */
    const honeypot = (getValues('website') || '').trim()
    const elapsed  = Date.now() - mountTimeRef.current
    if (honeypot || elapsed < MIN_SUBMIT_MS) {
      setState('sent')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitError('')
    setState('sending')
    try {
      await submitGetInvolvedForm(values)
      setState('sent')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setSubmitError('Something went wrong sending your note. Please try again, or email hello@toolvinementors.com.')
      setState('idle')
    }
  }

  const resetForm = () => {
    reset()
    setState('idle')
    setSubmitError('')
    mountTimeRef.current = Date.now()
  }

  /* Magnetic send button: cursor proximity nudges button toward pointer. */
  const sendRef = useRef(null)
  useEffect(() => {
    if (state !== 'idle') return
    if (typeof window === 'undefined') return
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!canHover) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const onMove = (e) => {
      const btn = sendRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      const dist = Math.hypot(dx, dy)
      const range = 140
      if (dist < range) {
        const t = 1 - dist / range
        btn.style.setProperty('--mx', `${(dx * t * 0.18).toFixed(1)}px`)
        btn.style.setProperty('--my', `${(dy * t * 0.18).toFixed(1)}px`)
      } else {
        btn.style.setProperty('--mx', '0px')
        btn.style.setProperty('--my', '0px')
      }
    }

    document.addEventListener('mousemove', onMove, { passive: true })
    return () => document.removeEventListener('mousemove', onMove)
  }, [state])

  const messagePlaceholder = interest && MESSAGE_PLACEHOLDERS[interest]
    ? MESSAGE_PLACEHOLDERS[interest]
    : 'Tell us how you would like to walk with us.'

  /* ============ Success takeover ============ */
  if (state === 'sent') {
    return (
      <div className="gi">
        <div className="gi__atmosphere" aria-hidden="true" />

        <section className="gi__sent" aria-live="polite">
          <div className="gi__sent-seal" aria-hidden="true">
            <Logo variant="mark" size={420} />
          </div>

          <p className="gi__sent-asterism" aria-hidden="true">&#8258;</p>
          <p className="gi__sent-eyebrow">RECEIVED</p>
          <h1 className="gi__sent-line">
            <span className="gi__sent-line-a">We hear</span>
            <em className="gi__sent-line-b">you.</em>
          </h1>
          <p className="gi__sent-meta">
            Someone from the team will reach out within a week.
            Until then, take a look at what we have been up to.
          </p>
          <div className="gi__sent-actions">
            <Link to="/about" className="gi__sent-primary">
              About Toolvine
              <span aria-hidden="true">&rarr;</span>
            </Link>
            <button type="button" className="gi__sent-back" onClick={resetForm}>
              Send another
            </button>
          </div>
        </section>
      </div>
    )
  }

  /* ============ Normal page ============ */
  return (
    <div className="gi">
      <div className="gi__atmosphere" aria-hidden="true" />

      {/* Hero */}
      <header className="gi__hero">
        <div className="gi__watermark" aria-hidden="true">
          <Logo variant="mark" size={400} />
        </div>

        <p className="gi__eyebrow">WAYS TO SUPPORT</p>
        <h1 className="gi__title">
          <span className="gi__title-line">Walk</span>
          <em className="gi__title-italic">with us.</em>
        </h1>
        <p className="gi__intro">
          The initiative is carried by more than the people whose names appear on it.
          If you have time, skills, capital, or an aligned mission, there is a way in.
        </p>
        <p className="gi__meta">
          FOUR PATHS&nbsp;&nbsp;&middot;&nbsp;&nbsp;ONE MISSION
        </p>
      </header>

      {/* Architectural divider */}
      <div className="gi__divider" aria-hidden="true">
        <span className="gi__divider-rule" />
        <span className="gi__divider-mark">&#8258;</span>
        <span className="gi__divider-rule" />
      </div>

      {/* Four paths */}
      <section className="gi__paths" aria-label="Ways to support">
        <div className="gi__paths-head">
          <p className="gi__paths-eyebrow">THE PATHS</p>
          <h2 className="gi__paths-title">Pick where you fit.</h2>
          <p className="gi__paths-lede">
            Each path opens the same form with your intent already set. Change your mind at any point.
          </p>
        </div>

        <div className="gi__path-grid">
          {INTERESTS.map((p) => (
            <article
              key={p.value}
              className={`gi__path ${interest === p.value ? 'is-selected' : ''}`}
            >
              <div className="gi__path-head">
                <span className="gi__path-icon" aria-hidden="true">
                  <Icon name={p.icon} size={32} strokeWidth={1.5} />
                </span>
                <span className="gi__path-mark" aria-hidden="true" />
              </div>
              <h3 className="gi__path-title">{p.label}.</h3>
              <p className="gi__path-body">{p.caption}</p>
              <button
                type="button"
                className="gi__path-cta"
                onClick={() => choosePath(p.value)}
                aria-label={`Choose ${p.label} and go to the form`}
              >
                {interest === p.value ? 'Selected' : 'Choose this'}
                <span className="gi__path-arrow" aria-hidden="true">&rarr;</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Form */}
      <section className="gi__form-section" ref={formRef}>
        <div className="gi__form-head">
          <p className="gi__form-eyebrow">THE FORM</p>
          <h2 className="gi__form-title">Tell us who you are.</h2>
          <p className="gi__form-lede">
            One form, five short fields. We reply to every serious note.
          </p>
        </div>

        <form className="gi__form" onSubmit={handleSubmit(onSubmit)} noValidate>

          {/* Interest radio group */}
          <div className="gi__field-group">
            <p className="gi__field-group-label">Your intent</p>
            <div className="gi__interest-grid" role="radiogroup" aria-label="Your intent">
              {INTERESTS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  role="radio"
                  aria-checked={interest === p.value}
                  className={`gi__interest-pill${interest === p.value ? ' is-active' : ''}`}
                  onClick={() => setValue('interest', p.value, { shouldValidate: true })}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input type="hidden" {...register('interest')} />
            {errors.interest && <p className="gi__error">{errors.interest.message}</p>}
          </div>

          {/* Name */}
          <div className="gi__field">
            <input
              id="gi-name"
              type="text"
              placeholder=" "
              autoComplete="name"
              className="gi__input"
              {...register('name')}
            />
            <label htmlFor="gi-name" className="gi__label">Your name</label>
          </div>
          {errors.name && <p className="gi__error">{errors.name.message}</p>}

          {/* Email */}
          <div className="gi__field">
            <input
              id="gi-email"
              type="email"
              placeholder=" "
              autoComplete="email"
              className="gi__input"
              {...register('email')}
            />
            <label htmlFor="gi-email" className="gi__label">Email</label>
          </div>
          {errors.email && <p className="gi__error">{errors.email.message}</p>}

          {/* Phone (optional) */}
          <div className="gi__field">
            <input
              id="gi-phone"
              type="tel"
              placeholder=" "
              autoComplete="tel"
              className="gi__input"
              {...register('phone')}
            />
            <label htmlFor="gi-phone" className="gi__label">Phone (optional)</label>
          </div>
          {errors.phone && <p className="gi__error">{errors.phone.message}</p>}

          {/* Organization (optional) */}
          <div className="gi__field">
            <input
              id="gi-organization"
              type="text"
              placeholder=" "
              autoComplete="organization"
              className="gi__input"
              {...register('organization')}
            />
            <label htmlFor="gi-organization" className="gi__label">Organization (optional)</label>
          </div>
          {errors.organization && <p className="gi__error">{errors.organization.message}</p>}

          {/* Message */}
          <div className="gi__field gi__field--textarea">
            <textarea
              id="gi-message"
              rows={6}
              placeholder=" "
              className="gi__input gi__input--textarea"
              {...register('message')}
            />
            <label htmlFor="gi-message" className="gi__label">
              {messagePlaceholder}
            </label>
          </div>
          <div className="gi__message-meta">
            {errors.message
              ? <p className="gi__error gi__error--inline">{errors.message.message}</p>
              : <span />}
            <span className="gi__counter" aria-hidden="true">
              {messageLength} / 4000
            </span>
          </div>

          {/* Honeypot: hidden via CSS off-screen. Humans skip it; bots fill it. */}
          <div className="gi__honeypot" aria-hidden="true">
            <label htmlFor="gi-website">Website (leave empty)</label>
            <input
              id="gi-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...register('website')}
            />
          </div>

          {submitError && (
            <p className="gi__error gi__error--banner" role="alert">{submitError}</p>
          )}

          {/* Send block */}
          <div className="gi__send-block">
            <button
              ref={sendRef}
              type="submit"
              className="gi__send"
              disabled={state === 'sending'}
            >
              <span className="gi__send-label">
                {state === 'sending' ? 'Sending' : 'Send'}
              </span>
              <span className="gi__send-arrow" aria-hidden="true">&rarr;</span>
            </button>
            <p className="gi__send-caption">EVERY REPLY IS WRITTEN BY A PERSON</p>
          </div>
        </form>
      </section>

      {/* Close reassurance */}
      <section className="gi__close">
        <div className="gi__close-inner">
          <p className="gi__close-eyebrow">WHAT HAPPENS NEXT</p>
          <p className="gi__close-body">
            Every note reaches the team directly. You will hear back within a week, with next steps.
          </p>
          <div className="gi__close-links">
            <span className="gi__close-link-label">Prefer email?</span>
            <a href="mailto:hello@toolvinementors.com" className="gi__close-link">
              hello@toolvinementors.com
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
