import { useState, useEffect } from 'react'
import { TrendingUp, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TopicCard } from './TopicCard'
import { fetchDiscoverTopics, DiscoverCategory } from '@/services/discoverService'
import { useAuth } from '@features/auth'

export function DiscoverFeed() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<DiscoverCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTopics = async (invalidateCache = false) => {
    try {
      setError(null)
      const topics = await fetchDiscoverTopics(user?.id, invalidateCache)
      setCategories(topics)
    } catch (err) {
      console.error('Failed to load discover topics:', err)
      setError('Failed to load topics. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadTopics()
  }, [user?.id])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadTopics(true) // Invalidate cache on manual refresh
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100">
        <div className="text-center">
          <div className="mb-4 animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600">Loading trending topics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pt-20">
      {/* Page Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                Discover
              </h1>
              <p className="mt-2 text-slate-600">
                Click any topic to generate your personalized news analysis
              </p>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="flex items-center gap-2"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-red-800">{error}</p>
            <Button onClick={handleRefresh} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Topics by category */}
      {!error && (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
          {categories.length === 0 ? (
            <div className="text-center py-16">
              <Sparkles className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No topics available at the moment.</p>
              <Button onClick={handleRefresh} className="mt-4">
                Refresh Topics
              </Button>
            </div>
          ) : (
            categories.map((category) => (
              <section key={category.name} className="animate-in fade-in slide-in-from-bottom duration-700">
                {/* Category header */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">{category.name}</h2>
                  <div className="mt-2 h-1 w-16 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500" />
                </div>

                {/* Topics grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {category.topics.map((topic) => (
                    <div
                      key={topic.id}
                      className="animate-in fade-in slide-in-from-bottom duration-500"
                      style={{
                        animationDelay: `${Math.random() * 200}ms`
                      }}
                    >
                      <TopicCard topic={topic} />
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      {/* Footer message */}
      {!error && categories.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 text-center">
          <p className="text-sm text-slate-500">
            Topics refresh automatically. Click any topic to generate your personalized analysis.
          </p>
        </div>
      )}
    </div>
  )
}
