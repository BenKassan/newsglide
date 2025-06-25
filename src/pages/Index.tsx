
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Search, AlertTriangle, Clock, Key, ArrowRight, Target, BarChart3, Shield, CheckCircle, TrendingUp, Home, Thermometer, Users } from "lucide-react";
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

  // Auto-configure the API key on component mount
  useEffect(() => {
    const apiKey = "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";
    localStorage.setItem('openai_api_key', apiKey);
    setApiKeyConfigured(true);
    console.log('OpenAI API key configured successfully');
  }, []);

  const handleSynthesize = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic to analyze");
      return;
    }

    if (!apiKeyConfigured) {
      toast.error("API key is still being configured, please wait a moment");
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Starting news analysis for topic:', topic);
      
      const result = await synthesizeNews({
        topic,
        targetOutlets: DEFAULT_OUTLETS,
        freshnessHorizonHours: 48,
        targetWordCount: 1000
      });
      
      console.log('News analysis completed successfully');
      setNewsData(result);
      toast.success("News analysis complete!");
    } catch (error) {
      console.error('Error analyzing news:', error);
      toast.error(`Failed to analyze news: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoHome = () => {
    setNewsData(null);
    setTopic("");
    setReadingLevel(0);
  };

  const getCurrentArticle = () => {
    if (!newsData) return "";
    const levelKey = READING_LEVELS[readingLevel].key as keyof typeof newsData.article;
    return newsData.article[levelKey];
  };

  // Calculate topic hotness based on sensationalism and disagreements
  const getTopicHotness = () => {
    if (!newsData) return { score: 0, label: "Low" };
    
    const disagreementCount = newsData.disagreements.length;
    const sourcesCount = newsData.sources.length;
    
    // Simple scoring algorithm - can be refined
    let score = Math.min(10, (disagreementCount * 2) + (sourcesCount * 0.5));
    
    let label = "Low";
    if (score >= 7) label = "High";
    else if (score >= 4) label = "Moderate";
    
    return { score: Math.round(score), label };
  };

  // Calculate source disagreement score
  const getSourceDisagreementScore = () => {
    if (!newsData) return { score: 0, label: "Consistent" };
    
    const disagreementCount = newsData.disagreements.length;
    const sourcesCount = newsData.sources.length;
    
    if (sourcesCount === 0) return { score: 0, label: "Consistent" };
    
    const disagreementRatio = disagreementCount / sourcesCount;
    const score = Math.min(10, disagreementRatio * 10);
    
    let label = "Consistent";
    if (score >= 6) label = "Conflicting";
    else if (score >= 3) label = "Some Variance";
    
    return { score: Math.round(score), label };
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Modern Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Newsglide</h1>
            
            {newsData && (
              <Button
                onClick={handleGoHome}
                variant="ghost"
                className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 font-medium"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            )}
            
            <img 
              src="/lovable-uploads/8630044d-99ad-418f-8b95-24ad30c3a946.png" 
              alt="Newsglide Logo" 
              className="h-10 w-auto"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Navigate News with <span className="text-blue-600">Clarity</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Understand bias, spot sensationalism, and get the full picture with AI-powered news analysis.
          </p>
          
          {/* Search Input */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex items-center bg-white rounded-full shadow-sm border border-gray-200 p-2">
              <Input
                placeholder="Enter a news topic you're interested in..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSynthesize()}
                className="flex-1 border-0 bg-transparent text-lg px-4 py-3 focus:outline-none focus:ring-0"
              />
              <Button 
                onClick={handleSynthesize} 
                disabled={isLoading || !apiKeyConfigured} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-medium"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* AI Analysis Ready Status */}
          {apiKeyConfigured && !newsData && (
            <div className="max-w-lg mx-auto">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-green-800 font-medium">AI Analysis Ready</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Why NewsGlide Section */}
        {!newsData && !isLoading && apiKeyConfigured && (
          <>
            <div className="mb-16">
              <div className="text-center mb-12">
                <h3 className="text-3xl font-bold text-gray-900 mb-6">Why NewsGlide?</h3>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                  Stop surfing through news articles without knowing the author's position, the level of exaggeration, 
                  or if there's false information. NewsGlide empowers you with transparent and objective news analysis.
                </p>
              </div>
            </div>

            <hr className="border-gray-200 mb-16" />

            {/* How It Works Section */}
            <div className="mb-16">
              <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">How NewsGlide Works</h3>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-blue-600" />
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-3">1. Enter a Topic</h4>
                  <p className="text-gray-600">
                    Type in any news topic you're curious about. Our AI will research multiple sources instantly.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-3">2. See Analysis</h4>
                  <p className="text-gray-600">
                    Get a comprehensive article synthesized from multiple trusted sources with full transparency.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-8 w-8 text-blue-600" />
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-3">3. Understand Impact</h4>
                  <p className="text-gray-600">
                    Our system reveals factual grounding and topic intensity for complete clarity.
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-gray-200 mb-16" />

            {/* Call to Action */}
            <div className="text-center">
              <div className="bg-blue-600 text-white rounded-2xl p-8 max-w-2xl mx-auto">
                <h4 className="text-2xl font-bold mb-4">Ready to Get Started?</h4>
                <p className="text-blue-100 mb-6">
                  Enter any news topic above and experience transparent, bias-aware news analysis powered by AI.
                </p>
                <div className="flex items-center justify-center text-blue-100">
                  <ArrowRight className="h-5 w-5 mr-2" />
                  <span>Try searching for "climate change" or "tech earnings"</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Results Section */}
        {newsData && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Article */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-lg border-0">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2 font-bold">{newsData.headline}</CardTitle>
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
                        
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          <Thermometer className="h-3 w-3 mr-1" />
                          Topic Hotness: {getTopicHotness().label}
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
                
                <CardContent className="p-8">
                  <div className="prose prose-gray max-w-none">
                    <p className="text-lg leading-relaxed whitespace-pre-line">
                      {getCurrentArticle()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Points */}
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center font-semibold">
                    <CheckCircle className="h-5 w-5 mr-2 text-emerald-600" />
                    Key Takeaways
                  </CardTitle>
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
                <Card className="shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Key Questions</CardTitle>
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
              {/* Source Analysis Card */}
              <Card className="shadow-lg border-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center font-semibold">
                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                    Source Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">Narrative Consistency</span>
                      <Badge variant="outline" className="text-blue-800 border-blue-300">
                        {getSourceDisagreementScore().label}
                      </Badge>
                    </div>
                    <div className="text-xs text-blue-700">
                      Score: {getSourceDisagreementScore().score}/10
                    </div>
                  </div>
                  
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-orange-900">Public Interest</span>
                      <Badge variant="outline" className="text-orange-800 border-orange-300">
                        {getTopicHotness().label}
                      </Badge>
                    </div>
                    <div className="text-xs text-orange-700">
                      Score: {getTopicHotness().score}/10
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Source Disagreements */}
              {newsData.disagreements.length > 0 && (
                <Card className="shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center font-semibold">
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
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Sources</CardTitle>
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
        )}
      </main>
    </div>
  );
};

export default Index;
