import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Layers, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DiscoverFeed } from '@/components/discover/DiscoverFeed'
import UnifiedNavigation from '@/components/UnifiedNavigation'
import { getRootTopics, type HierarchyTopic } from '@/services/discoverHierarchyService'

const Discover = () => {
  const navigate = useNavigate()
  const [rootTopics, setRootTopics] = useState<HierarchyTopic[]>([])
  const [showFeed, setShowFeed] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadRootTopics()
  }, [])

  const loadRootTopics = async () => {
    const topics = await getRootTopics()
    setRootTopics(topics)
  }

  const handleTopicClick = (topic: HierarchyTopic) => {
    navigate(`/discover/${topic.path}`)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Convert search query to a slug format for the path
      const searchSlug = searchQuery
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim()

      navigate(`/discover/${searchSlug}`)
    }
  }

  return (
    <>
      <UnifiedNavigation />

      {/* Root Topics Section */}
      {rootTopics.length > 0 && (
        <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm pt-20">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-6 w-6 text-blue-600" />
                Explore by Topic
              </h2>
              <p className="mt-2 text-slate-600">
                Dive deep into any topic with infinite hierarchical exploration
              </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-8">
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search for any topic... (e.g., quantum physics, climate change, AI)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-6 text-lg rounded-xl border-2 border-slate-200 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>
            </form>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {rootTopics.map((topic, idx) => (
                <button
                  key={topic.id}
                  onClick={() => handleTopicClick(topic)}
                  className="group relative rounded-lg border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 text-left transition-all hover:border-blue-300 hover:shadow-lg hover:-translate-y-1"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {topic.name}
                  </h3>
                  {topic.description && (
                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                      {topic.description}
                    </p>
                  )}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>

            {/* Toggle Button */}
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => setShowFeed(!showFeed)}
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                {showFeed ? 'Hide' : 'Show'} Trending Topics Feed
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Trending Topics Feed (optional) */}
      {showFeed && <DiscoverFeed />}
    </>
  )
}

export default Discover
