import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Navbar1 } from '@ui/navbar'

// Lazy load pages
const Index = lazy(() => import('@/pages/Index'))
const Mission = lazy(() => import('@/pages/Mission'))
const Discover = lazy(() => import('@/pages/Discover'))
const Profile = lazy(() => import('@/pages/Profile'))
const Preferences = lazy(() => import('@/pages/Preferences'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const SavedArticles = lazy(() => import('@features/articles/components/SavedArticles'))
const SearchHistory = lazy(() => import('@features/search/components/SearchHistory'))
const Subscription = lazy(() => import('@features/subscription/components/Subscription'))

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
)

export const AppRoutes = () => (
  <>
    <Navbar1 />
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/mission" element={<Mission />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/preferences" element={<Preferences />} />
        <Route path="/saved-articles" element={<SavedArticles />} />
        <Route path="/search-history" element={<SearchHistory />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </>
)
