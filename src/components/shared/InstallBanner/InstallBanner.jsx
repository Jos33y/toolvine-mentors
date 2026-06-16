import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { IOSInstallSteps } from './IOSInstallSteps'
import './installBanner.css'

// Marketing-surface install banner. Mounts inside the Home page so visitors
// see it after engagement. Both Android and iOS render the same Install
// label; iOS taps open the steps overlay, Android taps fire the deferred
// Chrome prompt directly.
export function InstallBanner() {
  const { canShow, iosOpen, closeIos, trigger, dismiss } = useInstallPrompt({
    requireEngagement: true
  })

  return (
    <>
      {canShow && (
        <div
          className="install-banner"
          role="dialog"
          aria-label="Install ToolVine"
        >
          <div className="install-banner__icon" aria-hidden="true">
            <img src="/app-icon-192.png" alt="" width="40" height="40" />
          </div>
          <div className="install-banner__copy">
            <p className="install-banner__title">Install ToolVine</p>
            <p className="install-banner__sub">Faster access from your home screen.</p>
          </div>
          <button
            type="button"
            className="install-banner__cta"
            onClick={trigger}
          >
            Install
          </button>
          <button
            type="button"
            className="install-banner__close"
            onClick={dismiss}
            aria-label="Dismiss"
          >
            <CloseIcon />
          </button>
        </div>
      )}
      <IOSInstallSteps open={iosOpen} onClose={closeIos} />
    </>
  )
}

function CloseIcon() {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
