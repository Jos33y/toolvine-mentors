import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { IOSInstallSteps } from '@/components/shared/InstallBanner/IOSInstallSteps'
import './installCard.css'

// Dashboard variant of the install prompt. No engagement gate — the user
// reaching their dashboard is itself the signal. Same trigger logic as the
// marketing banner: Android fires the deferred prompt; iOS opens the steps
// overlay. Hides itself once installed or dismissed.
export function InstallCard() {
  const { canShow, iosOpen, closeIos, trigger, dismiss } = useInstallPrompt({
    requireEngagement: false
  })

  return (
    <>
      {canShow && (
        <article className="install-card">
          <button
            type="button"
            className="install-card__close"
            onClick={dismiss}
            aria-label="Dismiss"
          >
            <CloseIcon />
          </button>

          <div className="install-card__icon" aria-hidden="true">
            <img src="/app-icon-192.png" alt="" width="48" height="48" />
          </div>

          <div className="install-card__body">
            <h3 className="install-card__title">Install ToolVine</h3>
            <p className="install-card__text">
              Add the app to your home screen for quicker access. Stays signed in across visits.
            </p>
          </div>

          <button
            type="button"
            className="install-card__cta"
            onClick={trigger}
          >
            Install
          </button>
        </article>
      )}
      <IOSInstallSteps open={iosOpen} onClose={closeIos} />
    </>
  )
}

function CloseIcon() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
