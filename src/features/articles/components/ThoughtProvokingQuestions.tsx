import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import {
  Brain,
  TrendingUp,
  Heart,
  History,
  Network,
  User,
  Sparkles,
  HelpCircle,
} from 'lucide-react'

interface Question {
  question: string
  category: string
}

interface ThoughtProvokingQuestionsProps {
  questions: Question[] | string[] // Support both old and new format
}

// Map categories to icons and colors
const categoryConfig: Record<string, { icon: React.ComponentType<any>; color: string; bgColor: string }> = {
  'Critical Thinking': {
    icon: Brain,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  'Future Impact': {
    icon: TrendingUp,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  'Ethical Implications': {
    icon: Heart,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  'Historical Context': {
    icon: History,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  'Systemic Analysis': {
    icon: Network,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  'Personal Reflection': {
    icon: User,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
}

// Default icon for questions without categories
const defaultConfig = {
  icon: HelpCircle,
  color: 'text-gray-600',
  bgColor: 'bg-gray-50',
}

export const ThoughtProvokingQuestions: React.FC<ThoughtProvokingQuestionsProps> = ({ questions }) => {
  if (!questions || questions.length === 0) {
    return null
  }

  // Convert questions to uniform format
  const formattedQuestions: Question[] = questions.map(q => {
    if (typeof q === 'string') {
      // Old format - just a string
      return {
        question: q,
        category: 'Critical Thinking', // Default category for old format
      }
    }
    return q
  })

  return (
    <div className="sticky top-24 space-y-4">
      <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white pb-6">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-6 w-6" />
            Thought-Provoking Questions
          </CardTitle>
          <p className="text-sm text-purple-100 mt-2">
            Explore deeper dimensions of this story
          </p>
        </CardHeader>
        <CardContent className="pt-6 pb-4">
          <div className="space-y-4">
            {formattedQuestions.map((item, index) => {
              const config = categoryConfig[item.category] || defaultConfig
              const IconComponent = config.icon

              return (
                <div
                  key={index}
                  className="group relative"
                >
                  {/* Question Card */}
                  <div className="relative p-4 rounded-lg border border-gray-200 hover:border-purple-300 transition-all duration-300 hover:shadow-md bg-white">
                    {/* Category Badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className={`p-1.5 rounded-full ${config.bgColor} ${config.color} transition-transform group-hover:scale-110`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-xs font-medium ${config.bgColor} ${config.color} border-0`}
                      >
                        {item.category}
                      </Badge>
                    </div>

                    {/* Question Text */}
                    <p className="text-sm leading-relaxed text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
                      {item.question}
                    </p>

                    {/* Hover Effect Line */}
                    <div
                      className={`absolute left-0 top-0 h-full w-1 ${config.bgColor} rounded-l-lg transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300`}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Reflection Prompt */}
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
            <p className="text-xs text-purple-700 font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Take a moment to reflect on these questions. They're designed to deepen your understanding and spark meaningful conversations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}