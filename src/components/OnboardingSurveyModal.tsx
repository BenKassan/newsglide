import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { Sparkles, ChevronRight, ChevronLeft, X } from 'lucide-react'
import { useAuth } from '@features/auth'
import { supabase } from '@/integrations/supabase/client'
import { personalizationService } from '@/services/personalizationService'
import { generateContextualRecommendations } from '@/services/recommendationService'
import { useToast } from '@shared/hooks/use-toast'

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

interface OnboardingSurveyModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export function OnboardingSurveyModal({ isOpen, onClose, onComplete }: OnboardingSurveyModalProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

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
      // Transform answers into the format expected
      const surveyResponses = {
        fieldOfInterest: answers.field || [],
        role: answers.role?.[0] || '',
        topicInterests: answers.interests || [],
        newsConsumption: answers.depth?.[0] || '',
        goals: answers.goals || [],
      }

      // Save survey responses
      if (user) {
        await personalizationService.saveSurveyResponses(user.id, surveyResponses)
      }

      // Generate initial recommendations
      const { recommendations } = generateContextualRecommendations(answers)
      
      toast({
        title: 'Welcome to NewsGlide!',
        description: 'Your personalized news experience is ready.',
        variant: 'success',
      })
      
      // Navigate to home with a recommendation
      navigate('/', { state: { searchTopic: recommendations[0] } })
      
      onComplete()
      onClose()
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
      </DialogContent>
    </Dialog>
  )
}