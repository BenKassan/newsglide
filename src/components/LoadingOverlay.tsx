
import React from 'react';
import { Search, FileText, Sparkles, CheckCircle, Loader2 } from 'lucide-react';

interface LoadingStage {
  id: 'searching' | 'analyzing' | 'generating';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface LoadingOverlayProps {
  loading: boolean;
  topic: string;
  loadingStage: 'searching' | 'analyzing' | 'generating' | '';
  fakeProgress: number;
}

const loadingStages: LoadingStage[] = [
  { 
    id: 'searching', 
    label: 'Searching for articles...', 
    icon: Search
  },
  { 
    id: 'analyzing', 
    label: 'Analyzing sources...', 
    icon: FileText
  },
  { 
    id: 'generating', 
    label: 'Generating synthesis...', 
    icon: Sparkles
  }
];

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loading,
  topic,
  loadingStage,
  fakeProgress
}) => {
  if (!loading) return null;

  const currentStage = loadingStages.find(s => s.id === loadingStage) || loadingStages[0];
  const Icon = currentStage.icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Calm rotating icon */}
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full"></div>
            <div className="relative flex items-center justify-center h-full">
              <Icon className="h-10 w-10 text-blue-600 animate-slow-spin" />
            </div>
          </div>

          {/* Stage text */}
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {currentStage.label}
          </h3>
          
          {/* Topic */}
          <p className="text-sm text-gray-600 mb-6">
            Analyzing: <span className="font-medium">{topic}</span>
          </p>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-200"
                style={{ width: `${fakeProgress}%` }}
              />
            </div>
            <p className="text-center text-xs text-gray-600 mt-2">{fakeProgress}%</p>
          </div>

          {/* Calm stage indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {loadingStages.map((stage, index) => {
              const StageIcon = stage.icon;
              const isComplete = loadingStages.findIndex(s => s.id === loadingStage) > index;
              const isCurrent = stage.id === loadingStage;
              
              return (
                <div
                  key={stage.id}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs transition-all duration-500 ${
                    isComplete
                      ? 'bg-green-100 text-green-700'
                      : isCurrent
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <StageIcon className="h-3 w-3" />
                  )}
                  <span className="hidden sm:inline">{stage.id}</span>
                </div>
              );
            })}
          </div>

          {/* Static tip */}
          <p className="text-xs text-gray-500 mt-6">
            💡 Tip: More specific topics yield better results
          </p>
        </div>
      </div>
    </div>
  );
};
