import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormProvider, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/stores/useAuth'
import { homeFor } from '@/lib/roles'
import { setUserFocus } from '@/lib/userFocus'
import { Step1You } from './Step1You'
import { Step2Role } from './Step2Role'
import { Step3Socials } from './Step3Socials'
import './onboarding.css'

const STEPS = [
  { id: 1, label: 'You',       fields: ['fullName','whatsappPhone','otherPhone','country','location'] },
  { id: 2, label: 'Your role', fields: ['roleIntent','monthlyHours','referralSource'] },
  { id: 3, label: 'Online',    fields: [] }
]

const schema = z.object({
  fullName:       z.string().trim().min(2, 'Please enter your full name'),
  whatsappPhone:  z.string().trim().min(7, 'Please enter your WhatsApp number'),
  otherPhone:     z.string().trim().optional().or(z.literal('')),
  country:        z.string().trim().min(2, 'Please choose your country'),
  location:       z.string().trim().optional().or(z.literal('')),
  roleIntent:     z.enum(['mentor', 'mentee', 'undecided']),
  monthlyHours:   z.coerce.number({ invalid_type_error: 'Please enter a number' })
                    .int('Whole numbers only')
                    .min(1, 'At least one hour per month')
                    .max(200, 'That seems high. Double check.'),
  referralSource: z.string().trim().min(1, 'Please tell us how you found us'),
  focusSeeking:   z.array(z.string()).default([]),
  focusOffering:  z.array(z.string()).default([]),
  socialsInstagram: z.string().trim().optional().or(z.literal('')),
  socialsFacebook:  z.string().trim().optional().or(z.literal('')),
  socialsLinkedin:  z.string().trim().optional().or(z.literal('')),
  socialsOther:     z.string().trim().optional().or(z.literal(''))
})

