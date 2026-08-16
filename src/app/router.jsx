import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router-dom'
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
import { Team } from '@/pages/public/Team'
import { Outreach } from '@/pages/public/Outreach'
import { Programs } from '@/pages/public/Programs'
import { HowItWorks } from '@/pages/public/HowItWorks'
import { Resources } from '@/pages/public/Resources'
import { Contact } from '@/pages/public/Contact'
import { GetInvolved } from '@/pages/public/GetInvolved'
import { Partners } from '@/pages/public/Partners'
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
const AdminPartners = lazy(() => import('@/pages/admin/Partners').then((m) => ({ default: m.Partners })))
const AdminInvites  = lazy(() => import('@/pages/admin/Invites').then((m) => ({ default: m.Invites })))
const AdminPairings = lazy(() => import('@/pages/admin/Pairings').then((m) => ({ default: m.Pairings })))
const AdminResources = lazy(() => import('@/pages/admin/Resources').then((m) => ({ default: m.Resources })))
const AdminVerse     = lazy(() => import('@/pages/admin/Verse').then((m) => ({ default: m.Verse })))
const Mentees      = lazy(() => import('@/pages/mentor/Mentees').then((m) => ({ default: m.Mentees })))
const MyMentor     = lazy(() => import('@/pages/mentee/Mentor').then((m) => ({ default: m.Mentor })))
const MeetingsPage = lazy(() => import('@/pages/meetings/Meetings').then((m) => ({ default: m.Meetings })))
const LibraryPage  = lazy(() => import('@/pages/library/Library').then((m) => ({ default: m.Library })))
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsRoute').then((m) => ({ default: m.NotificationsRoute })))
const MeetingPage  = lazy(() => import('@/pages/meetings/Meeting').then((m) => ({ default: m.Meeting })))

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

// Navigate drops the query string, and the moved admin paths are linked with
// filters on them. Carry search and hash across so a filtered link still lands
// on its filter.
function RedirectWithSearch({ to }) {
  const { search, hash } = useLocation()
  return <Navigate to={{ pathname: to, search, hash }} replace />
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
          { path: '/team',                 element: <Team /> },
          { path: '/outreach',             element: <Outreach /> },
          { path: '/partners',             element: <Partners /> },
          { path: '/programs',             element: <Programs /> },
          { path: '/how-it-works',         element: <HowItWorks /> },
          { path: '/resources',            element: <Resources /> },
          { path: '/contact',              element: <Contact /> },
          { path: '/get-involved',         element: <GetInvolved /> },
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
                element: <LazyRoute><MeetingsPage /></LazyRoute>
              },
              {
                path: '/meetings/:id',
                element: <LazyRoute><MeetingPage /></LazyRoute>
              },
              {
                path: '/library',
                element: <LazyRoute><LibraryPage /></LazyRoute>
              },
              {
                path: '/notifications',
                element: <LazyRoute><NotificationsPage /></LazyRoute>
              },

              /* Every admin-guarded surface lives under /admin. The old root
                 paths redirect rather than 404 so links written before the
                 move keep working. */
              { path: '/users',    element: <RedirectWithSearch to="/admin/users" /> },
              { path: '/pairings', element: <RedirectWithSearch to="/admin/pairings" /> },

              /* Admin group. One guard, many children. */
              {
                path: '/admin',
                element: <RequireRole allow={[ROLES.ADMIN]} />,
                children: [
                  { path: 'users',       element: <LazyRoute><Users /></LazyRoute> },
                  { path: 'pairings',    element: <LazyRoute><AdminPairings /></LazyRoute> },
                  { path: 'submissions', element: <LazyRoute><Submissions /></LazyRoute> },
                  { path: 'activity',    element: <LazyRoute><Activity    /></LazyRoute> },
                  { path: 'insights',    element: <LazyRoute><Insights    /></LazyRoute> },
                  { path: 'partners',    element: <LazyRoute><AdminPartners /></LazyRoute> },
                  { path: 'invites',     element: <LazyRoute><AdminInvites  /></LazyRoute> },
                  { path: 'resources',   element: <LazyRoute><AdminResources /></LazyRoute> },
                  { path: 'verse',       element: <LazyRoute><AdminVerse /></LazyRoute> }
                ]
              },

              /* Mentor and admin both need this view; the page itself adapts. */
              {
                path: '/mentees',
                element: (
                  <RequireRole allow={[ROLES.ADMIN, ROLES.MENTOR]}>
                    <LazyRoute><Mentees /></LazyRoute>
                  </RequireRole>
                )
              },

              /* Mentee only */
              {
                path: '/mentor',
                element: (
                  <RequireRole allow={[ROLES.MENTEE]}>
                    <LazyRoute><MyMentor /></LazyRoute>
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
