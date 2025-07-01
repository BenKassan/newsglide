
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Brain } from "lucide-react";

interface MissingContextViewProps {
  missingContext: string[];
  biasIndicators: string[];
}

export const MissingContextView = ({ missingContext, biasIndicators }: MissingContextViewProps) => {
  return (
    <div className="space-y-4">
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5 text-purple-600" />
            What's Not Being Discussed
          </CardTitle>
        </CardHeader>
        <CardContent>
          {missingContext && missingContext.length > 0 ? (
            <ul className="space-y-2">
              {missingContext.map((context, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="leading-relaxed">{context}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">No major gaps identified in coverage.</p>
          )}
          <p className="text-xs text-gray-600 mt-3">
            These perspectives may be missing from mainstream coverage
          </p>
        </CardContent>
      </Card>

      {biasIndicators && biasIndicators.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-amber-600" />
              Bias Indicators Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {biasIndicators.map((indicator, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="leading-relaxed">{indicator}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-600 mt-3">
              These are signs of potential bias in the coverage
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
