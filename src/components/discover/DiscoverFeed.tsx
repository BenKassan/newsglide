import { useState } from 'react'
import { TrendingUp, RefreshCw, Sparkles, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { Button } from '@ui/button'
import { TopicCard } from './TopicCard'
import { generateCategoryTopicsRealtime, DiscoverCategory } from '@/services/discoverService'
import { useAuth } from '@features/auth'

// Predefined categories with enhanced visual design
const DISCOVER_CATEGORIES = [
  { name: 'Technology News', icon: '💻', color: 'from-blue-500 to-purple-600' },
  { name: 'Politics & Government', icon: '🏛️', color: 'from-red-500 to-pink-600' },
  { name: 'World Affairs', icon: '🌍', color: 'from-green-500 to-teal-600' },
  { name: 'Science & Innovation', icon: '🔬', color: 'from-indigo-500 to-blue-600' },
  { name: 'Business & Economy', icon: '💼', color: 'from-yellow-500 to-orange-600' },
  { name: 'Health & Medicine', icon: '⚕️', color: 'from-emerald-500 to-green-600' },
  { name: 'Climate & Environment', icon: '🌱', color: 'from-teal-500 to-cyan-600' },
  { name: 'Arts & Culture', icon: '🎨', color: 'from-purple-500 to-pink-600' },
  { name: 'Sports', icon: '⚽', color: 'from-orange-500 to-red-600' },
]

// This component is now deprecated - functionality has been integrated into src/pages/Discover.tsx
// Keeping for reference only
export function DiscoverFeed() {
  const { user } = useAuth()
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [categoryTopics, setCategoryTopics] = useState<Record<string, DiscoverCategory>>({})
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateTopics = async (categoryName: string) => {
    // If already expanded, collapse it
    if (expandedCategories.has(categoryName)) {
      setExpandedCategories(prev => {
        const newSet = new Set(prev)
        newSet.delete(categoryName)
        return newSet
      })
      return
    }

    // If topics already loaded, just expand
    if (categoryTopics[categoryName]) {
      setExpandedCategories(prev => new Set(prev).add(categoryName))
      return
    }

    // Load new topics
    setLoadingCategory(categoryName)
    setError(null)
    try {
      const category = await generateCategoryTopicsRealtime(categoryName)
      if (category) {
        setCategoryTopics(prev => ({
          ...prev,
          [categoryName]: { ...category, topics: category.topics.slice(0, 12) }
        }))
        setExpandedCategories(prev => new Set(prev).add(categoryName))
      }
    } catch (err) {
      console.error('Failed to generate topics:', err)
      setError(`Failed to generate topics for ${categoryName}`)
    } finally {
      setLoadingCategory(null)
    }
  }

  const handleRefreshCategory = async (categoryName: string) => {
    setLoadingCategory(categoryName)
    try {
      const refreshedCategory = await generateCategoryTopicsRealtime(categoryName)

      if (refreshedCategory) {
        setCategoryTopics(prev => ({
          ...prev,
          [categoryName]: { ...refreshedCategory, topics: refreshedCategory.topics.slice(0, 12) }
        }))
      }
    } catch (err) {
      console.error('Failed to refresh category:', err)
    } finally {
      setLoadingCategory(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Page Header */}
      <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 flex items-center justify-center gap-3 mb-3">
              <TrendingUp className="h-10 w-10 text-blue-600 animate-pulse" />
              Trending Topics
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Explore topics across different categories. Click on any category to discover personalized content.
            </p>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-red-200 bg-red-50/50 backdrop-blur-sm p-6 text-center">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Category Grid */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DISCOVER_CATEGORIES.map((category, idx) => {
            const isExpanded = expandedCategories.has(category.name)
            const isLoading = loadingCategory === category.name
            const topics = categoryTopics[category.name]

            return (
              <div
                key={category.name}
                className={`group relative rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-500 hover:shadow-xl ${
                  isExpanded ? 'sm:col-span-2 lg:col-span-3' : ''
                }`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Category Card Header */}
                <div
                  className={`relative overflow-hidden rounded-t-2xl ${
                    isExpanded ? 'rounded-b-none' : 'rounded-b-2xl'
                  }`}
                >
                  {/* Gradient Background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-90`} />

                  {/* Pattern Overlay */}
                  <div className="absolute inset-0 opacity-10">
                    <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id={`pattern-${idx}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                          <circle cx="20" cy="20" r="1.5" fill="white" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill={`url(#pattern-${idx})`} />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="relative p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl filter drop-shadow-md">{category.icon}</span>
                        <h3 className="text-xl font-bold text-white drop-shadow-sm">
                          {category.name}
                        </h3>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex items-center gap-2">
                      <Button
                        onClick={() => handleGenerateTopics(category.name)}
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-2 bg-white/95 hover:bg-white text-slate-900 shadow-md"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : isExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Hide Topics
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4" />
                            Generate Topics
                            <ChevronDown className="h-4 w-4" />
                          </>
                        )}
                      </Button>

                      {isExpanded && topics && (
                        <Button
                          onClick={() => handleRefreshCategory(category.name)}
                          variant="secondary"
                          size="sm"
                          className="flex items-center gap-2 bg-white/90 hover:bg-white/95 text-slate-900"
                          disabled={isLoading}
                        >
                          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Topics Grid */}
                {isExpanded && topics && (
                  <div className="p-6 border-t border-slate-100 animate-in fade-in slide-in-from-top duration-500">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {topics.topics.map((topic, topicIdx) => (
                        <div
                          key={topic.id}
                          className="animate-in fade-in slide-in-from-bottom duration-500"
                          style={{
                            animationDelay: `${topicIdx * 50}ms`
                          }}
                        >
                          <TopicCard topic={topic} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer Hint */}
      <div className="mx-auto max-w-7xl px-4 pb-16 text-center">
        <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
          <Sparkles className="h-4 w-4" />
          Click "Generate Topics" to explore AI-curated content for each category
        </p>
      </div>
    </div>
  )
}
