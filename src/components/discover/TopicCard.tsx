import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Clock } from 'lucide-react'
import { DiscoverTopic } from '@/services/discoverService'

interface TopicCardProps {
  topic: DiscoverTopic
}

export function TopicCard({ topic }: TopicCardProps) {
  const navigate = useNavigate()
  const [isHovered, setIsHovered] = useState(false)

  const handleGenerate = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Create a URL-friendly slug from the topic title
    const topicSlug = topic.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')      // Replace spaces with hyphens
      .replace(/--+/g, '-')      // Replace multiple hyphens with single hyphen
      .trim()

    console.log('TopicCard clicked:', topic.title)
    console.log('Navigating to:', `/discover/${topicSlug}`)

    // Navigate to the topic detail page
    navigate(`/discover/${topicSlug}`)
  }

  // Get freshness indicator
  const getFreshnessColor = () => {
    switch (topic.freshness) {
      case 'breaking':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'today':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'recent':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getFreshnessLabel = () => {
    switch (topic.freshness) {
      case 'breaking':
        return 'Breaking'
      case 'today':
        return 'Today'
      case 'recent':
        return 'Recent'
      default:
        return 'Recent'
    }
  }

  return (
    <button
      onClick={(e) => handleGenerate(e)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white via-white to-slate-50 border border-slate-200/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 text-left w-full p-4"
    >
      {/* Gradient Accent Border on Hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 pointer-events-none" />

      {/* Content */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors leading-tight mb-1">
            {topic.title}
          </h3>

          {/* Freshness Badge */}
          {topic.freshness && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getFreshnessColor()}`}>
              <Clock className="h-2.5 w-2.5" />
              {getFreshnessLabel()}
            </span>
          )}
        </div>

        {/* Icon with Animation */}
        <div className="flex-shrink-0">
          <div className={`transition-all duration-300 ${isHovered ? 'rotate-12 scale-110' : ''}`}>
            <Sparkles className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
          </div>
        </div>
      </div>

      {/* Hover Effect Line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
    </button>
  )
}
