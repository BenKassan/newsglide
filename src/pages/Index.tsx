import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send, Search, Sparkles } from 'lucide-react'
import { NewsData, synthesizeNews, askQuestion } from '@/services/openaiService'
import { DebateSection } from '@features/debates'
import { MorganFreemanPlayer } from '@/components/MorganFreemanPlayer'
import { QueuedRecommendations } from '@/components/QueuedRecommendations'
import { OnboardingSurveyModal } from '@/components/OnboardingSurveyModal'
import UnifiedNavigation from '@/components/UnifiedNavigation'
import { useAuth } from '@features/auth'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { saveSearchToHistory } from '@/services/searchHistoryService'
import { localStorageService } from '@/services/localStorageService'
import { toast } from 'sonner'

const Index = () => {
  const { user } = useAuth() // Optional - user might be null
  const { incrementSearchCount } = useSubscription()
  
  const [topic, setTopic] = useState('')
  const [newsData, setNewsData] = useState<NewsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [conversation, setConversation] = useState<Array<{ question: string; answer: string }>>([])
  const [questionLoading, setQuestionLoading] = useState(false)
  const [selectedReadingLevel, setSelectedReadingLevel] = useState<'base' | 'eli5' | 'phd'>('base')
  const [showSurvey, setShowSurvey] = useState(false)
  const [searchCount, setSearchCount] = useState(0) // Track searches for non-auth users

  // Auto-focus search on load since we skip landing
  useEffect(() => {
    // Show gentle signup prompt after 3 searches for non-authenticated users
    if (!user && searchCount >= 3 && searchCount % 3 === 0) {
      toast.success("💡 Sign up to save your searches and articles!", {
        description: "Continue using all features without limits - just sign up to save your progress",
        duration: 5000
      })
    }
  }, [searchCount, user])

  const handleSearch = async (searchTopic: string) => {
    if (!searchTopic.trim()) return

    setLoading(true)
    setNewsData(null)
    setConversation([])

    try {
      // Increment search count (works for both auth and non-auth users)
      await incrementSearchCount()
      if (!user) {
        setSearchCount(prev => prev + 1)
      }

      const result = await synthesizeNews({ 
        topic: searchTopic,
        targetOutlets: [
          { name: 'Reuters', type: 'News Agency' },
          { name: 'CNN', type: 'Broadcast Media' },
          { name: 'The Guardian', type: 'National Newspaper' }
        ]
      })
      
      setNewsData(result)

      // Save to history (Supabase for auth users, localStorage for non-auth)
      if (user) {
        await saveSearchToHistory(user.id, searchTopic, result)
      } else {
        localStorageService.saveSearchToHistory({
          topic: searchTopic,
          news_data: result
        })
      }

    } catch (error: any) {
      console.error('Search error:', error)
      toast.error('Failed to search news', {
        description: error?.message || 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleQuestionSubmit = async () => {
    if (!currentQuestion.trim() || !newsData) return

    setQuestionLoading(true)
    
    try {
      const questionRequest = {
        question: currentQuestion,
        topic: newsData.summaryPoints?.[0] || 'News Topic',
        context: {
          headline: newsData.summaryPoints?.[0] || '',
          summaryPoints: newsData.summaryPoints || [],
          sources: newsData.sources || []
        }
      }
      const answer = await askQuestion(questionRequest)
      setConversation(prev => [...prev, { question: currentQuestion, answer }])
      setCurrentQuestion('')
    } catch (error: any) {
      console.error('Question error:', error)
      toast.error('Failed to answer question', {
        description: error?.message || 'Please try again'
      })
    } finally {
      setQuestionLoading(false)
    }
  }

  // Remove unused callback since we removed RecommendationSelector
  // const handleRecommendationSelect = useCallback((recommendation: string) => {
  //   setTopic(recommendation)
  //   handleSearch(recommendation)
  // }, [selectedReadingLevel])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <UnifiedNavigation showAuth={true} />
      
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Search Section */}
        <div className="text-center space-y-6 pt-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              NewsGlide
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              AI-powered news synthesis with unlimited access to all features
            </p>
            {!user && (
              <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200">
                ✨ Unlimited Access - No Sign-up Required
              </Badge>
            )}
          </div>

          {/* Search Form */}
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter any news topic..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(topic)}
                disabled={loading}
                className="flex-1"
              />
              <Button 
                onClick={() => handleSearch(topic)}
                disabled={loading || !topic.trim()}
                size="lg"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Reading Level Selector */}
            <div className="flex justify-center gap-2">
              {(['base', 'eli5', 'phd'] as const).map((level) => (
                <Button
                  key={level}
                  variant={selectedReadingLevel === level ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedReadingLevel(level)}
                >
                  {level === 'base' ? 'Standard' : 
                   level === 'eli5' ? 'Simple' : 'Academic'}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="max-w-4xl mx-auto">
          <QueuedRecommendations />
        </div>

        {/* Loading State */}
        {loading && (
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Synthesizing news from multiple sources...</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {newsData && !loading && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Article Viewer */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-4">{newsData.headline}</h2>
                  <div className="prose max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {typeof newsData.article === 'string' ? newsData.article : JSON.stringify(newsData.article)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Q&A Section */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Ask Questions About This Article
                </h3>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask any question about this news..."
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleQuestionSubmit()}
                    disabled={questionLoading}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleQuestionSubmit}
                    disabled={questionLoading || !currentQuestion.trim()}
                  >
                    {questionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Conversation History */}
                {conversation.length > 0 && (
                  <div className="space-y-4 pt-4 border-t">
                    {conversation.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="font-medium text-blue-600">
                          Q: {item.question}
                        </div>
                        <div className="text-gray-700 pl-4 border-l-2 border-blue-200">
                          {item.answer}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Morgan Freeman Player - Available to everyone */}
            <MorganFreemanPlayer 
              text={typeof newsData.article === 'string' ? newsData.article : JSON.stringify(newsData.article)}
              articleType={selectedReadingLevel}
              topic={newsData.summaryPoints?.[0] || 'News Topic'}
            />

            {/* AI Debate Section - Available to everyone */}
            <DebateSection 
              newsData={newsData} 
              selectedReadingLevel={selectedReadingLevel}
            />
          </div>
        )}

        {/* Onboarding Survey Modal */}
        <OnboardingSurveyModal
          isOpen={showSurvey}
          onClose={() => setShowSurvey(false)}
          onComplete={() => setShowSurvey(false)}
        />
      </main>
    </div>
  )
}

export default Index