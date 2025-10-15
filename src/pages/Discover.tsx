import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Layers, Search, ChevronRight, RefreshCw, ArrowLeft } from 'lucide-react'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import UnifiedNavigation from '@/components/UnifiedNavigation'
import AmbientBackground from '@/components/AmbientBackground'
import { TOPIC_CATEGORIES } from '@/data/topicCategories'
import { generateCategoryTopicsRealtime, DiscoverCategory } from '@/services/discoverService'
import { TopicCard } from '@/components/discover/TopicCard'
import { useAuth } from '@features/auth'
import { userInterestTracker } from '@/services/userInterestTracker'

const Discover = () => {
  const navigate = useNavigate()
  const { slug } = useParams()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [categoryTopics, setCategoryTopics] = useState<Record<string, DiscoverCategory>>({})
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      const searchSlug = searchQuery
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim()

      navigate(`/discover/${searchSlug}`)
    }
  }

  const handleCategoryClick = async (category: any) => {
    // If already expanded, collapse it
    if (expandedCategories.has(category.name)) {
      setExpandedCategories(prev => {
        const newSet = new Set(prev)
        newSet.delete(category.name)
        return newSet
      })
      return
    }

    userInterestTracker.recordExploreTopic(category.name)

    // If topics already loaded, just expand
    if (categoryTopics[category.name]) {
      setExpandedCategories(prev => new Set(prev).add(category.name))
      return
    }

    // Load new topics
    setLoadingCategory(category.name)
    try {
      const categoryData = await generateCategoryTopicsRealtime(category.name)
      if (categoryData) {
        setCategoryTopics(prev => ({
          ...prev,
          [category.name]: { ...categoryData, topics: categoryData.topics.slice(0, 12) }
        }))
        setExpandedCategories(prev => new Set(prev).add(category.name))
      }
    } catch (err) {
      console.error('Failed to generate topics:', err)
    } finally {
      setLoadingCategory(null)
    }
  }

  const handleRefreshCategory = async (categoryName: string, e: React.MouseEvent) => {
    e.stopPropagation()
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

  // Auto-expand category when URL slug is present
  useEffect(() => {
    if (slug) {
      // Find the category that matches the slug
      const matchedCategory = TOPIC_CATEGORIES.find(cat => cat.slug === slug)
      if (matchedCategory) {
        // Auto-expand this category
        handleCategoryClick(matchedCategory)
      }
    }
  }, [slug])

  // Get the active category from slug
  const activeCategory = slug ? TOPIC_CATEGORIES.find(cat => cat.slug === slug) : null

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AmbientBackground variant="discover" />
      <div className="relative z-10">
        <UnifiedNavigation />

        {/* Hero Section - Show when viewing specific category */}
        {activeCategory && (
          <section className="relative overflow-hidden pt-24 pb-16">
            <div className="absolute inset-0">
              <img
                src={activeCategory.imageUrl}
                alt={activeCategory.name}
                className="w-full h-full object-cover opacity-30"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900/85 via-slate-900/65 to-slate-900/90" />
            </div>

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Button
                onClick={() => navigate('/discover')}
                variant="ghost"
                className="mb-6 glass-card glass-card-hover px-4 py-2 text-white/90 bg-white/10 border-white/20 hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to All Topics
              </Button>

              <div className="flex items-center gap-4 mb-6">
                <span className="text-6xl drop-shadow-xl">{activeCategory.icon}</span>
                <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight drop-shadow-lg">
                  {activeCategory.name}
                </h1>
              </div>
              <p className="text-xl text-white/90 max-w-2xl leading-relaxed drop-shadow">
                {activeCategory.description}
              </p>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-100 to-transparent" />
          </section>
        )}

        <section className={`${activeCategory ? 'pt-16' : 'pt-24'} pb-16`}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Page Header - Only show when not viewing specific category */}
            {!activeCategory && (
              <div className="mb-12 glass-card glass-card-hover border border-slate-200/60 rounded-3xl shadow-xl px-6 py-12 text-center">
                <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent leading-tight">
                  Discover Search Topics From an{' '}
                  <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                    Infinite
                  </span>{' '}
                  Set of Possibilities
                </h1>

                <form onSubmit={handleSearch} className="max-w-2xl mx-auto mt-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search for any topic... (e.g., quantum physics, climate change, AI)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 pr-4 py-5 text-lg rounded-2xl glass-card border border-slate-200/60 text-slate-700 placeholder:text-slate-400 focus:border-sky-300 focus:ring-sky-200"
                    />
                  </div>
                </form>
              </div>
            )}

            {/* Unified Category Grid */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {TOPIC_CATEGORIES.filter(cat => !activeCategory || cat.slug === activeCategory.slug).map(
                (category, idx) => {
                  const isExpanded = expandedCategories.has(category.name)
                  const isLoading = loadingCategory === category.name
                  const topics = categoryTopics[category.name]

                  return (
                    <div
                      key={category.slug}
                      className={`group relative overflow-hidden rounded-3xl shadow-lg transition-all duration-500 ${
                        isExpanded ? 'col-span-2 md:col-span-3 lg:col-span-4' : 'hover:shadow-2xl hover:scale-[1.02]'
                      }`}
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div
                        onClick={() => !isExpanded && handleCategoryClick(category)}
                        className={`relative ${!isExpanded ? 'cursor-pointer' : ''}`}
                      >
                    {/* Background Image */}
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                      {/* Loading Overlay */}
                      {isLoading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <RefreshCw className="h-8 w-8 text-white animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="font-bold text-lg md:text-xl leading-tight">
                        {category.name}
                      </h3>

                      {/* Status Indicators */}
                      {isExpanded && topics && (
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRefreshCategory(category.name, e)
                            }}
                            variant="secondary"
                            size="sm"
                            className="flex items-center gap-2 bg-white/90 hover:bg-white/95 text-slate-900 relative z-10"
                            disabled={isLoading}
                          >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh Topics
                          </Button>
                        </div>
                      )}

                      {/* Hover Arrow (only when not expanded) */}
                      {!isExpanded && !isLoading && (
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                          <ChevronRight className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Topics Grid */}
                  {isExpanded && topics && (
                    <div className="p-6 bg-white/95 backdrop-blur-sm border-t border-slate-200 animate-in fade-in slide-in-from-top duration-500">
                      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                        {topics.topics.map((topic, topicIdx) => (
                          <TopicCard
                            key={topic.id}
                            topic={topic}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  </div>
  )
}

export default Discover
