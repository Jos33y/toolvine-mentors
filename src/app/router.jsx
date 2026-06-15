import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import { useAuth } from '@/stores/useAuth'
import { ROLES, homeFor, hasAnyRole } from '@/lib/roles'
import { useRouteAnalytics } from '@/hooks/useRouteAnalytics'

import { Splash } from '@/components/shared/Splash/Splash'
import { ScrollToTop } from '@/components/shared/ScrollToTop/ScrollToTop'
import { PlaceholderPage } from '@/components/shared/PlaceholderPage/PlaceholderPage'

import { PublicLayout } from '@/layouts/PublicLayout/PublicLayout'
import { AuthLayout } from '@/layouts/AuthLayout/AuthLayout'
import { OnboardingLayout } from '@/layouts/OnboardingLayout/OnboardingLayout'

// Public pages render on first paint; keep in the entry chunk.
import { Home } from '@/pages/public/Home'
import { About } from '@/pages/public/About'
import { Programs } from '@/pages/public/Programs'
import { HowItWorks } from '@/pages/public/HowItWorks'
import { Resources } from '@/pages/public/Resources'
import { Contact } from '@/pages/public/Contact'
import { Privacy } from '@/pages/public/Privacy'
import { Terms } from '@/pages/public/Terms'
import { CommunityGuidelines } from '@/pages/public/CommunityGuidelines'
import { NotFound } from '@/pages/NotFound'

// Auth pages keep their place in the entry chunk to avoid a fallback flash
// on the most common visitor flow.
import { SignIn }       from '@/pages/auth/SignIn'
import { SignUp }       from '@/pages/auth/SignUp'
import { Reset }        from '@/pages/auth/Reset'
import { ResetConfirm } from '@/pages/auth/ResetConfirm'
import { Callback }     from '@/pages/auth/Callback'
import { VerifyEmail }  from '@/pages/auth/VerifyEmail'

// Onboarding ships in the entry chunk: every new sign-up hits it immediately.
import { Onboarding } from '@/pages/onboarding/Onboarding'

// AppShell and signed-in pages lazy-load. A marketing visitor never pays for them.
const AppShell    = lazy(() => import('@/layouts/AppShell/AppShell').then((m) => ({ default: m.AppShell })))
const Dashboard   = lazy(() => import('@/pages/dashboard/Dashboard').then((m) => ({ default: m.Dashboard })))
const Profile     = lazy(() => import('@/pages/profile/Profile').then((m) => ({ default: m.Profile })))
const Users       = lazy(() => import('@/pages/admin/Users').then((m) => ({ default: m.Users })))
const Submissions = lazy(() => import('@/pages/admin/Submissions').then((m) => ({ default: m.Submissions })))
const Activity    = lazy(() => import('@/pages/admin/Activity').then((m) => ({ default: m.Activity })))
const Insights    = lazy(() => import('@/pages/admin/Insights').then((m) => ({ default: m.Insights })))

/* ============ Root ============
   useRouteAnalytics mounts here because it depends on useLocation, which
   only works inside the RouterProvider tree. App.jsx sits outside the
   provider, so the tracker had to live here instead. */

function Root() {
  useRouteAnalytics()
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  )
}

/* ============ Guards ============ */

function RequireAuth() {
  const session = useAuth((s) => s.session)
  const loading = useAuth((s) => s.loading)
  if (loading)  return <Splash fullScreen />
  if (!session) return <Navigate to="/auth/sign-in" replace />
  return <Outlet />
}

// Accepts children (per-route wrap) OR no children (layout-style Outlet).
// Layout style is handy for grouping several routes under one role guard;
// wrapper style is cleaner for single routes inline.
function RequireRole({ allow, children }) {
  const profile = useAuth((s) => s.profile)
  const roles   = useAuth((s) => s.roles)
  const loading = useAuth((s) => s.loading)

  if (loading) return <Splash fullScreen />
  if (!profile || roles.length === 0) return <Splash fullScreen />

  if (!hasAnyRole(roles, allow)) {
    return <Navigate to={homeFor(roles)} replace />
  }
  return children ?? <Outlet />
}

function LazyRoute({ children }) {
  return <Suspense fallback={<Splash />}>{children}</Suspense>
}

