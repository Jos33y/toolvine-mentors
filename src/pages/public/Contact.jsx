import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contactSchema, submitContactForm } from '@/lib/contact'
import { Logo } from '@/components/shared/Logo/Logo'
import './Contact.css'

/* ============ Config ============ */

const SUBJECTS = [
  { value: 'general',        label: 'General' },
  { value: 'partnership',    label: 'Partnership' },
  { value: 'press_speaking', label: 'Press & speaking' }
]

const CHANNELS = [
  {
    label: 'General questions',
    email: 'hello@toolvinementors.com',
    description: 'Our team reads everything sent here.'
  },
  {
    label: 'Privacy and data',
    email: 'privacy@toolvinementors.com',
    description: 'For data requests, or questions about how we hold your information.'
  },
  {
    label: 'Safeguarding',
    email: 'safeguarding@toolvinementors.com',
    description: 'Concerns about conduct on or off the platform. Reaches the admin team directly.'
  }
]

const SOCIALS = [
  { handle: '@toolvine_mentors',            url: 'https://instagram.com/toolvine_mentors' },
  { handle: '@toolvine_mentors_initiative', url: 'https://instagram.com/toolvine_mentors_initiative' }
]

/* Minimum elapsed ms between form mount and submit. Anything faster is a bot. */
const MIN_SUBMIT_MS = 2000

/* ============ Component ============ */

