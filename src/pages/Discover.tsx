import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Loader2, ChevronLeft, Sparkles, CheckCircle, ChevronRight, Heart, X } from 'lucide-react'
import { useToast } from '@shared/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@features/auth'
import { personalizationService } from '@/services/personalizationService'
import { generateUUID } from '@/utils/polyfills'
import { generateContextualRecommendations } from '@/services/recommendationService'

interface Question {
  id: string
  question: string
  type: 'single' | 'multiple'
  options: string[]
}

const questions: Question[] = [
  {
    id: 'field',
    question: 'What fields interest you most?',
    type: 'multiple',
    options: [
      'Technology',
      'Business',
      'Science',
      'Medicine',
      'Finance',
      'Education',
      'Politics',
      'Arts',
      'Engineering',
    ],
  },
  {
    id: 'role',
    question: 'What best describes you?',
    type: 'single',
    options: [
      'Student',
      'Professional',
      'Researcher',
      'Entrepreneur',
      'Educator',
      'Retiree',
      'Other',
    ],
  },
  {
    id: 'interests',
    question: 'Select your top interests (up to 3)',
    type: 'multiple',
    options: [
      'AI & Machine Learning',
      'Climate Change',
      'Space Exploration',
      'Healthcare Innovation',
      'Economic Trends',
      'Cryptocurrency',
      'Politics & Policy',
      'Sports',
      'Entertainment',
      'Cybersecurity',
    ],
  },
  {
    id: 'depth',
    question: 'How do you prefer your news?',
    type: 'single',
    options: [
      'Quick headlines',
      'In-depth analysis',
      'Technical details',
      'Simple explanations',
      'Balanced mix',
    ],
  },
  {
    id: 'goals',
    question: 'Why do you follow the news?',
    type: 'multiple',
    options: [
      'Professional development',
      'Academic research',
      'Personal interest',
      'Investment decisions',
      'General knowledge',
      'Social conversations',
    ],
  },
]

