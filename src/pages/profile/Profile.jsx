import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormProvider, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/stores/useAuth'
import { Logo } from '@/components/shared/Logo/Logo'
import './profile.css'

const COUNTRIES = [
  'Nigeria',
  'Ghana',
  'Kenya',
  'South Africa',
  'United Kingdom',
  'United States',
  'Canada',
  'Other'
]

const TIMEZONES = [
  'Africa/Lagos',
  'Africa/Accra',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Toronto',
  'Asia/Dubai',
  'Asia/Singapore'
]

const schema = z.object({
  fullName:        z.string().trim().min(2, 'Please enter your full name'),
  whatsappPhone:   z.string().trim().min(7, 'Please enter your WhatsApp number'),
  otherPhone:      z.string().trim().optional().or(z.literal('')),
  country:         z.string().trim().min(2, 'Please choose your country'),
  location:        z.string().trim().optional().or(z.literal('')),
  timezone:        z.string().trim().min(1, 'Please choose your timezone'),
  monthlyHours:    z.coerce.number({ invalid_type_error: 'Please enter a number' })
                     .int('Whole numbers only')
                     .min(1, 'At least one hour per month')
                     .max(200, 'That seems high. Double check.'),
  socialsInstagram: z.string().trim().optional().or(z.literal('')),
  socialsFacebook:  z.string().trim().optional().or(z.literal('')),
  socialsLinkedin:  z.string().trim().optional().or(z.literal('')),
  socialsOther:     z.string().trim().optional().or(z.literal(''))
})

