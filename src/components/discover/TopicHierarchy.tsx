import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Sparkles, Loader2, TrendingUp } from 'lucide-react'
import { Button } from '@ui/button'
import {
  getSubtopics,
  parseBreadcrumbs,
  type HierarchyTopic
} from '@/services/discoverHierarchyService'
import { useAuth } from '@features/auth'

interface TopicHierarchyProps {
  currentPath: string
  currentTopic: HierarchyTopic
}

export function TopicHierarchy({ currentPath, currentTopic }: TopicHierarchyProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [subtopics, setSubtopics] = useState<HierarchyTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'explore' | 'overview'>('explore')

  const breadcrumbs = parseBreadcrumbs(currentPath)

  useEffect(() => {
    loadSubtopics()
  }, [currentPath, user?.id])

  const loadSubtopics = async () => {
    try {
      setLoading(true)
      setError(null)

      const topics = await getSubtopics(currentPath, user?.id)
      setSubtopics(topics)

      // If no subtopics found, auto-switch to overview mode
      if (topics.length === 0) {
        setViewMode('overview')
      }
    } catch (err) {
      console.error('Failed to load subtopics:', err)
      setError('Failed to load topics. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleTopicClick = (topic: HierarchyTopic) => {
    navigate(`/discover/${topic.path}`)
  }

  const handleBreadcrumbClick = (path: string) => {
    if (path === currentPath) return
    navigate(`/discover/${path}`)
  }

  const handleOverviewClick = () => {
    setViewMode('overview')
  }

  if (viewMode === 'overview') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pt-20">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <div className="mb-6 flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate('/discover')}
              className="text-blue-600 hover:text-blue-700 transition-colors"
            >
              Discover
            </button>
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.path} className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4 text-slate-400" />
                <button
                  onClick={() => handleBreadcrumbClick(crumb.path)}
                  className={`transition-colors ${
                    idx === breadcrumbs.length - 1
                      ? 'text-slate-900 font-medium'
                      : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>

          {/* Overview Content - TODO: Implement with AI summary */}
          <div className="rounded-lg border border-slate-200 bg-white/80 backdrop-blur-sm p-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">{currentTopic.name} Overview</h1>
            <p className="text-slate-600 mb-6">
              Coming soon: AI-generated overview with articles and insights about {currentTopic.name}.
            </p>
            <Button onClick={() => setViewMode('explore')}>
              Explore Subtopics
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pt-20">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <div className="mb-6 flex items-center gap-2 text-sm">
          <button
            onClick={() => navigate('/discover')}
            className="text-blue-600 hover:text-blue-700 transition-colors"
          >
            Discover
          </button>
          {breadcrumbs.map((crumb, idx) => (
            <div key={crumb.path} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-slate-400" />
              <button
                onClick={() => handleBreadcrumbClick(crumb.path)}
                className={`transition-colors ${
                  idx === breadcrumbs.length - 1
                    ? 'text-slate-900 font-medium'
                    : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        {/* Topic Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">{currentTopic.name}</h1>
          {currentTopic.description && (
            <p className="text-lg text-slate-600">{currentTopic.description}</p>
          )}
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={handleOverviewClick}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Get Overview
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center mb-8">
            <p className="text-red-800">{error}</p>
            <Button onClick={loadSubtopics} className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="text-slate-600">Generating subtopics...</p>
          </div>
        )}

        {/* Subtopics Grid */}
        {!loading && !error && subtopics.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {subtopics.map((topic, idx) => (
              <div
                key={topic.id}
                className="animate-in fade-in slide-in-from-bottom duration-500"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <button
                  onClick={() => handleTopicClick(topic)}
                  className="group relative w-full rounded-lg border border-slate-200 bg-white/60 backdrop-blur-sm p-6 text-left transition-all hover:border-blue-300 hover:bg-white/80 hover:shadow-lg hover:-translate-y-1"
                >
                  {/* Topic Name */}
                  <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {topic.name}
                  </h3>

                  {/* Article Count Badge */}
                  {topic.article_count > 0 && (
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <TrendingUp className="h-4 w-4" />
                      <span>{topic.article_count} articles</span>
                    </div>
                  )}

                  {/* Hover Arrow */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="h-5 w-5 text-blue-600" />
                  </div>

                  {/* Decorative gradient on hover */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && subtopics.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">No subtopics available for this topic yet.</p>
            <Button onClick={handleOverviewClick}>
              View Overview Instead
            </Button>
          </div>
        )}

        {/* Footer Info */}
        {!loading && !error && subtopics.length > 0 && (
          <div className="mt-12 text-center text-sm text-slate-500">
            <p>
              Click any topic to explore deeper, or use "Get Overview" to see articles at this level.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
