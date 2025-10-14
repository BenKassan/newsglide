import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'

interface Question {
  question: string
  category: string
}

interface ThoughtProvokingQuestionsProps {
  questions: Question[] | string[] // Support both old and new format
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

  // Group questions by category
  const groupedQuestions = formattedQuestions.reduce((acc, q) => {
    if (!acc[q.category]) {
      acc[q.category] = []
    }
    acc[q.category].push(q.question)
    return acc
  }, {} as Record<string, string[]>)

  return (
    <div className="sticky top-24 space-y-4">
      <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white pb-6">
          <CardTitle className="text-xl">
            Key questions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 pb-4">
          <div className="space-y-4">
            {Object.entries(groupedQuestions).map(([category, categoryQuestions], index) => (
              <div
                key={index}
                className="group relative"
              >
                {/* Question Card */}
                <div className="relative p-4 rounded-lg border border-gray-200 hover:border-teal-300 transition-all duration-300 hover:shadow-md bg-white">
                  {/* Category Badge */}
                  <div className="mb-3">
                    <Badge
                      variant="secondary"
                      className="text-xs font-medium bg-gray-100 text-gray-700 border-0"
                    >
                      {category}
                    </Badge>
                  </div>

                  {/* Questions List */}
                  <div className="space-y-3">
                    {categoryQuestions.map((question, qIndex) => (
                      <p
                        key={qIndex}
                        className="text-sm leading-relaxed text-gray-700 font-medium group-hover:text-gray-900 transition-colors"
                      >
                        {question}
                      </p>
                    ))}
                  </div>

                  {/* Hover Effect Line */}
                  <div
                    className="absolute left-0 top-0 h-full w-1 bg-teal-100 rounded-l-lg transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}