export function Onboarding() {
  const navigate = useNavigate()
  const profile = useAuth((s) => s.profile)
  const roles   = useAuth((s) => s.roles)
  const loading = useAuth((s) => s.loading)
  const completeOnboarding = useAuth((s) => s.completeOnboarding)

  const [step, setStep]               = useState(1)
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState('')

  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      fullName:        '',
      whatsappPhone:   '',
      otherPhone:      '',
      country:         'Nigeria',
      location:        '',
      roleIntent:      'mentee',
      monthlyHours:    '',
      referralSource:  '',
      focusSeeking:    [],
      focusOffering:   [],
      socialsInstagram:'',
      socialsFacebook: '',
      socialsLinkedin: '',
      socialsOther:    ''
    }
  })

  useEffect(() => {
    if (!profile) return
    if (profile.full_name) form.setValue('fullName', profile.full_name)
    // Carry the role choice from sign-up into onboarding so the user does
    // not see a contradiction. Falls back to 'mentee' only if neither flag
    // is set, which would be unusual.
    form.setValue('roleIntent', deriveRoleIntent(profile))
  }, [profile?.full_name, profile?.role_intent, profile?.role_undecided, form])

  // One-shot: avoid redirecting mid-flow if onboarded flips true later.
  const redirectChecked = useRef(false)
  useEffect(() => {
    if (loading || !profile || roles.length === 0) return
    if (redirectChecked.current) return
    redirectChecked.current = true
    if (profile.onboarded) navigate(homeFor(roles), { replace: true })
  }, [loading, profile, roles, navigate])

  // Only a Finish click flips this; defends against stray submits.
  const finishClickedRef = useRef(false)

  const goNext = async () => {
    const stepFields = STEPS[step - 1].fields
    const ok = stepFields.length === 0 ? true : await form.trigger(stepFields)
    if (!ok) return
    setStep((s) => Math.min(STEPS.length, s + 1))
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const goBack = () => {
    setStep((s) => Math.max(1, s - 1))
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  // Enter advances on intermediate steps; Finish click is the only submit path.
  const handleFormKeyDown = (e) => {
    if (e.key !== 'Enter') return
    if (e.target.tagName === 'TEXTAREA') return
    e.preventDefault()
    if (step < STEPS.length) goNext()
  }

  const handleFinishClick = () => {
    finishClickedRef.current = true
  }

  const onFinalSubmit = async (values) => {
    if (!finishClickedRef.current || step !== STEPS.length) return
    finishClickedRef.current = false

    setSubmitError('')
    setSubmitting(true)
    try {
      const browserTz = (typeof Intl !== 'undefined' && Intl.DateTimeFormat)
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : null

      const payload = {
        full_name:       values.fullName,
        whatsapp_phone:  values.whatsappPhone,
        other_phone:     values.otherPhone || null,
        country:         values.country,
        location:        values.location || null,
        timezone:        browserTz || null,
        monthly_hours:   values.monthlyHours,
        referral_source: values.referralSource,
        role_intent:     values.roleIntent === 'undecided' ? null : values.roleIntent,
        role_undecided:  values.roleIntent === 'undecided',
        socials: {
          instagram: values.socialsInstagram || null,
          facebook:  values.socialsFacebook  || null,
          linkedin:  values.socialsLinkedin  || null,
          other:     values.socialsOther     || null
        }
      }

      // Write focus rows first. If complete_onboarding fails afterwards, the
      // user is not yet onboarded and the rows sit harmless until the retry
      // overwrites them. Pre-onboarded focus rows have no meaning at the
      // pairing layer; admin reads them only after the user is onboarded.
      const userId = profile.id
      await setUserFocus(userId, 'seeking',  values.focusSeeking)
      await setUserFocus(userId, 'offering', values.focusOffering)

      await completeOnboarding(payload)
      navigate(homeFor(roles), { replace: true })
    } catch (err) {
      setSubmitError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !profile) return null

  // Real submit handler only attached on the final step; earlier steps swallow any submit event.
  const onFormSubmit = step === STEPS.length
    ? form.handleSubmit(onFinalSubmit)
    : (e) => e.preventDefault()

  return (
    <section className="onbp">
      <header className="onbp__head">
        <ol className="onbp__steps" aria-label="Onboarding progress">
          {STEPS.map((s) => (
            <li
              key={s.id}
              className={`onbp__step ${step === s.id ? 'is-active' : ''} ${step > s.id ? 'is-done' : ''}`}
              aria-current={step === s.id ? 'step' : undefined}
            >
              <span className="onbp__step-dot">
                {step > s.id ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3 7.5L6 10L11 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : String(s.id).padStart(2, '0')}
              </span>
              <span className="onbp__step-label">{s.label}</span>
            </li>
          ))}
        </ol>

        <h1 className="onbp__title">{titleFor(step)}</h1>
        <p className="onbp__lede">{ledeFor(step)}</p>
      </header>

      {submitError && (
        <div className="onbp__alert onbp__alert--error" role="alert">
          {submitError}
        </div>
      )}

      <FormProvider {...form}>
        <form
          className="onbp__form"
          onSubmit={onFormSubmit}
          onKeyDown={handleFormKeyDown}
          noValidate
        >
          {step === 1 && <Step1You />}
          {step === 2 && <Step2Role />}
          {step === 3 && <Step3Socials />}

          <div className="onbp__nav">
            {step > 1 ? (
              <button
                key="back"
                type="button"
                className="onbp__btn onbp__btn--secondary"
                onClick={goBack}
                disabled={submitting}
              >
                Back
              </button>
            ) : <span aria-hidden="true" />}

            {/* Keys force remount; otherwise React reuses the DOM node and the Continue click resolves as a Finish submit. */}
            {step < STEPS.length ? (
              <button
                key="continue"
                type="button"
                className="onbp__btn onbp__btn--primary"
                onClick={goNext}
              >
                Continue
              </button>
            ) : (
              <button
                key="finish"
                type="submit"
                className="onbp__btn onbp__btn--primary"
                onClick={handleFinishClick}
                disabled={submitting}
              >
                {submitting ? 'Finishing' : 'Finish'}
              </button>
            )}
          </div>
        </form>
      </FormProvider>
    </section>
  )
}

function titleFor(step) {
  if (step === 1) return 'Tell us about you'
  if (step === 2) return 'How you would like to take part'
  return 'Where to find you'
}

// Map profile flags back to the form's roleIntent value. Undecided wins over
// any stored intent because both can be true on a freshly created row.
function deriveRoleIntent(profile) {
  if (!profile) return 'mentee'
  if (profile.role_undecided === true) return 'undecided'
  if (profile.role_intent === 'mentor') return 'mentor'
  if (profile.role_intent === 'mentee') return 'mentee'
  return 'mentee'
}

function ledeFor(step) {
  if (step === 1) return 'A few details so we can match you well and stay in touch.'
  if (step === 2) return 'Pick the closest fit. You can change this with our team later.'
  return 'Optional. Helpful for mentors and admins when you connect.'
}

function friendlyError(err) {
  const msg = (err?.message || '').toLowerCase()
  if (msg.includes('not authenticated'))   return 'Your session has expired. Sign in again to continue.'
  if (msg.includes('required'))            return 'Some details are missing. Go back and complete every required field.'
  if (msg.includes('invalid role_intent')) return 'That role choice was not recognised. Try selecting it again.'
  return 'We could not save your details. Try again, or contact support if it keeps happening.'
}
