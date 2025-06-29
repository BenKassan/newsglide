import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, TrendingUp, Shield, MessageCircle, Brain, Star, Users, Zap, Flame, CheckCircle, User, Globe, ExternalLink, Loader2, FileText, Sparkles } from 'lucide-react';
import { synthesizeNews, SynthesisRequest, NewsData } from '@/services/openaiService';
import { Progress } from "@/components/ui/progress";

const Index = () => {
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'searching' | 'analyzing' | 'generating' | ''>('');
  const [progress, setProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(20);
  const { toast } = useToast();

  const exampleTopics = [
    "OpenAI GPT-5",
    "Climate Summit 2025", 
    "Tesla Stock News",
    "AI Regulation Updates"
  ];

  const valueProps = [
    {
      icon: Shield,
      title: "Real-Time News",
      description: "Get the latest news from actual sources across the web, synthesized into clear, unbiased analysis."
    },
    {
      icon: Globe,
      title: "Multiple Sources",
      description: "We search and analyze news from dozens of reputable outlets to give you the complete picture."
    },
    {
      icon: MessageCircle,
      title: "Smart Synthesis",
      description: "Our AI identifies disagreements between sources and provides balanced analysis of different perspectives."
    },
    {
      icon: Brain,
      title: "Adjustable Complexity",
      description: "From simple summaries to PhD-level analysis - choose the reading level that works for you."
    }
  ];

  // Add loading stages with progress
  const loadingStages = [
    { 
      id: 'searching', 
      label: 'Searching for articles...', 
      icon: Search, 
      duration: 5,
      progress: 30 
    },
    { 
      id: 'analyzing', 
      label: 'Analyzing sources...', 
      icon: FileText, 
      duration: 8,
      progress: 60 
    },
    { 
      id: 'generating', 
      label: 'Generating synthesis...', 
      icon: Sparkles, 
      duration: 7,
      progress: 90 
    }
  ];

  // Smoother progress timer effect
  useEffect(() => {
    if (!loading) {
      setProgress(0);
      setEstimatedTime(20);
      return;
    }

    const startTime = Date.now();
    const totalDuration = 20000; // 20 seconds

    // Update less frequently - every 500ms instead of 100ms
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / totalDuration) * 100, 95);
      
      // Only update if change is significant (more than 2%)
      setProgress(prev => {
        if (Math.abs(newProgress - prev) > 2) {
          return newProgress;
        }
        return prev;
      });
      
      const remaining = Math.max(0, Math.ceil((totalDuration - elapsed) / 1000));
      setEstimatedTime(remaining);

      // Smoother stage transitions
      if (newProgress < 30 && loadingStage !== 'searching') {
        setLoadingStage('searching');
      } else if (newProgress >= 30 && newProgress < 60 && loadingStage !== 'analyzing') {
        setLoadingStage('analyzing');
      } else if (newProgress >= 60 && loadingStage !== 'generating') {
        setLoadingStage('generating');
      }
    }, 500); // Changed from 100ms to 500ms

    return () => clearInterval(interval);
  }, [loading, loadingStage]);

  const handleSynthesize = async (searchTopic?: string) => {
    const currentTopic = searchTopic || topic.trim();
    if (!currentTopic) {
      toast({
        title: "Error",
        description: "Please enter a topic to search for current news.",
        variant: "destructive",
      });
      return;
    }

    // Set the topic in the input field when using example topics
    if (searchTopic) {
      setTopic(searchTopic);
    }

    setLoading(true);
    setLoadingStage('searching');
    setProgress(0);

    try {
      const request: SynthesisRequest = {
        topic: currentTopic,
        targetOutlets: [
          { name: 'Reuters', type: 'News Agency' },
          { name: 'Bloomberg', type: 'Online Media' },
          { name: 'CNN', type: 'Broadcast Media' },
          { name: 'The Guardian', type: 'National Newspaper' }
        ],
        freshnessHorizonHours: 48,
        targetWordCount: 500
      };

      const result = await synthesizeNews(request);
      setNewsData(result);
      setShowResults(true);
      setProgress(100);
      
      toast({
        title: "Success",
        description: `Found and synthesized ${result.sources.length} real news articles about "${currentTopic}"`,
      });
    } catch (error) {
      console.error('Synthesis failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to find current news articles',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const handleBackToHome = () => {
    setShowResults(false);
    setNewsData(null);
    setTopic('');
  };

  // Calm loading overlay component
  const LoadingOverlay = () => {
    if (!loading) return null;

    const currentStage = loadingStages.find(s => s.id === loadingStage) || loadingStages[0];
    const Icon = currentStage.icon;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            {/* Calm rotating icon - no pulsing */}
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

            {/* Smooth progress bar */}
            <div className="mb-4">
              <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-sm text-gray-600">
                <span>{Math.round(progress)}%</span>
                <span>{estimatedTime}s remaining</span>
              </div>
            </div>

            {/* Calm stage indicators - no pulsing */}
            <div className="flex justify-center gap-2 mt-6">
              {loadingStages.map((stage, index) => {
                const StageIcon = stage.icon;
                const isComplete = progress > stage.progress;
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

  if (showResults && newsData) {
    const currentDate = new Date();
    const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const headlineWithDate = `${newsData.headline} (${monthYear})`;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto p-6 max-w-6xl">
          <div className="mb-6">
            <Button onClick={handleBackToHome} variant="ghost" className="mb-4">
              ← Back to Search
            </Button>
            <div className="flex items-center gap-4 mb-4">
              <img 
                src="/lovable-uploads/4aa0d947-eb92-4247-965f-85f5d500d005.png" 
                alt="NewsGlide Logo" 
                className="h-8 w-8"
              />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                NewsGlide Analysis
              </h1>
            </div>
          </div>

          {/* Analysis Complete Badge */}
          <div className="mb-6">
            <Card className="border-green-200 bg-green-50/80 backdrop-blur-sm">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 text-green-800">
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Analysis complete</p>
                    <p className="text-green-700">
                      All sources were published within the last 48 hours
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 animate-fade-in">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {headlineWithDate}
                  <div className="flex gap-2">
                    <Badge variant={newsData.confidenceLevel === 'High' ? 'default' : 'secondary'}>
                      {newsData.confidenceLevel} Confidence
                    </Badge>
                    <Badge variant={newsData.topicHottness === 'High' ? 'destructive' : 'outline'} className="flex items-center gap-1">
                      <Flame className="h-3 w-3" />
                      {newsData.topicHottness} Interest
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Key Points
                    </h3>
                    <ul className="space-y-2">
                      {newsData.summaryPoints.map((point, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-500" />
                      Key Questions
                    </h3>
                    <ul className="space-y-2">
                      {newsData.keyQuestions.map((question, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                          {question}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disagreements Section */}
            {newsData.disagreements && newsData.disagreements.length > 0 && (
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm border-l-4 border-l-orange-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <TrendingUp className="h-5 w-5" />
                    Source Disagreements ({newsData.disagreements.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {newsData.disagreements.map((disagreement, i) => (
                      <div key={i} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <h4 className="font-semibold text-orange-800 mb-2">
                          {disagreement.pointOfContention}
                        </h4>
                        <p className="text-sm text-gray-700 mb-2">
                          <strong>What they disagree on:</strong> {disagreement.details}
                        </p>
                        <p className="text-xs text-gray-600">
                          <strong>Likely reason:</strong> {disagreement.likelyReason}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Reading Level Tabs with better formatting for long content */}
            <Tabs defaultValue="base" className="w-full">
              <TabsList className="grid w-full grid-cols-6 bg-white/60 backdrop-blur-sm">
                <TabsTrigger value="base">📰 Base</TabsTrigger>
                <TabsTrigger value="eli5">🧒 ELI5</TabsTrigger>
                <TabsTrigger value="middleSchool">🎒 Middle School</TabsTrigger>
                <TabsTrigger value="highSchool">🎓 High School</TabsTrigger>
                <TabsTrigger value="undergrad">🏛️ Undergrad</TabsTrigger>
                <TabsTrigger value="phd">🔬 PhD</TabsTrigger>
              </TabsList>
              {Object.entries(newsData.article).map(([level, content]) => (
                <TabsContent key={level} value={level} className="mt-4">
                  <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardContent className="pt-6 max-w-4xl mx-auto">
                      {/* Add reading level indicator */}
                      <div className="mb-4 text-sm text-gray-600 border-b border-gray-200 pb-3">
                        <span className="font-semibold">Reading Level:</span> {
                          level === 'eli5' ? 'Elementary (Age 5)' :
                          level === 'middleSchool' ? 'Middle School (Grades 6-8)' :
                          level === 'highSchool' ? 'High School (Grades 9-12)' :
                          level === 'undergrad' ? 'Undergraduate (College)' :
                          level === 'phd' ? 'Graduate/PhD Level' :
                          'General Audience'
                        }
                        <span className="ml-4">
                          <span className="font-semibold">Length:</span> ~{content.split(' ').length} words
                        </span>
                      </div>
                      
                      {/* Format content with proper paragraphs */}
                      <div 
                        className="prose prose-lg max-w-none"
                        data-reading-level={level}
                      >
                        {content.split('\n\n').map((paragraph, idx) => (
                          <p key={idx} className="mb-4 leading-relaxed text-gray-800">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>

            {/* Sources Section */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Sources ({newsData.sources.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {newsData.sources.length > 0 ? (
                  <div className="grid gap-4">
                    {newsData.sources.map((source) => (
                      <div key={source.id} className="border rounded-lg p-4 bg-white/50 hover:bg-white/70 transition-all duration-200">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-blue-600">{source.outlet}</h4>
                          <Badge variant="outline">{source.type}</Badge>
                        </div>
                        <p className="text-sm font-medium mb-1">{source.headline}</p>
                        <p className="text-xs text-gray-600 mb-2">{source.analysisNote}</p>
                        <p className="text-xs text-gray-500 mb-2">
                          Published: {new Date(source.publishedAt).toLocaleString()}
                        </p>
                        {source.url && (
                          <a 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:text-blue-700 underline flex items-center gap-1"
                          >
                            Read original article <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="mb-2">No sources found for this analysis.</p>
                    <p className="text-sm">This may be due to limited availability of recent articles on this topic.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <LoadingOverlay />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative container mx-auto px-6 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-4 mb-6">
              <img 
                src="/lovable-uploads/4aa0d947-eb92-4247-965f-85f5d500d005.png" 
                alt="NewsGlide Logo" 
                className="h-12 w-12"
              />
              <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                NewsGlide
              </h1>
            </div>
            
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              Get real-time news synthesis from actual sources across the web. Our AI finds current articles and creates unbiased analysis.
            </p>

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
                      onKeyPress={(e) => e.key === 'Enter' && handleSynthesize()}
                      className="pl-12 h-14 text-lg border-0 bg-transparent focus:ring-0 focus:border-0"
                    />
                  </div>
                  <Button 
                    onClick={() => handleSynthesize()} 
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
                  onClick={() => handleSynthesize(example)}
                  disabled={loading}
                  className="bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-all duration-200"
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Value Proposition Section */}
      <div className="py-20 bg-white/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-800 mb-4">
              Why Choose NewsGlide?
            </h3>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get comprehensive news analysis from real sources, not AI-generated content.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
            {valueProps.map((prop, i) => (
              <Card 
                key={i} 
                className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group"
              >
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <prop.icon className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="text-xl font-semibold mb-4 text-gray-800">
                    {prop.title}
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    {prop.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 text-center md:text-left">
            <div>
              <div className="flex items-center gap-3 mb-4 justify-center md:justify-start">
                <img 
                  src="/lovable-uploads/4aa0d947-eb92-4247-965f-85f5d500d005.png" 
                  alt="NewsGlide Logo" 
                  className="h-8 w-8"
                />
                <span className="text-xl font-bold">NewsGlide</span>
              </div>
              <p className="text-gray-400">
                Navigate news with clarity and confidence.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Powered By</h4>
              <div className="space-y-2 text-gray-400">
                <p>🌐 Real-time Web Search</p>
                <p>🤖 Advanced AI Synthesis</p>
                <p>📊 Multiple News Sources</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Trust & Transparency</h4>
              <div className="space-y-2 text-gray-400">
                <p>🔒 Real Sources Only</p>
                <p>🎯 Unbiased Analysis</p>
                <p>📈 Current & Accurate</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 NewsGlide. Real news, real sources, real analysis.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
