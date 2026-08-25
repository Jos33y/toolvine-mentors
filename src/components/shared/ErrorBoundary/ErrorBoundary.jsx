import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import { homeFor } from '@/lib/roles'
import './errorBoundary.css'

// Router-level error screen. Without an errorElement, React Router falls back
// to its own, which prints the stack trace and the source path to whoever is
// looking. That is a visitor reading our file layout and being given nothing
// to do about it.
//
// Two variants. 'page' renders inside the app shell, mounted on a pathless
// route so a broken page swaps the outlet and leaves the sidebar, topbar and
// bell standing. 'full' is the last resort for anything that escapes, or for
// the shell itself failing to load.
//
// Caveat worth knowing: this catches errors thrown while rendering, the same
// as any React boundary. An error inside a click handler or an awaited call
// does not reach here, which is why the mutation paths carry their own
// try/catch and report in place.
export function ErrorBoundary({ variant = 'full' }) {
  const error = useRouteError()
  const roles = useAuth((s) => s.roles)
  const session = useAuth((s) => s.session)

  const home = session ? homeFor(roles) : '/'
  const stale = isStaleChunk(error)

  const { title, body, action } = copyFor(error, stale)

  return (
    <div className={'errb errb--' + variant} role="alert">
      <div className="errb__inner">
        <p className="errb__eyebrow">{stale ? 'New version' : 'Something broke'}</p>
        <h1 className="errb__title">{title}</h1>
        <p className="errb__body">{body}</p>

        <div className="errb__actions">
          <button
            type="button"
            className="errb__btn errb__btn--primary"
            onClick={() => window.location.reload()}
          >
            {action}
          </button>
          <Link to={home} className="errb__btn errb__btn--ghost">
            {session ? 'Back to dashboard' : 'Back to the home page'}
          </Link>
        </div>

        <p className="errb__foot">
          If it keeps happening, tell us at{' '}
          <a href="mailto:support@toolvinementors.com" className="errb__link">
            support@toolvinementors.com
          </a>
          .
        </p>

        {/* Kept in full, and only while developing. The diagnosis should not
            be the price of not showing a stack trace to a member. */}
        {import.meta.env.DEV && (
          <details className="errb__detail">
            <summary className="errb__detail-summary">Technical detail</summary>
            <pre className="errb__detail-body">{detailOf(error)}</pre>
          </details>
        )}
      </div>
    </div>
  )
}

// A deploy replaces the hashed chunk files, so a tab left open overnight asks
// for a module that no longer exists. It reads as a crash and the fix is a
// reload, so it gets its own wording rather than an apology.
function isStaleChunk(error) {
  const message = String(error?.message ?? error ?? '')
  return /dynamically imported module|Importing a module script failed|Loading chunk|Failed to fetch/i.test(message)
}

function copyFor(error, stale) {
  if (stale) {
    return {
      title: 'Toolvine has been updated',
      body:  'This page was open while a new version went out. Reloading picks it up. Nothing you have saved is affected.',
      action: 'Reload'
    }
  }

  if (isRouteErrorResponse(error) && error.status === 404) {
    return {
      title: 'We could not find that page',
      body:  'The link may be out of date, or the thing it pointed at may have been archived.',
      action: 'Try again'
    }
  }

  if (isRouteErrorResponse(error) && error.status === 403) {
    return {
      title: 'That page is not yours to open',
      body:  'Your account does not have access to it. If you think it should, an admin can check your roles.',
      action: 'Try again'
    }
  }

  return {
    title: 'This page did not load',
    body:  'Something went wrong on our side rather than yours. Nothing you had saved is lost.',
    action: 'Try again'
  }
}

function detailOf(error) {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}\n\n${JSON.stringify(error.data, null, 2)}`
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n\n${error.stack ?? ''}`
  }
  return String(error)
}
