import { QueryClientProvider } from '@tanstack/react-query'
import { Compass } from 'lucide-react'
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router'
import { ButtonLink } from './components/Button'
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
import { PlansPage } from './features/plans/PlansPage'
import { EditProfilePage } from './features/profile/EditProfilePage'
import { AthletePage, MyProfilePage } from './features/profile/ProfilePages'
import { ChatPage } from './features/workout/ChatPage'
import { WorkoutPage } from './features/workout/WorkoutPage'

/** Phone-shaped column, centred on larger screens. */
function Shell() {
  useAuthSync()
  return (
    <div className="mx-auto flex h-dvh max-w-xl flex-col bg-ink sm:border-x sm:border-line">
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
      <Toaster />
    </div>
  )
}

/** Top-level sections share the bottom tab bar. */
function TabLayout() {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
      <TabBar />
    </div>
  )
}

function NotFound() {
  return (
    <EmptyState
      Icon={Compass}
      title="Nothing here"
      action={<ButtonLink to="/">Go to Discover</ButtonLink>}
    >
      That page doesn't exist.
    </EmptyState>
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
          { index: true, element: <DiscoverPage /> },
          { path: 'plans', element: <PlansPage /> },
          { path: 'inbox', element: <InboxPage /> },
          { path: 'profile', element: <MyProfilePage /> },
        ],
      },
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
