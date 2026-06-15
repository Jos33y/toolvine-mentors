import { useFormContext } from 'react-hook-form'

// All fields here are optional. The schema validates trim().optional() and the
// submit handler converts empty strings to nulls before writing to socials jsonb.

export function Step3Socials() {
  const { register } = useFormContext()

  return (
    <>
      <div className="onbp__field">
        <label className="onbp__label" htmlFor="socialsInstagram">
          Instagram
          <span className="onbp__label-optional">optional</span>
        </label>
        <input
          id="socialsInstagram"
          type="text"
          autoComplete="off"
          className="onbp__input"
          placeholder="@handle or full URL"
          {...register('socialsInstagram')}
        />
      </div>

      <div className="onbp__field">
        <label className="onbp__label" htmlFor="socialsFacebook">
          Facebook
          <span className="onbp__label-optional">optional</span>
        </label>
        <input
          id="socialsFacebook"
          type="text"
          autoComplete="off"
          className="onbp__input"
          placeholder="Profile URL"
          {...register('socialsFacebook')}
        />
      </div>

      <div className="onbp__field">
        <label className="onbp__label" htmlFor="socialsLinkedin">
          LinkedIn
          <span className="onbp__label-optional">optional</span>
        </label>
        <input
          id="socialsLinkedin"
          type="text"
          autoComplete="off"
          className="onbp__input"
          placeholder="Profile URL"
          {...register('socialsLinkedin')}
        />
      </div>

      <div className="onbp__field">
        <label className="onbp__label" htmlFor="socialsOther">
          Other
          <span className="onbp__label-optional">optional</span>
        </label>
        <input
          id="socialsOther"
          type="text"
          autoComplete="off"
          className="onbp__input"
          placeholder="TikTok, Twitter, personal site, etc."
          {...register('socialsOther')}
        />
      </div>
    </>
  )
}
