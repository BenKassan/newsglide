
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from 'lucide-react';

interface SearchBarProps {
  topic: string;
  setTopic: (topic: string) => void;
  onSearch: (topic?: string) => void;
  loading: boolean;
}

const exampleTopics = [
  "OpenAI GPT-5",
  "Climate Summit 2025", 
  "Tesla Stock News",
  "AI Regulation Updates"
];

export const SearchBar: React.FC<SearchBarProps> = ({
  topic,
  setTopic,
  onSearch,
  loading
}) => {
  return (
    <>
      {/* Enhanced Search Bar */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
          <div className="relative flex gap-2 p-2 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Enter any current topic (e.g., 'OpenAI news today', 'climate summit 2025')"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onSearch()}
                className="pl-12 h-14 text-lg border-0 bg-transparent focus:ring-0 focus:border-0"
              />
            </div>
            <Button 
              onClick={() => onSearch()} 
              disabled={loading}
              className="h-14 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-slow-spin" />
                  Processing...
                </div>
              ) : (
                'Find News'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Example Topics */}
      <div className="flex flex-wrap justify-center gap-3 mb-16">
        <span className="text-sm text-gray-500">Try:</span>
        {exampleTopics.map((example, i) => (
          <Button
            key={i}
            variant="outline"
            size="sm"
            onClick={() => onSearch(example)}
            disabled={loading}
            className="bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-all duration-200"
          >
            {example}
          </Button>
        ))}
      </div>
    </>
  );
};
