
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle } from "lucide-react";

interface DisputedFact {
  claim: string;
  leftSource: string;
  rightSource: string;
  evidence: string;
}

interface FactOpinionViewProps {
  factualCore: string[];
  disputedFacts: DisputedFact[];
}

export const FactOpinionView = ({ factualCore, disputedFacts }: FactOpinionViewProps) => {
  return (
    <div className="space-y-4">
      {/* Facts Section */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Verified Facts (All Sources Agree)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {factualCore && factualCore.length > 0 ? (
            <ul className="space-y-2">
              {factualCore.map((fact, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm leading-relaxed">{fact}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">No universally agreed facts identified across sources.</p>
          )}
        </CardContent>
      </Card>

      {/* Disputed Section */}
      {disputedFacts && disputedFacts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Disputed or Unclear
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {disputedFacts.map((dispute, i) => (
                <div key={i} className="p-3 bg-white rounded-lg border">
                  <p className="font-semibold mb-2 text-sm">{dispute.claim}</p>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div className="p-2 bg-blue-50 rounded">
                      <span className="font-medium text-blue-800">Progressive view:</span>
                      <p className="text-blue-700 mt-1">{dispute.leftSource}</p>
                    </div>
                    <div className="p-2 bg-red-50 rounded">
                      <span className="font-medium text-red-800">Conservative view:</span>
                      <p className="text-red-700 mt-1">{dispute.rightSource}</p>
                    </div>
                  </div>
                  {dispute.evidence && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <span className="font-medium">Evidence available:</span> {dispute.evidence}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
