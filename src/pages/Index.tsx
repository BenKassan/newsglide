import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Search, AlertTriangle, Clock, Key } from "lucide-react";
import { toast } from "sonner";
import { synthesizeNews, type NewsData, type TargetOutlet } from "@/services/openaiService";

interface NewsSource {
  id: string;
  outlet: string;
  url: string;
  headline: string;
  publishedAt: string;
}

interface Disagreement {
  pointOfContention: string;
  details: string;
}

interface NewsArticle {
  base: string;
  eli5: string;
  middleSchool: string;
  highSchool: string;
  undergrad: string;
  phd: string;
}

const READING_LEVELS = [
  { key: 'eli5', label: 'ELI5', description: 'Explain Like I\'m 5' },
  { key: 'middleSchool', label: 'Middle School', description: 'Age 11-14' },
  { key: 'highSchool', label: 'High School', description: 'Age 15-18' },
  { key: 'undergrad', label: 'Undergraduate', description: 'College Level' },
  { key: 'phd', label: 'PhD', description: 'Expert/Academic' }
];

const DEFAULT_OUTLETS: TargetOutlet[] = [
  { name: "Reuters", type: "News Agency" },
  { name: "Associated Press", type: "News Agency" },
  { name: "BBC News", type: "Broadcast Media" },
  { name: "CNN", type: "Broadcast Media" },
  { name: "The New York Times", type: "National Newspaper" },
  { name: "The Washington Post", type: "National Newspaper" }
];

const Index = () => {
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [readingLevel, setReadingLevel] = useState(0);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);

  const handleSynthesize = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic to synthesize");
      return;
    }

    if (!apiKeyConfigured) {
      toast.error("Please configure your OpenAI API key first");
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Starting news synthesis for topic:', topic);
      
      const result = await synthesizeNews({
        topic,
        targetOutlets: DEFAULT_OUTLETS,
        freshnessHorizonHours: 48,
        targetWordCount: 1000
      });
      
      console.log('News synthesis completed successfully');
      setNewsData(result);
      toast.success("News synthesis complete!");
    } catch (error) {
      console.error('Error synthesizing news:', error);
      toast.error(`Failed to synthesize news: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentArticle = () => {
    if (!newsData) return "";
    const levelKey = READING_LEVELS[readingLevel].key as keyof typeof newsData.article;
    return newsData.article[levelKey];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">NewsSynth</h1>
            <p className="text-lg text-gray-600">AI-powered news synthesis with OpenAI o3</p>
          </div>
          
          {/* API Key Warning */}
          {!apiKeyConfigured && (
            <div className="max-w-2xl mx-auto mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center">
                <Key className="h-5 w-5 text-amber-600 mr-2" />
                <div>
                  <p className="text-sm text-amber-800 font-medium">OpenAI API Key Required</p>
                  <p className="text-xs text-amber-700">
                    Please set your OpenAI API key in the browser console: 
                    <code className="ml-1 px-1 bg-amber-100 rounded">localStorage.setItem('openai_api_key', 'your-key')</code>
                  </p>
                  <button 
                    onClick={() => setApiKeyConfigured(!!localStorage.getItem('openai_api_key'))}
                    className="text-xs text-amber-600 underline mt-1"
                  >
                    Check if key is configured
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Search Input */}
          <div className="max-w-2xl mx-auto flex gap-3">
            <Input
              placeholder="Enter a news topic to synthesize..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSynthesize()}
              className="flex-1"
            />
            <Button onClick={handleSynthesize} disabled={isLoading} className="px-6">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Synthesizing...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Synthesize
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {newsData && (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Article */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">{newsData.headline}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          Generated {new Date(newsData.generatedAtUTC).toLocaleString()}
                        </div>
                        <Badge 
                          variant={
                            newsData.confidenceLevel === 'High' ? 'default' : 
                            newsData.confidenceLevel === 'Medium' ? 'secondary' : 'outline'
                          }
                        >
                          {newsData.confidenceLevel} Confidence
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Reading Level Slider */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Reading Level:</span>
                      <Badge variant="outline" className="text-xs">
                        {READING_LEVELS[readingLevel].label}
                      </Badge>
                    </div>
                    <Slider
                      value={[readingLevel]}
                      onValueChange={(value) => setReadingLevel(value[0])}
                      max={4}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      {READING_LEVELS.map((level, index) => (
                        <span key={level.key} className={index === readingLevel ? "font-medium text-gray-900" : ""}>
                          {level.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-lg leading-relaxed whitespace-pre-line">
                      {getCurrentArticle()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Points */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Key Takeaways</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {newsData.summaryPoints.map((point, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Key Questions */}
              {newsData.keyQuestions && newsData.keyQuestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Key Questions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {newsData.keyQuestions.map((question, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="text-gray-700">{question}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Source Disagreements */}
              {newsData.disagreements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                      Source Disagreements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {newsData.disagreements.map((disagreement, index) => (
                      <div key={index} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="font-medium text-amber-900 mb-1">
                          {disagreement.pointOfContention}
                        </div>
                        <div className="text-sm text-amber-700 mb-2">
                          {disagreement.details}
                        </div>
                        <div className="text-xs text-amber-600 italic">
                          Likely reason: {disagreement.likelyReason}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Sources */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {newsData.sources.map((source) => (
                    <div key={source.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-medium text-sm">{source.outlet}</div>
                        <Badge variant="secondary" className="text-xs">
                          {source.id}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 mb-1 line-clamp-2">
                        {source.headline}
                      </div>
                      <div className="text-xs text-blue-600 mb-2">
                        {source.type}
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        {new Date(source.publishedAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-600 italic">
                        {source.analysisNote}
                      </div>
                    </div>
                  ))}
                  
                  {newsData.missingSources.length > 0 && (
                    <>
                      <Separator />
                      <div className="text-sm text-gray-600">
                        <div className="font-medium mb-2">Unavailable Sources:</div>
                        {newsData.missingSources.map((source, index) => (
                          <div key={index} className="text-gray-500">• {source}</div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!newsData && !isLoading && (
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-lg p-12 shadow-sm border border-gray-200">
            <div className="text-6xl mb-6">🔬</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              AI-Powered News Research
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Enter any news topic above to get comprehensive analysis powered by OpenAI's o3 model. 
              Our AI will research multiple sources, fact-check information, and present findings 
              at different reading levels with full source transparency.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
