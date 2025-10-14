import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import UnifiedNavigation from '@/components/UnifiedNavigation'
import { TopicHierarchy } from '@/components/discover/TopicHierarchy'
import { getTopicByPath, type HierarchyTopic } from '@/services/discoverHierarchyService'
import { useAuth } from '@features/auth'
import { TOPIC_CATEGORIES } from '@/data/topicCategories'

/**
 * Dynamic route page for topic hierarchy exploration
 * Handles URLs like: /discover/technology/space/mars
 */
export default function TopicPage() {
  const { '*': pathSegments } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentTopic, setCurrentTopic] = useState<HierarchyTopic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Join path segments to get full path
  const currentPath = pathSegments || ''

  // Extract root category immediately from path for instant UI
  const rootCategory = useMemo(() => {
    const firstSegment = currentPath.split('/')[0]
    return TOPIC_CATEGORIES.find(cat => cat.slug === firstSegment)
  }, [currentPath])

  useEffect(() => {
    loadTopic()
  }, [currentPath, user?.id])

  const loadTopic = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!currentPath) {
        // Empty path - redirect to root discover page
        navigate('/discover')
        return
      }

      // Try to get the topic, creating it if it doesn't exist
      const topic = await getTopicByPath(currentPath, user?.id, true)

      if (!topic) {
        setError('Failed to load or create topic')
        setLoading(false)
        return
      }

      setCurrentTopic(topic)
    } catch (err) {
      console.error('Error loading topic:', err)
      setError('Failed to load topic. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Show error state
  if (error || (!loading && !currentTopic)) {
    return (
      <>
        <UnifiedNavigation />
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 pt-20">
          <div className="text-center max-w-md px-4">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">
              {error || 'Topic not found'}
            </h1>
            {!user && (
              <p className="text-slate-600 mb-6">
                You need to be logged in to explore custom topics. Please sign in to continue.
              </p>
            )}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/discover')}
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Return to Discover
              </button>
              {!user && (
                <button
                  onClick={() => navigate('/auth/login')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  // Render immediately with skeleton for root categories
  // or wait for full load for nested topics
  return (
    <>
      <UnifiedNavigation />
      <TopicHierarchy
        currentPath={currentPath}
        currentTopic={currentTopic}
        loading={loading}
        rootCategory={rootCategory}
      />
    </>
  )
}
