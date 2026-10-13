import { QueryClientProvider } from '@tanstack/react-query'
import { Compass } from 'lucide-react'
import { useState } from 'react'
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router'
import { ButtonLink } from './components/Button'
import { CelebrationOverlay } from './components/CelebrationOverlay'
import { EmptyState } from './components/EmptyState'
import { TabBar } from './components/TabBar'
import { Toaster } from './components/Toaster'
import { useAuthSync } from './data/auth'
import { queryClient } from './data/queryClient'
import { RequireAuth } from './features/auth/RequireAuth'
import { SignInPage } from './features/auth/SignInPage'
import { CreateWorkoutPage } from './features/create/CreateWorkoutPage'
import { DiscoverPage } from './features/discover/DiscoverPage'
import { InboxPage } from './features/inbox/InboxPage'
import { InspirePage } from './features/inspire/InspirePage'
import { PlansPage } from './features/plans/PlansPage'
import { EditProfilePage } from './features/profile/EditProfilePage'
import { AthletePage, MyProfilePage } from './features/profile/ProfilePages'
import { WelcomePage } from './features/welcome/WelcomePage'
import { ChatPage } from './features/workout/ChatPage'
import { WorkoutPage } from './features/workout/WorkoutPage'
import { PHOTOS } from './lib/photos'
import { hasSeenWelcome } from './lib/welcome'

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
        <CelebrationOverlay />
      </div>
    </div>
  )
}

/** Top-level sections share the floating tab bar, which content scrolls beneath. */
function TabLayout() {
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

function NotFound() {
  return (
    <div className="grid h-dvh place-items-center bg-ink">
      <EmptyState
        Icon={Compass}
        title="Čia nieko nėra"
        action={<ButtonLink to="/">Į pradžią</ButtonLink>}
      >
        Tokio puslapio nėra – gal nuoroda pasenusi?
      </EmptyState>
    </div>
  )
}

const router = createBrowserRouter([
  {
    element: <Shell />,
    errorElement: <NotFound />,
    children: [
      {
        element: <TabLayout />,
        children: [
          { index: true, element: <Home /> },
          { path: 'plans', element: <PlansPage /> },
          { path: 'inspire', element: <InspirePage /> },
          { path: 'inbox', element: <InboxPage /> },
          { path: 'profile', element: <MyProfilePage /> },
        ],
      },
      { path: 'welcome', element: <WelcomePage /> },
      {
        path: 'workouts/new',
        element: (
          <RequireAuth>
            <CreateWorkoutPage />
          </RequireAuth>
        ),
      },
      { path: 'workouts/:id', element: <WorkoutPage /> },
      {
        path: 'workouts/:id/chat',
        element: (
          <RequireAuth>
            <ChatPage />
          </RequireAuth>
        ),
      },
      { path: 'athletes/:id', element: <AthletePage /> },
      {
        path: 'profile/edit',
        element: (
          <RequireAuth>
            <EditProfilePage />
          </RequireAuth>
        ),
      },
      { path: 'signin', element: <SignInPage /> },
      { path: '*', element: <NotFound /> },
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
