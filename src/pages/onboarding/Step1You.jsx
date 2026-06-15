import { useFormContext } from 'react-hook-form'

// Country list intentionally small and ordered for the audience. Lagos-first
// community; UK / US / Canada cover the diaspora; Other catches the rest.
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

export function Step1You() {
  const { register, formState: { errors } } = useFormContext()

  return (
    <>
      <div className="onbp__field">
        <label className="onbp__label" htmlFor="fullName">Full name</label>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          className="onbp__input"
          placeholder="Your full name"
          {...register('fullName')}
        />
        {errors.fullName && <span className="onbp__field-error">{errors.fullName.message}</span>}
      </div>

      <div className="onbp__row onbp__row--2">
        <div className="onbp__field">
          <label className="onbp__label" htmlFor="whatsappPhone">WhatsApp number</label>
          <input
            id="whatsappPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className="onbp__input"
            placeholder="+234 800 000 0000"
            {...register('whatsappPhone')}
          />
          {errors.whatsappPhone && <span className="onbp__field-error">{errors.whatsappPhone.message}</span>}
        </div>

        <div className="onbp__field">
          <label className="onbp__label" htmlFor="otherPhone">
            Other phone
            <span className="onbp__label-optional">optional</span>
          </label>
          <input
            id="otherPhone"
            type="tel"
            inputMode="tel"
            className="onbp__input"
            placeholder="Backup number"
            {...register('otherPhone')}
          />
        </div>
      </div>

      <div className="onbp__row onbp__row--2">
        <div className="onbp__field">
          <label className="onbp__label" htmlFor="country">Country</label>
          <select
            id="country"
            className="onbp__select"
            {...register('country')}
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {errors.country && <span className="onbp__field-error">{errors.country.message}</span>}
        </div>

        <div className="onbp__field">
          <label className="onbp__label" htmlFor="location">
            State or city
            <span className="onbp__label-optional">optional</span>
          </label>
          <input
            id="location"
            type="text"
            autoComplete="address-level2"
            className="onbp__input"
            placeholder="Lagos, Ibadan, etc."
            {...register('location')}
          />
        </div>
      </div>
    </>
  )
}
