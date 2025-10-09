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
      className="group relative overflow-hidden rounded-lg glass-card glass-card-hover transition-all duration-300 hover:scale-105 hover:shadow-xl text-left w-full p-4"
    >
      <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
        {topic.title}
      </h3>
      <div className="flex items-center text-xs text-slate-500">
        <Sparkles className={`mr-1.5 h-3.5 w-3.5 transition-transform duration-300 ${isHovered ? 'rotate-12 scale-110' : ''}`} />
        <span>Click to generate analysis</span>
      </div>
    </button>
  )
}
