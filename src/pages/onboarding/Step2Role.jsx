import { useFormContext, useWatch } from 'react-hook-form'
import { useCategories } from '@/hooks/useCategories'
import { Icon } from '@/components/shared/Icon/Icon'

const ROLE_OPTIONS = [
  {
    value: 'mentor',
    name: 'Mentor',
    desc: 'You guide one or more mentees. Meet monthly. Share what life has taught you.'
  },
  {
    value: 'mentee',
    name: 'Mentee',
    desc: 'You are paired with a mentor for a season. Meet monthly. Bring your questions.'
  },
  {
    value: 'undecided',
    name: 'Not sure yet',
    desc: 'Our team will reach out to help you decide. No pressure either way.'
  }
]

const REFERRAL = [
  { value: '',             label: 'Choose one', disabled: true },
  { value: 'WhatsApp',     label: 'WhatsApp' },
  { value: 'Friend',       label: 'A friend or colleague' },
  { value: 'Church',       label: 'Church or fellowship' },
  { value: 'Social media', label: 'Social media' },
  { value: 'Vinethoughts', label: 'Vinethoughts publication' },
  { value: 'Other',        label: 'Other' }
]

export function Step2Role() {
  const { register, control, setValue, formState: { errors } } = useFormContext()
  const role     = useWatch({ control, name: 'roleIntent' })
  const seeking  = useWatch({ control, name: 'focusSeeking' })  ?? []
  const offering = useWatch({ control, name: 'focusOffering' }) ?? []

  const { categories, loading: catLoading } = useCategories()

  const showSeeking  = role === 'mentee' || role === 'undecided'
  const showOffering = role === 'mentor' || role === 'undecided'

  const toggle = (kind, id) => {
    const current = kind === 'seeking' ? seeking : offering
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id]
    const field = kind === 'seeking' ? 'focusSeeking' : 'focusOffering'
    setValue(field, next, { shouldDirty: true, shouldTouch: true })
  }

  return (
    <>
      <div className="onbp__field">
        <span className="onbp__label" id="onbp-role-label">I would like to join as</span>
        <div className="onbp__roles" role="radiogroup" aria-labelledby="onbp-role-label">
          {ROLE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`onbp__role ${role === opt.value ? 'onbp__role--active' : ''}`}
            >
              <input
                type="radio"
                value={opt.value}
                className="onbp__role-input"
                {...register('roleIntent')}
              />
              <div className="onbp__role-head">
                <span className="onbp__role-name">{opt.name}</span>
                <span className="onbp__role-check" aria-hidden="true">
                  {role === opt.value && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6.5L4.5 9L10 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              </div>
              <p className="onbp__role-desc">{opt.desc}</p>
            </label>
          ))}
        </div>
        {errors.roleIntent && <span className="onbp__field-error">{errors.roleIntent.message}</span>}
      </div>

      {showSeeking && (
        <FocusField
          kind="seeking"
          label="What do you want guidance on?"
          hint="Pick one or more. You can change this with our team later."
          categories={categories}
          loading={catLoading}
          selectedIds={seeking}
          onToggle={(id) => toggle('seeking', id)}
        />
      )}

      {showOffering && (
        <FocusField
          kind="offering"
          label="What areas can you offer mentorship in?"
          hint="Pick one or more. Helps us pair you with the right mentees."
          categories={categories}
          loading={catLoading}
          selectedIds={offering}
          onToggle={(id) => toggle('offering', id)}
        />
      )}

      <div className="onbp__row onbp__row--2">
        <div className="onbp__field">
          <label className="onbp__label" htmlFor="monthlyHours">Hours per month</label>
          <input
            id="monthlyHours"
            type="number"
            inputMode="numeric"
            min="1"
            max="200"
            className="onbp__input"
            placeholder="2"
            {...register('monthlyHours')}
          />
          {errors.monthlyHours
            ? <span className="onbp__field-error">{errors.monthlyHours.message}</span>
            : <span className="onbp__field-hint">Most pairings meet 1 to 4 hours a month.</span>}
        </div>

        <div className="onbp__field">
          <label className="onbp__label" htmlFor="referralSource">How you found us</label>
          <select
            id="referralSource"
            className="onbp__select"
            {...register('referralSource')}
          >
            {REFERRAL.map((r) => (
              <option key={r.value || 'placeholder'} value={r.value} disabled={r.disabled}>
                {r.label}
              </option>
            ))}
          </select>
          {errors.referralSource && <span className="onbp__field-error">{errors.referralSource.message}</span>}
        </div>
      </div>
    </>
  )
}

function FocusField({ kind, label, hint, categories, loading, selectedIds, onToggle }) {
  const groupLabelId = `onbp-focus-${kind}-label`

  return (
    <div className="onbp__field">
      <span className="onbp__label" id={groupLabelId}>
        {label}
        <span className="onbp__label-optional">Optional</span>
      </span>

      {loading ? (
        <div className="onbp__chips-skeleton" aria-hidden="true" />
      ) : (
        <div className="onbp__chips" role="group" aria-labelledby={groupLabelId}>
          {categories.map((c) => {
            const active = selectedIds.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggle(c.id)}
                className={`onbp__chip ${active ? 'onbp__chip--active' : ''}`}
                aria-pressed={active}
              >
                {active && (
                  <Icon name="check" size={12} strokeWidth={2.25} className="onbp__chip-check" />
                )}
                {c.label}
              </button>
            )
          })}
        </div>
      )}

      <span className="onbp__field-hint">{hint}</span>
    </div>
  )
}
