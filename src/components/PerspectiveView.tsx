
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Perspective {
  headline: string;
  narrative: string;
  emphasis: string;
}

interface PerspectiveViewProps {
  perspective: Perspective;
  color: 'blue' | 'red' | 'purple' | 'green';
  title: string;
}

export const PerspectiveView = ({ perspective, color, title }: PerspectiveViewProps) => {
  const colorClasses = {
    blue: {
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      title: 'text-blue-800',
      text: 'text-blue-700'
    },
    red: {
      border: 'border-red-200',
      bg: 'bg-red-50',
      title: 'text-red-800',
      text: 'text-red-700'
    },
    purple: {
      border: 'border-purple-200',
      bg: 'bg-purple-50',
      title: 'text-purple-800',
      text: 'text-purple-700'
    },
    green: {
      border: 'border-green-200',
      bg: 'bg-green-50',
      title: 'text-green-800',
      text: 'text-green-700'
    }
  };

  const classes = colorClasses[color];

  if (!perspective) {
    return (
      <Card className={`${classes.border} ${classes.bg}`}>
        <CardContent className="p-6">
          <p className="text-sm text-gray-600">This perspective is not available for the current topic.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${classes.border} ${classes.bg}`}>
      <CardHeader>
        <CardTitle className={`${classes.title} text-lg`}>
          {title}
        </CardTitle>
        <h3 className={`${classes.title} font-semibold text-base`}>
          {perspective.headline}
        </h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className={`${classes.title} font-medium mb-2`}>Narrative:</h4>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {perspective.narrative}
            </p>
          </div>
          
          <div>
            <h4 className={`${classes.title} font-medium mb-2`}>Key Focus:</h4>
            <p className={`${classes.text} text-sm leading-relaxed`}>
              {perspective.emphasis}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