export function Contact() {
  const [state, setState] = useState('idle')           // 'idle' | 'sending' | 'sent'
  const [submitError, setSubmitError] = useState('')
  const mountTimeRef = useRef(Date.now())

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      subject: 'general',
      name: '',
      email: '',
      message: '',
      website: ''                                       // honeypot
    }
  })

  const subject = watch('subject')
  const messageLength = (watch('message') ?? '').length

  const onSubmit = async (values) => {
    /* Bot checks: silent fake success so spammers do not learn what tripped them. */
    const honeypot = (getValues('website') || '').trim()
    const elapsed = Date.now() - mountTimeRef.current
    if (honeypot || elapsed < MIN_SUBMIT_MS) {
      setState('sent')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitError('')
    setState('sending')
    try {
      await submitContactForm(values)
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

  /* ============ Success takeover: centered ceremonial moment ============ */
  if (state === 'sent') {
    return (
      <div className="contact">
        <div className="contact__atmosphere" aria-hidden="true" />

        <section className="contact__sent" aria-live="polite">
          {/* Vesica seal centered behind the type: brand signature, embossed feel. */}
          <div className="contact__sent-seal" aria-hidden="true">
            <Logo variant="mark" size={420} />
          </div>

          <p className="contact__sent-asterism" aria-hidden="true">⁂</p>
          <p className="contact__sent-eyebrow">RECEIVED</p>
          <h1 className="contact__sent-line">
            <span className="contact__sent-line-a">We have</span>
            <em className="contact__sent-line-b">your note.</em>
          </h1>
          <p className="contact__sent-meta">
            A reply will reach you within two working days.
            Until then, take a look around.
          </p>
          <div className="contact__sent-actions">
            <Link to="/programs" className="contact__sent-primary">
              Explore programs
              <span aria-hidden="true">&rarr;</span>
            </Link>
            <button type="button" className="contact__sent-back" onClick={resetForm}>
              Send another
            </button>
          </div>
        </section>
      </div>
    )
  }

  /* ============ Normal page ============ */
  return (
    <div className="contact">
      <div className="contact__atmosphere" aria-hidden="true" />

      {/* Hero */}
      <header className="contact__hero">
        <div className="contact__watermark" aria-hidden="true">
          <Logo variant="mark" size={400} />
        </div>

        <p className="contact__eyebrow">CONTACT</p>
        <h1 className="contact__title">
          <span className="contact__title-line">Begin a</span>
          <em className="contact__title-italic">conversation.</em>
        </h1>
        <p className="contact__intro">
          Whether you are considering joining, partnering, or simply curious,
          write to us. Someone from our team replies within two working days.
        </p>
        <p className="contact__meta">
          TYPICAL RESPONSE&nbsp;&nbsp;&middot;&nbsp;&nbsp;2 WORKING DAYS
        </p>
      </header>

      {/* Architectural divider */}
      <div className="contact__divider" aria-hidden="true">
        <span className="contact__divider-rule" />
        <span className="contact__divider-mark">⁂</span>
        <span className="contact__divider-rule" />
      </div>

      {/* Body */}
      <section className="contact__body">

        {/* Form column */}
        <div className="contact__form-col">
          <form className="contact__form" onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* Subject pills */}
            <div className="contact__subject" role="radiogroup" aria-label="What is this about?">
              <p className="contact__subject-label">This is about</p>
              <div className="contact__subject-pills">
                {SUBJECTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={subject === s.value}
                    className={`contact__pill${subject === s.value ? ' is-active' : ''}`}
                    onClick={() => setValue('subject', s.value, { shouldValidate: true })}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <input type="hidden" {...register('subject')} />

            {/* Name */}
            <div className="contact__field">
              <input
                id="contact-name"
                type="text"
                placeholder=" "
                autoComplete="name"
                className="contact__input"
                {...register('name')}
              />
              <label htmlFor="contact-name" className="contact__label">Your name</label>
            </div>
            {errors.name && <p className="contact__error">{errors.name.message}</p>}

            {/* Email */}
            <div className="contact__field">
              <input
                id="contact-email"
                type="email"
                placeholder=" "
                autoComplete="email"
                className="contact__input"
                {...register('email')}
              />
              <label htmlFor="contact-email" className="contact__label">Email</label>
            </div>
            {errors.email && <p className="contact__error">{errors.email.message}</p>}

            {/* Message */}
            <div className="contact__field contact__field--textarea">
              <textarea
                id="contact-message"
                rows={6}
                placeholder=" "
                className="contact__input contact__input--textarea"
                {...register('message')}
              />
              <label htmlFor="contact-message" className="contact__label">Your message</label>
            </div>
            <div className="contact__message-meta">
              {errors.message
                ? <p className="contact__error contact__error--inline">{errors.message.message}</p>
                : <span />}
              <span className="contact__counter" aria-hidden="true">
                {messageLength} / 4000
              </span>
            </div>

            {/* Honeypot: hidden via CSS off-screen. Humans skip it; bots fill it. */}
            <div className="contact__honeypot" aria-hidden="true">
              <label htmlFor="contact-website">Website (leave empty)</label>
              <input
                id="contact-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                {...register('website')}
              />
            </div>

            {submitError && (
              <p className="contact__error contact__error--banner" role="alert">{submitError}</p>
            )}

            {/* Send block */}
            <div className="contact__send-block">
              <button
                ref={sendRef}
                type="submit"
                className="contact__send"
                disabled={state === 'sending'}
              >
                <span className="contact__send-label">
                  {state === 'sending' ? 'Sending' : 'Send'}
                </span>
                <span className="contact__send-arrow" aria-hidden="true">&rarr;</span>
              </button>
              <p className="contact__send-caption">EVERY REPLY IS WRITTEN BY A PERSON</p>
            </div>
          </form>
        </div>

        {/* Channels column */}
        <aside className="contact__channels" aria-label="Other ways to reach us">
          <p className="contact__channels-eyebrow">DIRECT LINES</p>

          {CHANNELS.map((c) => (
            <div className="contact__channel" key={c.email}>
              <p className="contact__channel-label">{c.label}</p>
              <a className="contact__channel-email" href={`mailto:${c.email}`}>
                {c.email}
              </a>
              <p className="contact__channel-desc">{c.description}</p>
            </div>
          ))}

          <div className="contact__elsewhere">
            <p className="contact__elsewhere-label">Find us elsewhere</p>
            {SOCIALS.map((s) => (
              <a
                key={s.handle}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="contact__social"
              >
                {s.handle}
              </a>
            ))}
          </div>
        </aside>
      </section>
    </div>
  )
}
