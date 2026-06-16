import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/styles/fonts.css'
import '@/styles/variables.css'
import '@/styles/base.css'
import '@/styles/page.css'

import { App } from './app/App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// Service worker registration. Required for Chrome to surface the install
// prompt alongside the manifest. Production only — dev builds change too
// often to cache safely. Silent on failure so a flaky load does not break.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
