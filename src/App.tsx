import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense, lazy } from 'react'
import { AuthProvider } from '@features/auth'
import { SubscriptionProvider } from '@features/subscription'
import { Toaster } from '@ui/toaster'

// Lazy load all pages for code splitting
const Index = lazy(() => import('@/pages/Index'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const Profile = lazy(() => import('@/pages/Profile'))
const Preferences = lazy(() => import('@/pages/Preferences'))
const Subscription = lazy(() => import('@/pages/Subscription'))
const SearchHistory = lazy(() => import('@/pages/SearchHistory'))
const Mission = lazy(() => import('@/pages/Mission'))
const Discover = lazy(() => import('@/pages/Discover'))
const ResetPassword = lazy(() => import('@/pages/ResetPassword'))
const AIChat = lazy(() => import('@/pages/AIChat'))

// Loading component for lazy-loaded pages
const PageLoading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
)

const queryClient = new QueryClient()

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<PageLoading />}>
        <Index />
      </Suspense>
    ),
  },
  {
    path: '/profile',
    element: (
      <Suspense fallback={<PageLoading />}>
        <Profile />
      </Suspense>
    ),
  },
  {
    path: '/preferences',
    element: (
      <Suspense fallback={<PageLoading />}>
        <Preferences />
      </Suspense>
    ),
  },
  {
    path: '/subscription',
    element: (
      <Suspense fallback={<PageLoading />}>
        <Subscription />
      </Suspense>
    ),
  },
  {
    path: '/search-history',
    element: (
      <Suspense fallback={<PageLoading />}>
        <SearchHistory />
      </Suspense>
    ),
  },
  {
    path: '/mission',
    element: (
      <Suspense fallback={<PageLoading />}>
        <Mission />
      </Suspense>
    ),
  },
  {
    path: '/discover',
    element: (
      <Suspense fallback={<PageLoading />}>
        <Discover />
      </Suspense>
    ),
  },
  {
    path: '/ai-chat',
    element: (
      <Suspense fallback={<PageLoading />}>
        <AIChat />
      </Suspense>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <Suspense fallback={<PageLoading />}>
        <ResetPassword />
      </Suspense>
    ),
  },
  {
    path: '/subscription/success',
    element: (
      <Suspense fallback={<PageLoading />}>
        <Subscription />
      </Suspense>
    ),
  },
  {
    path: '/subscription/cancel',
    element: (
      <Suspense fallback={<PageLoading />}>
        <Subscription />
      </Suspense>
    ),
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<PageLoading />}>
        <NotFound />
      </Suspense>
    ),
  },
])

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SubscriptionProvider>
          <RouterProvider router={router} />
          <Toaster />
        </SubscriptionProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
