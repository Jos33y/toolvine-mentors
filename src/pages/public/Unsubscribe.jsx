import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import './unsubscribe.css'

// Reached from a link in a reminder email, on whatever device the person
// happened to open their inbox on. No session, so this calls the definer RPC
// with the token and nothing else.
//
// It acts on load rather than asking the person to press a second button.
// They already pressed one, in their inbox, and making them press another is
// how an unsubscribe becomes something people stop trusting.
//
// The RPC is idempotent, so a mail client prefetching the link and then the
// person opening it both land on the same answer.
export function Unsubscribe() {
  const [params] = useSearchParams()
  const token = params.get('token')

  const [state, setState] = useState('working')
  const [name,  setName]  = useState(null)

  useEffect(() => {
    if (!token) { setState('missing'); return undefined }

    let cancelled = false

    supabase
      .rpc('unsubscribe_reminders', { p_token: token })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) { setState('failed'); return }

        // The RPC returns a table, so a single row comes back as an array.
        const row = Array.isArray(data) ? data[0] : data
        if (row?.ok) {
          setName(row.full_name ?? null)
          setState('done')
        } else {
          setState('unknown')
        }
      })

    return () => { cancelled = true }
  }, [token])

  return (
    <section className="unsub">
      <div className="unsub__card">
        {state === 'working' && (
          <p className="unsub__body" aria-busy="true">One moment.</p>
        )}

        {state === 'done' && (
          <>
            <h1 className="unsub__title">
              {name ? `That is done, ${name}.` : 'That is done.'}
            </h1>
            {/* Says what it did not do, because that is the thing somebody
                pressing this is actually worried about. */}
            <p className="unsub__body">
              We will stop sending you reminders about finishing your setup.
            </p>
            <p className="unsub__body">
              Your account stays open, and you will still hear from us when a mentor
              is assigned or a meeting is scheduled. Those are not reminders, and we
              do not think you would want to miss them.
            </p>
            <p className="unsub__note">
              Changed your mind? Turn them back on from your profile at any time.
            </p>
            <div className="unsub__actions">
              <Link className="unsub__cta" to="/profile">Go to your profile</Link>
              <Link className="unsub__link" to="/">Back to the site</Link>
            </div>
          </>
        )}

        {state === 'unknown' && (
          <>
            <h1 className="unsub__title">That link has expired or was mistyped</h1>
            <p className="unsub__body">
              We could not match it to an account, so nothing has changed. If you are
              still getting reminders you would rather not have, sign in and turn them
              off from your profile, or write to us.
            </p>
            <div className="unsub__actions">
              <Link className="unsub__cta" to="/auth/sign-in">Sign in</Link>
              <a className="unsub__link" href="mailto:hello@toolvinementors.com">
                hello@toolvinementors.com
              </a>
            </div>
          </>
        )}

        {state === 'missing' && (
          <>
            <h1 className="unsub__title">Something is missing from that link</h1>
            <p className="unsub__body">
              It arrived without the part that tells us whose reminders to stop. Open
              the link from the email again, or sign in and turn them off from your
              profile.
            </p>
            <div className="unsub__actions">
              <Link className="unsub__cta" to="/auth/sign-in">Sign in</Link>
              <Link className="unsub__link" to="/">Back to the site</Link>
            </div>
          </>
        )}

        {state === 'failed' && (
          <>
            <h1 className="unsub__title">We could not do that just now</h1>
            <p className="unsub__body">
              Nothing has changed. Try the link again in a moment, or write to us and
              we will take you off the list ourselves.
            </p>
            <div className="unsub__actions">
              <a className="unsub__cta" href="mailto:hello@toolvinementors.com">
                hello@toolvinementors.com
              </a>
              <Link className="unsub__link" to="/">Back to the site</Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