export function Profile() {
  const navigate = useNavigate()
  const profile  = useAuth((s) => s.profile)
  const roles    = useAuth((s) => s.roles)
  const loading  = useAuth((s) => s.loading)
  const updateProfile      = useAuth((s) => s.updateProfile)
  const updateProfilePhoto = useAuth((s) => s.updateProfilePhoto)
  const removeProfilePhoto = useAuth((s) => s.removeProfilePhoto)

  // One-shot redirect so a mid-edit profile flip cannot yank us out.
  const redirectChecked = useRef(false)
  useEffect(() => {
    if (loading || !profile) return
    if (redirectChecked.current) return
    redirectChecked.current = true
    if (!profile.onboarded) navigate('/onboarding', { replace: true })
  }, [loading, profile, navigate])

  const defaults = useMemo(() => deriveDefaults(profile), [profile?.id])

  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: defaults
  })

  useEffect(() => {
    if (!profile) return
    form.reset(deriveDefaults(profile))
  }, [profile?.id])

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [saved, setSaved] = useState(false)
  const [photoBusy,  setPhotoBusy]  = useState(false)
  const [photoError, setPhotoError] = useState('')
  const fileInputRef = useRef(null)
  // Only a Save click flips this; defends against unrelated submit events.
  const saveClickedRef = useRef(false)
  const browserTz = useMemo(detectBrowserTz, [])

  const handleSaveClick = () => { saveClickedRef.current = true }

  const onSubmit = async (values) => {
    if (!saveClickedRef.current) return
    saveClickedRef.current = false
    setSubmitError('')
    setSubmitting(true)
    try {
      const payload = {
        full_name:      values.fullName,
        whatsapp_phone: values.whatsappPhone,
        other_phone:    values.otherPhone || null,
        country:        values.country,
        location:       values.location || null,
        timezone:       values.timezone,
        monthly_hours:  values.monthlyHours,
        socials: {
          instagram: values.socialsInstagram || null,
          facebook:  values.socialsFacebook  || null,
          linkedin:  values.socialsLinkedin  || null,
          other:     values.socialsOther     || null
        }
      }
      await updateProfile(payload)
      form.reset(values)
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } catch (err) {
      setSubmitError(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDiscard = () => {
    if (!profile) return
    form.reset(deriveDefaults(profile))
    setSubmitError('')
  }

  const handlePhotoChoose = () => fileInputRef.current?.click()

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoBusy(true)
    setPhotoError('')
    try {
      await updateProfilePhoto(file)
    } catch (err) {
      setPhotoError(err?.message || 'Could not upload the photo. Try again.')
    } finally {
      setPhotoBusy(false)
    }
  }

  const handlePhotoRemove = async () => {
    setPhotoBusy(true)
    setPhotoError('')
    try {
      await removeProfilePhoto()
    } catch (err) {
      setPhotoError(err?.message || 'Could not remove the photo. Try again.')
    } finally {
      setPhotoBusy(false)
    }
  }

  if (loading || !profile) return null
  if (!profile.onboarded) return null

  const isDirty  = form.formState.isDirty
  const initials = computeInitials(profile.full_name)
  const memberOn = formatMemberSince(profile.created_at)
  const verified = profile.email_verified === true
  const tzDiffers = browserTz && browserTz !== form.watch('timezone')

  const locationText = [profile.location, profile.country].filter(Boolean).join(', ') || profile.country
  const hoursText    = profile.monthly_hours ? `${profile.monthly_hours} hours / month` : null

  return (
    <section className="pfp">
      <header className="pfp__head">
        <p className="pfp__eyebrow">Your account</p>
        <h1 className="pfp__title">Profile</h1>
        <p className="pfp__lede">Edit your details and how the community reaches you.</p>
      </header>

      <div className="pfp__layout">
        <aside className="pfp__identity" aria-label="Identity">
          <div className="pfp__id-card">
            <span className="pfp__id-watermark" aria-hidden="true">
              <Logo variant="mark-mono" size={140} />
            </span>

            <div className="pfp__avatar-block">
              <div className="pfp__avatar">
                {profile.photo_url
                  ? <img src={profile.photo_url} alt="" className="pfp__avatar-img" />
                  : <span className="pfp__avatar-initials" aria-hidden="true">{initials}</span>}
                {photoBusy && <span className="pfp__avatar-busy" aria-hidden="true" />}
              </div>

              {profile.photo_url ? (
                <div className="pfp__photo-actions">
                  <button
                    type="button"
                    className="pfp__photo-link"
                    onClick={handlePhotoChoose}
                    disabled={photoBusy}
                  >
                    Change photo
                  </button>
                  <span className="pfp__photo-sep" aria-hidden="true">·</span>
                  <button
                    type="button"
                    className="pfp__photo-link pfp__photo-link--danger"
                    onClick={handlePhotoRemove}
                    disabled={photoBusy}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="pfp__photo-upload"
                  onClick={handlePhotoChoose}
                  disabled={photoBusy}
                >
                  <CameraIcon />
                  <span>{photoBusy ? 'Uploading' : 'Upload a photo'}</span>
                </button>
              )}

              {photoError && <p className="pfp__photo-error" role="alert">{photoError}</p>}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="pfp__file-input"
                onChange={handlePhotoChange}
                aria-hidden="true"
                tabIndex={-1}
              />
            </div>

            <div className="pfp__id-text">
              <h2 className="pfp__id-name">{profile.full_name}</h2>

              <div className="pfp__id-email">
                <span className="pfp__id-email-addr">{profile.email}</span>
                {verified && <span className="pfp__verified" aria-label="Email verified">Verified</span>}
              </div>

              <div className="pfp__id-roles" aria-label="Roles">
                {profile.role_undecided ? (
                  <span className="pfp__role-pending">Role pending</span>
                ) : (
                  roleBadgesFor(roles).map((r) => (
                    <span key={r.key} className={`pfp__badge pfp__badge--${r.tone}`}>{r.label}</span>
                  ))
                )}
              </div>
            </div>

            {(memberOn || locationText || hoursText) && (
              <ul className="pfp__id-stats" aria-label="Quick facts">
                {memberOn && (
                  <li className="pfp__id-stat">
                    <CalendarIcon />
                    <span>Joined {memberOn}</span>
                  </li>
                )}
                {locationText && (
                  <li className="pfp__id-stat">
                    <PinIcon />
                    <span>{locationText}</span>
                  </li>
                )}
                {hoursText && (
                  <li className="pfp__id-stat">
                    <ClockIcon />
                    <span>{hoursText}</span>
                  </li>
                )}
              </ul>
            )}

            <p className="pfp__id-note">
              Role changes are handled by our team. Reach out at{' '}
              <a className="pfp__id-link" href="mailto:admin@toolvinementors.com">admin@toolvinementors.com</a>.
            </p>
          </div>
        </aside>

        <FormProvider {...form}>
          <form
            className="pfp__form"
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            <section className="pfp__section" aria-labelledby="pfp-sec-you">
              <header className="pfp__section-head">
                <p className="pfp__section-anchor">
                  <span className="pfp__section-num">01</span>
                  <span className="pfp__section-sep" aria-hidden="true">·</span>
                  <span className="pfp__section-tag">Personal information</span>
                </p>
                <h3 className="pfp__section-title" id="pfp-sec-you">How we reach you and where you sit</h3>
              </header>

              <div className="pfp__section-body">
                <div className="pfp__field">
                  <label className="pfp__label" htmlFor="fullName">Full name</label>
                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    className="pfp__input"
                    {...form.register('fullName')}
                  />
                  {form.formState.errors.fullName && (
                    <span className="pfp__field-error">{form.formState.errors.fullName.message}</span>
                  )}
                </div>

                <div className="pfp__row pfp__row--2">
                  <div className="pfp__field">
                    <label className="pfp__label" htmlFor="whatsappPhone">WhatsApp number</label>
                    <input
                      id="whatsappPhone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      className="pfp__input"
                      {...form.register('whatsappPhone')}
                    />
                    {form.formState.errors.whatsappPhone && (
                      <span className="pfp__field-error">{form.formState.errors.whatsappPhone.message}</span>
                    )}
                  </div>

                  <div className="pfp__field">
                    <label className="pfp__label" htmlFor="otherPhone">
                      Other phone
                      <span className="pfp__label-optional">optional</span>
                    </label>
                    <input
                      id="otherPhone"
                      type="tel"
                      inputMode="tel"
                      className="pfp__input"
                      {...form.register('otherPhone')}
                    />
                  </div>
                </div>

                <div className="pfp__row pfp__row--2">
                  <div className="pfp__field">
                    <label className="pfp__label" htmlFor="country">Country</label>
                    <select id="country" className="pfp__select" {...form.register('country')}>
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {form.formState.errors.country && (
                      <span className="pfp__field-error">{form.formState.errors.country.message}</span>
                    )}
                  </div>

                  <div className="pfp__field">
                    <label className="pfp__label" htmlFor="location">
                      State or city
                      <span className="pfp__label-optional">optional</span>
                    </label>
                    <input
                      id="location"
                      type="text"
                      autoComplete="address-level2"
                      className="pfp__input"
                      {...form.register('location')}
                    />
                  </div>
                </div>

                <div className="pfp__row pfp__row--2">
                  <div className="pfp__field">
                    <label className="pfp__label" htmlFor="timezone">Timezone</label>
                    <select id="timezone" className="pfp__select" {...form.register('timezone')}>
                      {buildTimezoneOptions(profile.timezone).map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                    {tzDiffers && (
                      <button
                        type="button"
                        className="pfp__inline-link"
                        onClick={() => form.setValue('timezone', browserTz, { shouldDirty: true })}
                      >
                        Use this browser ({browserTz})
                      </button>
                    )}
                    {form.formState.errors.timezone && (
                      <span className="pfp__field-error">{form.formState.errors.timezone.message}</span>
                    )}
                  </div>

                  <div className="pfp__field">
                    <label className="pfp__label" htmlFor="monthlyHours">Hours per month</label>
                    <input
                      id="monthlyHours"
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="200"
                      className="pfp__input"
                      {...form.register('monthlyHours')}
                    />
                    {form.formState.errors.monthlyHours
                      ? <span className="pfp__field-error">{form.formState.errors.monthlyHours.message}</span>
                      : <span className="pfp__field-hint">Most pairings meet 1 to 4 hours a month.</span>}
                  </div>
                </div>
              </div>
            </section>

            <section className="pfp__section" aria-labelledby="pfp-sec-online">
              <header className="pfp__section-head">
                <p className="pfp__section-anchor">
                  <span className="pfp__section-num">02</span>
                  <span className="pfp__section-sep" aria-hidden="true">·</span>
                  <span className="pfp__section-tag">Online presence</span>
                </p>
                <h3 className="pfp__section-title" id="pfp-sec-online">Where mentors and admins can find you</h3>
                <p className="pfp__section-lede">All optional. Adds context when you connect.</p>
              </header>

              <div className="pfp__section-body">
                <div className="pfp__row pfp__row--2">
                  <div className="pfp__field">
                    <label className="pfp__label" htmlFor="socialsInstagram">
                      Instagram
                      <span className="pfp__label-optional">optional</span>
                    </label>
                    <input
                      id="socialsInstagram"
                      type="text"
                      className="pfp__input"
                      placeholder="@handle or full URL"
                      {...form.register('socialsInstagram')}
                    />
                  </div>
                  <div className="pfp__field">
                    <label className="pfp__label" htmlFor="socialsFacebook">
                      Facebook
                      <span className="pfp__label-optional">optional</span>
                    </label>
                    <input
                      id="socialsFacebook"
                      type="text"
                      className="pfp__input"
                      placeholder="Profile URL"
                      {...form.register('socialsFacebook')}
                    />
                  </div>
                </div>

                <div className="pfp__row pfp__row--2">
                  <div className="pfp__field">
                    <label className="pfp__label" htmlFor="socialsLinkedin">
                      LinkedIn
                      <span className="pfp__label-optional">optional</span>
                    </label>
                    <input
                      id="socialsLinkedin"
                      type="text"
                      className="pfp__input"
                      placeholder="Profile URL"
                      {...form.register('socialsLinkedin')}
                    />
                  </div>
                  <div className="pfp__field">
                    <label className="pfp__label" htmlFor="socialsOther">
                      Other
                      <span className="pfp__label-optional">optional</span>
                    </label>
                    <input
                      id="socialsOther"
                      type="text"
                      className="pfp__input"
                      placeholder="TikTok, Twitter, personal site"
                      {...form.register('socialsOther')}
                    />
                  </div>
                </div>
              </div>
            </section>

            {submitError && (
              <div className="pfp__alert pfp__alert--error" role="alert">{submitError}</div>
            )}

            {(isDirty || saved) && (
              <div
                className={`pfp__savebar ${saved ? 'pfp__savebar--saved' : ''}`}
                role="region"
                aria-label="Unsaved changes"
              >
                <div className="pfp__savebar-msg">
                  <span className="pfp__savebar-dot" aria-hidden="true" />
                  <span>{saved ? 'Saved' : 'Unsaved changes'}</span>
                </div>
                <div className="pfp__savebar-actions">
                  <button
                    type="button"
                    className="pfp__btn pfp__btn--secondary"
                    onClick={handleDiscard}
                    disabled={submitting}
                  >
                    Discard
                  </button>
                  <button
                    key="save"
                    type="submit"
                    className="pfp__btn pfp__btn--primary"
                    onClick={handleSaveClick}
                    disabled={submitting}
                  >
                    {submitting ? 'Saving' : saved ? 'Saved' : 'Save changes'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </FormProvider>
      </div>
    </section>
  )
}

/* ----- inline icons ----- */

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="pfp__stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg className="pfp__stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-7.3-7-12a7 7 0 1 1 14 0c0 4.7-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="pfp__stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  )
}

/* ----- helpers ----- */

function deriveDefaults(profile) {
  const s = (profile?.socials && typeof profile.socials === 'object') ? profile.socials : {}
  return {
    fullName:        profile?.full_name        ?? '',
    whatsappPhone:   profile?.whatsapp_phone   ?? '',
    otherPhone:      profile?.other_phone      ?? '',
    country:         profile?.country          ?? 'Nigeria',
    location:        profile?.location         ?? '',
    timezone:        profile?.timezone         ?? detectBrowserTz() ?? 'Africa/Lagos',
    monthlyHours:    profile?.monthly_hours    ?? '',
    socialsInstagram: s.instagram ?? '',
    socialsFacebook:  s.facebook  ?? '',
    socialsLinkedin:  s.linkedin  ?? '',
    socialsOther:     s.other     ?? ''
  }
}

function detectBrowserTz() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

function buildTimezoneOptions(current) {
  const set = new Set(TIMEZONES)
  if (current) set.add(current)
  return Array.from(set).sort()
}

function computeInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last  = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

function formatMemberSince(iso) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(iso))
  } catch {
    return ''
  }
}

function roleBadgesFor(roles) {
  const order = ['admin', 'mentor', 'mentee']
  return order
    .filter((r) => roles.includes(r))
    .map((r) => ({
      key: r,
      label: r[0].toUpperCase() + r.slice(1),
      tone: r === 'admin' ? 'admin' : r === 'mentor' ? 'mentor' : 'mentee'
    }))
}

function friendlyError(err) {
  const msg = (err?.message || '').toLowerCase()
  if (msg.includes('not authenticated'))    return 'Your session has expired. Sign in again to continue.'
  if (msg.includes('finish onboarding'))    return 'Finish onboarding before editing your profile.'
  if (msg.includes('required'))             return 'Some details are missing. Check the required fields and try again.'
  return 'We could not save your changes. Try again, or contact support if it keeps happening.'
}