const Discover = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [likedRecommendations, setLikedRecommendations] = useState<string[]>([])
  const [sessionId] = useState(() => generateUUID())

  const handleAnswer = (questionId: string, option: string, type: 'single' | 'multiple') => {
    if (type === 'single') {
      setAnswers({ ...answers, [questionId]: [option] })
    } else {
      const current = answers[questionId] || []
      const maxSelections = questionId === 'interests' ? 3 : 5
      
      if (current.includes(option)) {
        setAnswers({ ...answers, [questionId]: current.filter((o) => o !== option) })
      } else if (current.length < maxSelections) {
        setAnswers({ ...answers, [questionId]: [...current, option] })
      } else {
        toast({
          title: 'Selection limit reached',
          description: `You can select up to ${maxSelections} options for this question.`,
          variant: 'default',
        })
      }
    }
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      generateRecommendations()
    }
  }

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const generateRecommendations = async () => {
    setLoading(true)
    try {
      // Transform answers into the format expected
      const surveyResponses = {
        fieldOfInterest: answers.field || [],
        role: answers.role?.[0] || '',
        topicInterests: answers.interests || [],
        newsConsumption: answers.depth?.[0] || '',
        goals: answers.goals || [],
      }

      // Save survey responses if user is authenticated
      if (user) {
        await personalizationService.saveSurveyResponses(user.id, surveyResponses)
      }

      try {
        // Try to call Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('generate-topics', {
          body: { 
            surveyResponses,
            includeCurrentEvents: true 
          },
        })

        if (!error && data?.recommendations && data.recommendations.length > 0) {
          setRecommendations(data.recommendations)
          
          // Load user's previously liked recommendations if available
          if (user) {
            const liked = await personalizationService.getLikedRecommendations(user.id)
            setLikedRecommendations(liked)
          }
          return // Success!
        }
      } catch (edgeFunctionError) {
        console.warn('Edge function not available, using fallback:', edgeFunctionError)
      }

      // Use fallback recommendation service
      const { recommendations, context } = generateContextualRecommendations(answers)
      setRecommendations(recommendations)
      
      // Still load liked recommendations
      if (user) {
        const liked = await personalizationService.getLikedRecommendations(user.id)
        setLikedRecommendations(liked)
      }
      
      // Show info that we're using fallback
      toast({
        title: 'Recommendations Generated',
        description: context,
        variant: 'default',
      })
      
    } catch (error) {
      console.error('Failed to generate recommendations:', error)
      
      // Last resort: use static recommendations
      const { recommendations } = generateContextualRecommendations(answers)
      setRecommendations(recommendations)
      
      toast({
        title: 'Using offline recommendations',
        description: 'We\'ve generated recommendations based on your interests.',
        variant: 'default',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLikeRecommendation = async (topic: string) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to save your preferences.',
        variant: 'default',
      })
      return
    }

    const isLiked = likedRecommendations.includes(topic)
    
    if (isLiked) {
      setLikedRecommendations(likedRecommendations.filter(t => t !== topic))
    } else {
      setLikedRecommendations([...likedRecommendations, topic])
    }

    // Update user preferences in database
    try {
      const { data: currentPrefs } = await supabase
        .from('user_preferences')
        .select('liked_recommendations')
        .eq('user_id', user.id)
        .single()

      const currentLiked = currentPrefs?.liked_recommendations || []
      let updatedLiked: string[]

      if (isLiked) {
        updatedLiked = currentLiked.filter((t: string) => t !== topic)
      } else {
        updatedLiked = [...new Set([...currentLiked, topic])]
      }

      await supabase
        .from('user_preferences')
        .update({ liked_recommendations: updatedLiked })
        .eq('user_id', user.id)

      toast({
        title: isLiked ? 'Removed from favorites' : 'Added to favorites',
        description: isLiked ? 'Topic removed from your liked recommendations.' : 'Topic saved to your liked recommendations.',
        variant: 'default',
      })
    } catch (error) {
      console.error('Error updating liked recommendations:', error)
      toast({
        title: 'Error',
        description: 'Failed to update your preferences.',
        variant: 'destructive',
      })
    }
  }

  const currentQ = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <Sparkles className="h-12 w-12 text-purple-600 mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-semibold mb-2">Generating Your Personalized Topics...</h3>
            <p className="text-sm text-gray-600 mb-4">Our AI is analyzing your interests</p>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (recommendations.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Button onClick={() => navigate('/')} variant="ghost" className="mb-6">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>

          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                Your Personalized Topics
              </CardTitle>
              <p className="text-gray-600">
                Based on your interests, here's what you should explore:
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.map((topic, index) => {
                  const isLiked = likedRecommendations.includes(topic)
                  return (
                    <div key={index} className="flex gap-2">
                      <button
                        onClick={async () => {
                          // Track recommendation click
                          if (user) {
                            await personalizationService.trackRecommendationClick(user.id, topic, sessionId)
                          }
                          navigate('/', { state: { searchTopic: topic } })
                        }}
                        className="flex-1 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg hover:from-blue-100 hover:to-purple-100 transition-all text-left group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800 group-hover:text-blue-700">
                            {topic}
                          </span>
                          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                        </div>
                      </button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleLikeRecommendation(topic)}
                        className={`${isLiked ? 'bg-red-50 border-red-200 hover:bg-red-100' : ''}`}
                      >
                        <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-500'}`} />
                      </Button>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 pt-6 border-t">
                <Button
                  onClick={() => {
                    setCurrentQuestion(0)
                    setAnswers({})
                    setRecommendations([])
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Start Over with Different Answers
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Button onClick={() => navigate('/')} variant="ghost">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <Button 
            onClick={() => {
              if (user) {
                supabase
                  .from('user_preferences')
                  .update({ onboarding_completed: true })
                  .eq('user_id', user.id)
                  .then(() => {
                    toast({
                      title: 'Survey skipped',
                      description: 'You can always complete it later.',
                      variant: 'default',
                    })
                    navigate('/')
                  })
              } else {
                navigate('/')
              }
            }}
            variant="ghost" 
            className="text-gray-500 hover:text-gray-700"
          >
            Skip for now
          </Button>
        </div>

        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Question {currentQuestion + 1} of {questions.length}
              </p>
            </div>
            <CardTitle className="text-xl">{currentQ.question}</CardTitle>
            {currentQ.type === 'multiple' && (
              <p className="text-sm text-gray-600 mt-2">Select all that apply</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentQ.options.map((option) => {
                const isSelected = answers[currentQ.id]?.includes(option)
                return (
                  <button
                    key={option}
                    onClick={() => handleAnswer(currentQ.id, option, currentQ.type)}
                    className={`w-full p-4 rounded-lg border transition-all text-left ${
                      isSelected
                        ? 'border-blue-400 bg-blue-500/20 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-gray-700'
                    } glass-card`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{option}</span>
                      {isSelected && <CheckCircle className="h-5 w-5 text-blue-400" />}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex justify-between mt-8">
              <Button onClick={handleBack} variant="outline" disabled={currentQuestion === 0}>
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!answers[currentQ.id] || answers[currentQ.id].length === 0}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {currentQuestion === questions.length - 1 ? 'Get Recommendations' : 'Next'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Discover
