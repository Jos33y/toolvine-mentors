import './Splash.css'

// fullScreen=true covers the viewport for initial auth checks. fullScreen=false sits
// inside the layout for Suspense fallbacks once the shell is already rendered.
export function Splash({ fullScreen = false, label = 'Loading' }) {
  return (
    <div
      className={fullScreen ? 'tv-splash tv-splash--fullscreen' : 'tv-splash'}
      role="status"
      aria-live="polite"
    >
      <svg
        className="tv-splash__mark"
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M 32 46 A 20 20 0 0 1 46 16 A 20 20 0 0 1 32 46 Z" fill="#14B8A6"/>
        <path d="M 32 46 A 20 20 0 0 0 18 16 A 20 20 0 0 0 32 46 Z" fill="#0F766E"/>
        <path d="M 32 46 L 32 56" stroke="#0F766E" strokeWidth="3.5" strokeLinecap="round"/>
      </svg>
      <span className="tv-splash__sr">{label}</span>
    </div>
  )
}
