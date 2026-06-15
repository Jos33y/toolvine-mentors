import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Forward navigation (PUSH/REPLACE) scrolls to top so a new route never inherits
// the scroll position of the previous one. Browser back/forward (POP) is left
// alone so users return to where they were.
export function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const navType = useNavigationType()

  useEffect(() => {
    if (navType === 'POP') return
    if (hash) return  // hash links manage their own scroll target
    window.scrollTo(0, 0)
  }, [pathname, hash, navType])

  return null
}
