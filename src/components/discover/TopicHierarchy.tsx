import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Sparkles, Loader2, TrendingUp, ArrowLeft } from 'lucide-react'
import { Button } from '@ui/button'
import {
  getSubtopics,
  parseBreadcrumbs,
  type HierarchyTopic
} from '@/services/discoverHierarchyService'
import { useAuth } from '@features/auth'
import { TOPIC_CATEGORIES, type TopicCategory } from '@/data/topicCategories'

interface TopicHierarchyProps {
  currentPath: string
  currentTopic: HierarchyTopic | null
  loading: boolean
  rootCategory?: TopicCategory
}

export function TopicHierarchy({ currentPath, currentTopic, loading: topicLoading, rootCategory }: TopicHierarchyProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [subtopics, setSubtopics] = useState<HierarchyTopic[]>([])
  const [subtopicsLoading, setSubtopicsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'explore' | 'overview'>('explore')

  const breadcrumbs = parseBreadcrumbs(currentPath)

  // Use rootCategory from props (extracted immediately in parent)
  const matchedCategory = rootCategory

  useEffect(() => {
    // Only load subtopics after topic is loaded
    if (!topicLoading && currentTopic) {
      loadSubtopics()
    }
  }, [currentPath, user?.id, topicLoading, currentTopic])

  const loadSubtopics = async () => {
    try {
      setSubtopicsLoading(true)
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
      setSubtopicsLoading(false)
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
    <>
      {/* Hero Section - Show immediately when we have a matched category */}
      {matchedCategory && (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 mt-16">
          {/* Background Image with Overlay - Brighter and Clearer */}
          <div className="absolute inset-0">
            <img
              src={matchedCategory.imageUrl}
              alt={matchedCategory.name}
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/70" />
          </div>

          {/* Content */}
          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <Button
              onClick={() => navigate('/discover')}
              variant="ghost"
              className="mb-6 text-white/90 hover:text-white hover:bg-white/10 transition-all"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to All Topics
            </Button>

            <div className="flex items-center gap-4 mb-4">
              <span className="text-6xl drop-shadow-lg">{matchedCategory.icon}</span>
              <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight drop-shadow-lg">
                {matchedCategory.name}
              </h1>
            </div>
            <p className="text-xl text-white/95 max-w-2xl drop-shadow-md">
              {matchedCategory.description}
            </p>
          </div>

          {/* Decorative gradient bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 to-transparent" />
        </div>
      )}

      <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 ${matchedCategory ? '' : 'pt-20'}`}>
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

        {/* Topic Header - Only show if no hero section and topic is loaded */}
        {!matchedCategory && currentTopic && (
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
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center mb-8">
            <p className="text-red-800">{error}</p>
            <Button onClick={loadSubtopics} className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        {/* Loading State - Skeleton Grid */}
        {subtopicsLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, idx) => (
              <div
                key={idx}
                className="animate-pulse rounded-xl bg-white border border-slate-200/50 shadow-sm p-6"
              >
                <div className="h-5 bg-slate-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}

        {/* Subtopics Grid */}
        {!subtopicsLoading && !error && subtopics.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {subtopics.map((topic, idx) => (
              <div
                key={topic.id}
                className="animate-in fade-in slide-in-from-bottom duration-500"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <button
                  onClick={() => handleTopicClick(topic)}
                  className="group relative w-full rounded-xl bg-gradient-to-br from-white via-white to-slate-50 border border-slate-200/50 shadow-sm hover:shadow-lg p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
                >
                  {/* Gradient Accent Border on Hover */}
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 pointer-events-none" />

                  {/* Content */}
                  <div className="relative">
                    {/* Topic Name */}
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors leading-tight">
                      {topic.name}
                    </h3>

                    {/* Article Count Badge */}
                    {topic.article_count > 0 && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm text-slate-600 bg-slate-100/80 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span className="font-medium">{topic.article_count} articles</span>
                      </div>
                    )}

                    {/* Hover Arrow */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                      <ChevronRight className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>

                  {/* Hover Effect Line */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!subtopicsLoading && !error && subtopics.length === 0 && (
          <div className="text-center py-16">
            <Sparkles className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">No subtopics available for this topic yet.</p>
            <Button onClick={handleOverviewClick}>
              View Overview Instead
            </Button>
          </div>
        )}

          {/* Footer Info */}
          {!subtopicsLoading && !error && subtopics.length > 0 && (
            <div className="mt-12 text-center text-sm text-slate-500">
              <p>
                Click any topic to explore deeper, or use &quot;Get Overview&quot; to see articles at this level.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
