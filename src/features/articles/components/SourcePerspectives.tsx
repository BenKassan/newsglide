import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { Disagreement } from '@/services/openaiService'

interface SourcePerspectivesProps {
  summaryPoints: string[]
  disagreements: Disagreement[]
}

export const SourcePerspectives: React.FC<SourcePerspectivesProps> = ({
  summaryPoints,
  disagreements,
}) => {
  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-800">
          Source Perspectives
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Common Ground Section */}
        {summaryPoints && summaryPoints.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Common Ground
            </h4>
            <ul className="space-y-2">
              {summaryPoints.slice(0, 3).map((point, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Points of Disagreement Section */}
        {disagreements && disagreements.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-orange-700 mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Points of Disagreement
            </h4>
            <ul className="space-y-2">
              {disagreements.map((disagreement, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>
                    <span className="font-medium">{disagreement.pointOfContention}:</span>{' '}
                    {disagreement.details}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
