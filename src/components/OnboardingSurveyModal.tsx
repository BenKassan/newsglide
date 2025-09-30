import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Button } from '@ui/button'
import { Card } from '@ui/card'
import { Badge } from '@ui/badge'
import { Progress } from '@ui/progress'
import { Sparkles, ChevronRight, ChevronLeft } from 'lucide-react'
import { useAuth } from '@features/auth'
import { supabase } from '@/integrations/supabase/client'
import { personalizationService } from '@/services/personalizationService'
import { generateContextualRecommendations } from '@/services/recommendationService'
import { useToast } from '@shared/hooks/use-toast'
import { RecommendationSelector } from './RecommendationSelector'

interface Question {
  id: string
  question: string
  type: 'single' | 'multiple'
  options: string[]
}

const questions: Question[] = [
  {
    id: 'interests',
    question: 'What topics interest you most? (select up to 5)',
    type: 'multiple',
    options: [
      'AI & Machine Learning',
      'Business & Finance',
      'Climate & Environment',
      'Healthcare Innovation',
      'Space & Science',
      'Technology & Cybersecurity',
      'Economics & Markets',
      'Politics & Policy',
      'Education & Research',
      'Arts & Entertainment',
      'Engineering & Innovation',
      'Cryptocurrency & Web3',
      'Sports & Fitness',
      'Social Issues',
      'Global Affairs',
    ],
  },
  {
    id: 'usage',
    question: 'How do you use news in your life? (select up to 3)',
    type: 'multiple',
    options: [
      'Professional development & career growth',
      'Academic research & learning',
      'Investment & financial decisions',
      'Business strategy & entrepreneurship',
      'Teaching & sharing knowledge',
      'Personal interest & curiosity',
      'Staying informed for conversations',
      'Industry trends & insights',
      'Innovation & new ideas',
      'Policy & regulatory awareness',
    ],
  },
  {
    id: 'style',
    question: 'What\'s your preferred content style?',
    type: 'single',
    options: [
      'Quick summaries (5-minute reads)',
      'Detailed analysis (10-15 minute reads)',
      'Technical deep-dives',
      'Simple explanations',
      'Mix of everything',
    ],
  },
]

interface OnboardingSurveyModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export function OnboardingSurveyModal({ isOpen, onClose, onComplete }: OnboardingSurveyModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [recommendations, setRecommendations] = useState<string[]>([])

  const handleAnswer = (questionId: string, option: string, type: 'single' | 'multiple') => {
    if (type === 'single') {
      setAnswers({ ...answers, [questionId]: [option] })
    } else {
      const current = answers[questionId] || []
      const maxSelections = questionId === 'interests' ? 5 : questionId === 'usage' ? 3 : 5
      
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
      completeSurvey()
    }
  }

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const handleSkip = async () => {
    // Mark onboarding as skipped
    if (user) {
      try {
        await supabase
          .from('user_preferences')
          .update({ onboarding_completed: true })
          .eq('user_id', user.id)
        
        // Cache the completion status
        sessionStorage.setItem(`onboarding_completed_${user.id}`, 'true')
      } catch (error) {
        console.error('Error updating onboarding status:', error)
      }
    }
    
    toast({
      title: 'Survey skipped',
      description: 'You can always complete it later in your preferences.',
      variant: 'default',
    })
    
    onComplete()
    onClose()
  }

  const completeSurvey = async () => {
    setLoading(true)
    try {
      // Transform answers into the format expected with new question structure
      const surveyResponses = {
        fieldOfInterest: [], // No longer used
        role: '', // No longer used
        topicInterests: answers.interests || [],
        newsConsumption: answers.style?.[0] || '',
        goals: answers.usage || [],
      }

      // Save survey responses
      if (user) {
        await personalizationService.saveSurveyResponses(user.id, surveyResponses)
      }

      // Generate initial recommendations
      const { recommendations: generatedRecs } = generateContextualRecommendations(answers)
      
      // Cache the completion status
      if (user) {
        sessionStorage.setItem(`onboarding_completed_${user.id}`, 'true')
      }
      
      // Show recommendations instead of auto-navigating
      setRecommendations(generatedRecs)
      setShowRecommendations(true)
    } catch (error) {
      console.error('Failed to complete survey:', error)
      toast({
        title: 'Error',
        description: 'Failed to save your preferences. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const currentQ = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100
  const canProceed = currentQ.type === 'single' 
    ? answers[currentQ.id]?.length === 1 
    : answers[currentQ.id]?.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm">
        {!showRecommendations ? (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <DialogTitle className="text-gray-900">Personalize Your News Experience</DialogTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Skip for now
                </Button>
              </div>
              <DialogDescription className="text-gray-600">
                Help us understand your interests to deliver the most relevant news to you.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">
          <Progress value={progress} className="mb-6" />
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">{currentQ.question}</h3>
            {currentQ.type === 'multiple' && (
              <p className="text-sm text-gray-600">Select all that apply</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {currentQ.options.map((option) => {
              const isSelected = answers[currentQ.id]?.includes(option)
              return (
                <Card
                  key={option}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                  onClick={() => handleAnswer(currentQ.id, option, currentQ.type)}
                >
                  <div className="flex items-center justify-between">
                    <span className={`${isSelected ? 'font-medium text-blue-700' : 'text-gray-700'}`}>{option}</span>
                    {isSelected && (
                      <Badge variant="default" className="ml-2 bg-blue-600">
                        Selected
                      </Badge>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentQuestion === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={!canProceed || loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {currentQuestion === questions.length - 1 ? (
                loading ? 'Completing...' : 'Complete'
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500 mt-4">
            Question {currentQuestion + 1} of {questions.length}
          </p>
        </div>
          </>
        ) : (
          <RecommendationSelector
            recommendations={recommendations}
            onComplete={onComplete}
            onClose={onClose}
            userId={user?.id}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}