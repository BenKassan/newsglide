import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Loader2, ChevronLeft, Sparkles, CheckCircle, ChevronRight } from 'lucide-react'
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
    question: 'What field are you in or interested in?',
    type: 'multiple',
    options: [
      'Technology',
      'Business',
      'Science',
      'Medicine',
      'Law',
      'Education',
      'Arts',
      'Engineering',
      'Finance',
      'Politics',
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
      'Hobbyist',
      'Retiree',
    ],
  },
  {
    id: 'interests',
    question: 'What topics interest you most?',
    type: 'multiple',
    options: [
      'AI & Machine Learning',
      'Climate Change',
      'Space Exploration',
      'Healthcare Innovation',
      'Economic Trends',
      'Social Media',
      'Cryptocurrency',
      'Politics & Policy',
      'Sports',
      'Entertainment',
    ],
  },
  {
    id: 'depth',
    question: 'How do you prefer to consume news?',
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
    question: "What's your goal with staying informed?",
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
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<string[]>([])

  const handleAnswer = (questionId: string, option: string, type: 'single' | 'multiple') => {
    if (type === 'single') {
      setAnswers({ ...answers, [questionId]: [option] })
    } else {
      const current = answers[questionId] || []
      if (current.includes(option)) {
        setAnswers({ ...answers, [questionId]: current.filter((o) => o !== option) })
      } else {
        setAnswers({ ...answers, [questionId]: [...current, option] })
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
      // Call edge function to get AI recommendations
      const response = await fetch('/api/generate-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })

      // For now, use mock recommendations
      // TODO: Implement edge function
      setTimeout(() => {
        const mockRecommendations = [
          'Latest AI regulations and policy updates',
          'Breakthrough medical technologies in 2025',
          'Climate tech startup funding trends',
          'Quantum computing commercial applications',
          'Global economic outlook post-2024',
        ]
        setRecommendations(mockRecommendations)
        setLoading(false)
      }, 2000)
    } catch (error) {
      console.error('Failed to generate recommendations:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate recommendations. Please try again.',
        variant: 'destructive',
      })
      setLoading(false)
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
                {recommendations.map((topic, index) => (
                  <button
                    key={index}
                    onClick={() => navigate('/', { state: { searchTopic: topic } })}
                    className="w-full p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg hover:from-blue-100 hover:to-purple-100 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 group-hover:text-blue-700">
                        {topic}
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                ))}
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
        <Button onClick={() => navigate('/')} variant="ghost" className="mb-6">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

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
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{option}</span>
                      {isSelected && <CheckCircle className="h-5 w-5 text-blue-600" />}
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
