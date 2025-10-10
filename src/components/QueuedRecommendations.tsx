import { useState, useEffect } from 'react'
import { Button } from '@ui/button'
import { Card, CardContent } from '@ui/card'
import { BookmarkIcon, Search, X, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@features/auth'

interface QueuedRecommendationsProps {
  onSelectTopic?: (topic: string) => void
  className?: string
}

export function QueuedRecommendations({ 
  onSelectTopic,
  className = ''
}: QueuedRecommendationsProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [queue, setQueue] = useState<string[]>([])
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (user) {
      const queueKey = `recommendation_queue_${user.id}`
      const savedQueue = JSON.parse(localStorage.getItem(queueKey) || '[]')
      setQueue(savedQueue)
    }
  }, [user])

  const handleRemoveFromQueue = (topic: string) => {
    if (!user) return
    
    const updatedQueue = queue.filter(t => t !== topic)
    setQueue(updatedQueue)
    
    const queueKey = `recommendation_queue_${user.id}`
    localStorage.setItem(queueKey, JSON.stringify(updatedQueue))
  }

  const handleSearchTopic = (topic: string) => {
    if (onSelectTopic) {
      onSelectTopic(topic)
    } else {
      navigate('/', { state: { searchTopic: topic } })
    }
    handleRemoveFromQueue(topic)
  }

  if (queue.length === 0) {
    return null
  }

  return (
    <div className={`${className}`}>
      <Card className="border-purple-200 bg-purple-50/50">
        <CardContent className="p-4">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center space-x-2">
              <BookmarkIcon className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-slate-900">
                Your Saved Topics ({queue.length})
              </h3>
            </div>
            <ChevronRight 
              className={`w-5 h-5 text-purple-600 transition-transform duration-200 ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          </div>

          {isExpanded && (
            <div className="mt-4 space-y-2">
              {queue.map((topic, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100 hover:border-purple-300 transition-colors"
                >
                  <span className="text-sm text-slate-700 flex-1 mr-2">{topic}</span>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSearchTopic(topic)}
                      className="text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveFromQueue(topic)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <p className="text-xs text-slate-500 mt-3 text-center">
                Click on a topic to search or remove from queue
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}