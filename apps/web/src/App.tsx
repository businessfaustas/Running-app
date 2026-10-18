import { QueryClientProvider } from '@tanstack/react-query'
import { Analytics } from '@vercel/analytics/react'
import { lazy, Suspense, useState, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router'
import { CelebrationOverlay } from './components/CelebrationOverlay'
import { FullScreenLoader } from './components/FullScreenLoader'
import { OfflineBanner } from './components/OfflineBanner'
import { TabBar } from './components/TabBar'
import { Toaster } from './components/Toaster'
import { useAuthSync, useSession } from './data/auth'
import { useMe } from './data/hooks'
import { queryClient } from './data/queryClient'
import { RequireAuth } from './features/auth/RequireAuth'
import { SignInPage } from './features/auth/SignInPage'
import { DiscoverPage } from './features/discover/DiscoverPage'
import { NotFoundPage, RouteErrorPage } from './features/errors/ErrorPages'
import { InboxPage } from './features/inbox/InboxPage'
import { InspirePage } from './features/inspire/InspirePage'
import { PlansPage } from './features/plans/PlansPage'
import { RacesPage } from './features/races/RacesPage'
import { AthletePage, MyProfilePage } from './features/profile/ProfilePages'
import { WelcomePage } from './features/welcome/WelcomePage'
import { ChatPage } from './features/workout/ChatPage'
import { WorkoutPage } from './features/workout/WorkoutPage'
import { analyticsEnabled, sanitizeAnalyticsUrl } from './lib/analytics'
import { PHOTOS } from './lib/photos'
import { hasSeenWelcome } from './lib/welcome'

// Screens people reach less often load on demand, keeping the first download small.
const CreateWorkoutPage = lazy(() =>
  import('./features/create/CreateWorkoutPage').then((m) => ({ default: m.CreateWorkoutPage })),
)
const EditProfilePage = lazy(() =>
  import('./features/profile/EditProfilePage').then((m) => ({ default: m.EditProfilePage })),
)
const SettingsPage = lazy(() =>
  import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const OnboardingPage = lazy(() =>
  import('./features/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('./features/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
)
const ResetPasswordPage = lazy(() =>
  import('./features/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)
const AuthCallbackPage = lazy(() =>
  import('./features/auth/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })),
)
const RacePage = lazy(() =>
  import('./features/races/RacePage').then((m) => ({ default: m.RacePage })),
)
const FuelingPage = lazy(() =>
  import('./features/fueling/FuelingPage').then((m) => ({ default: m.FuelingPage })),
)
const LeaderboardPage = lazy(() =>
  import('./features/leaderboard/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })),
)
const ClubsPage = lazy(() =>
  import('./features/clubs/ClubsPage').then((m) => ({ default: m.ClubsPage })),
)
const ClubPage = lazy(() =>
  import('./features/clubs/ClubPage').then((m) => ({ default: m.ClubPage })),
)
const PrivacyPage = lazy(() =>
  import('./features/legal/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
)
const TermsPage = lazy(() =>
  import('./features/legal/TermsPage').then((m) => ({ default: m.TermsPage })),
)

const page = (element: ReactNode) => <Suspense fallback={<FullScreenLoader />}>{element}</Suspense>
const signedIn = (element: ReactNode) => page(<RequireAuth>{element}</RequireAuth>)

/** Phone-shaped column; on tablets and desktops it floats over a dimmed photo. */
function Shell() {
  useAuthSync()
  return (
    <div className="relative min-h-dvh bg-ink">
      <div aria-hidden className="pointer-events-none fixed inset-0 hidden sm:block">
        <img src={PHOTOS.runCoast} alt="" className="size-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/80 to-ink" />
      </div>
      <div className="relative mx-auto flex h-dvh max-w-xl flex-col overflow-hidden bg-ink sm:border-x sm:border-white/10 sm:shadow-[0_0_80px_rgb(0_0_0/0.6)]">
        <div className="min-h-0 flex-1">
          <Outlet />
        </div>
        <Toaster />
        <OfflineBanner />
        <CelebrationOverlay />
      </div>
      {analyticsEnabled && (
        <Analytics beforeSend={(event) => ({ ...event, url: sanitizeAnalyticsUrl(event.url) })} />
      )}
    </div>
  )
}

/** Top-level sections share the floating tab bar, which content scrolls beneath. */
function TabLayout() {
  const session = useSession()
  const me = useMe()
  // New accounts finish onboarding before using the app.
  if (session && me.data && !me.data.onboarded) return <Navigate to="/onboarding" replace />
  return (
    <div className="relative h-full">
      <Outlet />
      <TabBar />
    </div>
  )
}

/** First visit: show the intro before the timeline. */
function Home() {
  const [firstVisit] = useState(() => !hasSeenWelcome())
  if (firstVisit) return <Navigate to="/welcome" replace />
  return <DiscoverPage />
}

const router = createBrowserRouter([
  {
    element: <Shell />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <TabLayout />,
        children: [
          { index: true, element: <Home /> },
          { path: 'races', element: <RacesPage /> },
          { path: 'plans', element: <PlansPage /> },
          { path: 'inspire', element: <InspirePage /> },
          { path: 'inbox', element: <InboxPage /> },
          { path: 'profile', element: <MyProfilePage /> },
        ],
      },
      { path: 'welcome', element: <WelcomePage /> },
      { path: 'onboarding', element: signedIn(<OnboardingPage />) },
      { path: 'workouts/new', element: signedIn(<CreateWorkoutPage />) },
      { path: 'workouts/:id', element: <WorkoutPage /> },
      { path: 'workouts/:id/chat', element: signedIn(<ChatPage />) },
      { path: 'athletes/:id', element: <AthletePage /> },
      { path: 'races/:slug', element: page(<RacePage />) },
      { path: 'fueling', element: page(<FuelingPage />) },
      { path: 'leaderboard', element: page(<LeaderboardPage />) },
      { path: 'clubs', element: page(<ClubsPage />) },
      { path: 'clubs/:slug', element: page(<ClubPage />) },
      { path: 'profile/edit', element: signedIn(<EditProfilePage />) },
      { path: 'settings', element: signedIn(<SettingsPage />) },
      { path: 'signin', element: <SignInPage /> },
      { path: 'forgot-password', element: page(<ForgotPasswordPage />) },
      { path: 'reset-password', element: page(<ResetPasswordPage />) },
      { path: 'auth/callback', element: page(<AuthCallbackPage />) },
      { path: 'privatumas', element: page(<PrivacyPage />) },
      { path: 'salygos', element: page(<TermsPage />) },
      { path: 'privacy', element: <Navigate to="/privatumas" replace /> },
      { path: 'terms', element: <Navigate to="/salygos" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
