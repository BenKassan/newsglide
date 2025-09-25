import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Plus, Search, Sparkles, BookmarkPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/use-toast'

interface RecommendationSelectorProps {
  recommendations: string[]
  onComplete: () => void
  onClose: () => void
  userId?: string
}

export function RecommendationSelector({ 
  recommendations, 
  onComplete, 
  onClose,
  userId 
}: RecommendationSelectorProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [queuedTopics, setQueuedTopics] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Take only the first 5 recommendations
  const displayRecommendations = recommendations.slice(0, 5)

  const handleSelectTopic = (topic: string) => {
    setSelectedTopic(topic)
    // Remove from queue if it was queued
    setQueuedTopics(queuedTopics.filter(t => t !== topic))
  }

  const handleQueueTopic = (topic: string) => {
    if (topic === selectedTopic) {
      setSelectedTopic(null)
    }
    
    if (queuedTopics.includes(topic)) {
      setQueuedTopics(queuedTopics.filter(t => t !== topic))
    } else {
      setQueuedTopics([...queuedTopics, topic])
    }
  }

  const handleStartSearching = async () => {
    if (!selectedTopic) {
      toast({
        title: 'Please select a topic',
        description: 'Choose a topic to search first, or queue topics for later.',
        variant: 'default',
      })
      return
    }

    setLoading(true)

    try {
      // Save queued topics to localStorage (will be moved to database later)
      if (userId && queuedTopics.length > 0) {
        const queueKey = `recommendation_queue_${userId}`
        const existingQueue = JSON.parse(localStorage.getItem(queueKey) || '[]')
        const updatedQueue = [...new Set([...existingQueue, ...queuedTopics])]
        localStorage.setItem(queueKey, JSON.stringify(updatedQueue))
      }

      toast({
        title: 'Starting your personalized experience',
        description: queuedTopics.length > 0 
          ? `Searching for "${selectedTopic}" with ${queuedTopics.length} topics queued for later.`
          : `Searching for "${selectedTopic}"`,
        variant: 'success',
      })

      // Navigate to home with the selected topic
      navigate('/', { state: { searchTopic: selectedTopic } })
      
      onComplete()
      onClose()
    } catch (error) {
      console.error('Failed to start search:', error)
      toast({
        title: 'Error',
        description: 'Failed to start your search. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-3">
          Your Personalized Recommendations
        </h2>
        <p className="text-slate-600">
          Based on your interests, we've selected these topics for you. Choose one to explore now and save others for later.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {displayRecommendations.map((topic, index) => {
          const isSelected = selectedTopic === topic
          const isQueued = queuedTopics.includes(topic)

          return (
            <Card 
              key={index}
              className={`transition-all duration-200 cursor-pointer ${
                isSelected 
                  ? 'ring-2 ring-blue-500 bg-blue-50/50' 
                  : isQueued
                  ? 'ring-1 ring-purple-400 bg-purple-50/30'
                  : 'hover:shadow-md'
              }`}
              onClick={() => handleSelectTopic(topic)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isSelected 
                        ? 'bg-blue-100' 
                        : isQueued
                        ? 'bg-purple-100'
                        : 'bg-slate-100'
                    }`}>
                      {isSelected ? (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      ) : isQueued ? (
                        <BookmarkPlus className="w-5 h-5 text-purple-600" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{topic}</h3>
                      {isSelected && (
                        <p className="text-sm text-blue-600 mt-1">Selected for immediate search</p>
                      )}
                      {isQueued && !isSelected && (
                        <p className="text-sm text-purple-600 mt-1">Saved for later</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant={isQueued ? "default" : "outline"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleQueueTopic(topic)
                    }}
                    className={isQueued ? "bg-purple-600 hover:bg-purple-700" : ""}
                  >
                    {isQueued ? (
                      <>
                        <BookmarkPlus className="w-4 h-4 mr-1" />
                        Queued
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1" />
                        Queue
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-col space-y-3">
        <Button
          size="lg"
          onClick={handleStartSearching}
          disabled={!selectedTopic || loading}
          className="w-full"
        >
          {loading ? (
            'Starting...'
          ) : (
            <>
              <Search className="w-5 h-5 mr-2" />
              Start with Selected Topic
            </>
          )}
        </Button>
        
        {queuedTopics.length > 0 && (
          <p className="text-sm text-center text-slate-600">
            {queuedTopics.length} topic{queuedTopics.length > 1 ? 's' : ''} saved for later exploration
          </p>
        )}
      </div>
    </div>
  )
}