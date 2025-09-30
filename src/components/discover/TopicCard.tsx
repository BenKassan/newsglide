import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, TrendingUp, Clock } from 'lucide-react'
import { DiscoverTopic } from '@/services/discoverService'

interface TopicCardProps {
  topic: DiscoverTopic
}

export function TopicCard({ topic }: TopicCardProps) {
  const navigate = useNavigate()
  const [isHovered, setIsHovered] = useState(false)

  const handleGenerate = () => {
    // Navigate to home page with the topic pre-filled
    navigate('/', { state: { searchTopic: topic.title } })
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
      onClick={handleGenerate}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative overflow-hidden rounded-xl glass-card glass-card-hover transition-all duration-300 hover:scale-105 hover:shadow-xl text-left w-full"
    >
      {/* Image */}
      <div className="relative h-40 overflow-hidden bg-slate-200">
        {topic.image ? (
          <img
            src={topic.image}
            alt={topic.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600">
            <TrendingUp className="h-12 w-12 text-white/50" />
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Freshness badge */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium backdrop-blur-sm ${getFreshnessColor()}`}>
            <Clock className="h-3 w-3" />
            {getFreshnessLabel()}
          </span>
        </div>

        {/* Source count */}
        {topic.sourceCount && (
          <div className="absolute top-2 right-2">
            <span className="flex items-center gap-1 text-xs bg-white/90 text-slate-900 rounded-full px-2 py-0.5 backdrop-blur-sm">
              <TrendingUp className="h-3 w-3" />
              {topic.sourceCount}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-2">
          {topic.title}
        </h3>
        <div className="flex items-center text-xs text-slate-500">
          <Sparkles className={`mr-1.5 h-3.5 w-3.5 transition-transform duration-300 ${isHovered ? 'rotate-12 scale-110' : ''}`} />
          <span>Click to generate analysis</span>
        </div>
      </div>
    </button>
  )
}
