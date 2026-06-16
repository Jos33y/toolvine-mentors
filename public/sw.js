// Minimum viable service worker. Registered so the browser will consider the
// app installable; no offline caching yet. Real cache strategy lands later
// when the offline story is worth its complexity.

self.addEventListener('install', () => {
  // Take control on first install without waiting for tabs to close.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Claim open clients so the new worker handles fetch immediately.
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // Pass-through. Browser default behavior applies.
})