/* ============ Router ============ */

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      /* Public marketing site */
      {
        element: <PublicLayout />,
        children: [
          { path: '/',                     element: <Home /> },
          { path: '/about',                element: <About /> },
          { path: '/programs',             element: <Programs /> },
          { path: '/how-it-works',         element: <HowItWorks /> },
          { path: '/resources',            element: <Resources /> },
          { path: '/contact',              element: <Contact /> },
          { path: '/privacy',              element: <Privacy /> },
          { path: '/terms',                element: <Terms /> },
          { path: '/community-guidelines', element: <CommunityGuidelines /> }
        ]
      },

      /* Auth flows. /auth/verify-email is public on purpose: a user clicking
         the link from another device should be able to confirm even when
         signed out. The token itself is the authority. */
      {
        path: '/auth',
        element: <AuthLayout />,
        children: [
          { index: true,           element: <Navigate to="sign-in" replace /> },
          { path: 'sign-in',       element: <SignIn /> },
          { path: 'sign-up',       element: <SignUp /> },
          { path: 'reset',         element: <Reset /> },
          { path: 'reset/confirm', element: <ResetConfirm /> },
          { path: 'callback',      element: <Callback /> },
          { path: 'verify-email',  element: <VerifyEmail /> }
        ]
      },

      /* Signed-in surfaces */
      {
        element: <RequireAuth />,
        children: [
          /* Onboarding sits on its own warm-cream surface, no app shell */
          {
            element: <OnboardingLayout />,
            children: [
              { path: '/onboarding', element: <Onboarding /> }
            ]
          },

          /* App shell. Flat URLs, role-union nav. Placeholder pages mounted
             for routes whose real implementation has not landed yet, so the
             sidebar never dead-ends. Replace each PlaceholderPage with the
             real page as it ships. */
          {
            element: <LazyRoute><AppShell /></LazyRoute>,
            children: [
              { path: '/dashboard', element: <LazyRoute><Dashboard /></LazyRoute> },
              { path: '/profile',   element: <LazyRoute><Profile /></LazyRoute> },

              /* Shared (all signed-in roles) */
              {
                path: '/meetings',
                element: <PlaceholderPage
                  eyebrow="Coming soon"
                  title="Meetings"
                  body="Where you will schedule sessions, track who showed up, and keep the notes that follow."
                />
              },

              /* Admin only — core entities at root paths. */
              {
                path: '/users',
                element: (
                  <RequireRole allow={[ROLES.ADMIN]}>
                    <LazyRoute><Users /></LazyRoute>
                  </RequireRole>
                )
              },
              {
                path: '/pairings',
                element: (
                  <RequireRole allow={[ROLES.ADMIN]}>
                    <PlaceholderPage
                      eyebrow="Coming soon"
                      title="Pairings"
                      body="Assign mentors to mentees. End pairings cleanly. Keep the history intact."
                    />
                  </RequireRole>
                )
              },

              /* Admin tools group. One guard, many children. */
              {
                path: '/admin',
                element: <RequireRole allow={[ROLES.ADMIN]} />,
                children: [
                  { path: 'submissions', element: <LazyRoute><Submissions /></LazyRoute> },
                  { path: 'activity',    element: <LazyRoute><Activity    /></LazyRoute> },
                  { path: 'insights',    element: <LazyRoute><Insights    /></LazyRoute> }
                ]
              },

              /* Mentor and admin both need this view; the page itself adapts. */
              {
                path: '/mentees',
                element: (
                  <RequireRole allow={[ROLES.ADMIN, ROLES.MENTOR]}>
                    <PlaceholderPage
                      eyebrow="Coming soon"
                      title="Mentees"
                      body="The people in your care. Their meeting history, your notes, and the next step."
                    />
                  </RequireRole>
                )
              },

              /* Mentee only */
              {
                path: '/mentor',
                element: (
                  <RequireRole allow={[ROLES.MENTEE]}>
                    <PlaceholderPage
                      eyebrow="Coming soon"
                      title="My Mentor"
                      body="Your assigned mentor and the record of every meeting you have shared."
                    />
                  </RequireRole>
                )
              }
            ]
          }
        ]
      },

      { path: '*', element: <NotFound /> }
    ]
  }
])

export function Router() {
  return <RouterProvider router={router} />
}
