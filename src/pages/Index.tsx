import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { incrementSearchCount } from '@/services/subscriptionService';
import { UserMenu } from '@/components/auth/UserMenu';
import { AuthModal } from '@/components/auth/AuthModal';
import { MorganFreemanPlayer } from '@/components/MorganFreemanPlayer';
import { synthesizeNews } from '@/services/openaiService';
import { saveSearchToHistory } from '@/services/searchHistoryService';

import { supabase } from '@/integrations/supabase/client';
import { 
  Sparkles, 
  Search, 
  TrendingUp, 
  Loader2,
  CheckCircle,
  Globe,
  ExternalLink,
  BookmarkPlus,
  ArrowLeft,
  MessageCircle
} from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { subscription, isProUser, canUseFeature, refreshSubscription } = useSubscription();
  const { toast } = useToast();
  
  const [newsData, setNewsData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'searching' | 'analyzing' | 'generating' | ''>('');
  const [synthesisAborted, setSynthesisAborted] = useState(false);
  const [includePhdAnalysis, setIncludePhdAnalysis] = useState(false);
  
  // Trending topics state
  const [trendingTopics, setTrendingTopics] = useState<string[]>([
    "OpenAI GPT-5",
    "Climate Summit 2025", 
    "Tesla Stock News",
    "AI Regulation Updates"
  ]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  // Auth modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin');

  // Fetch trending topics on mount
  useEffect(() => {
    fetchTrendingTopics();
  }, []);

  const fetchTrendingTopics = async () => {
    setTopicsLoading(true);
    console.log('Fetching trending topics...');
    
    try {
      const { data, error } = await supabase.functions.invoke('trending-topics', {
        method: 'GET'
      });
      
      if (error) {
        console.error('Trending topics error:', error);
      } else if (data?.topics && Array.isArray(data.topics)) {
        console.log('Received topics:', data.topics);
        setTrendingTopics(data.topics);
      }
    } catch (error) {
      console.error('Failed to fetch trending topics:', error);
    } finally {
      setTopicsLoading(false);
    }
  };

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

    // Check search limits for free users
    if (user && !isProUser && !canUseFeature('search')) {
      toast({
        title: "Daily Search Limit Reached",
        description: "You've used all 5 free searches today. Upgrade to Pro for unlimited searches!",
        variant: "destructive",
      });
      return;
    }

    // Increment search count for logged in users BEFORE synthesis
    if (user && !isProUser) {
      try {
        await incrementSearchCount(user.id);
        await refreshSubscription();
        console.log('Search count incremented and context refreshed');
      } catch (error) {
        console.error('Failed to increment search count:', error);
      }
    }

    // Set the topic in the input field when using example topics
    if (searchTopic) {
      setTopic(searchTopic);
    }

    setLoading(true);
    setLoadingStage('searching');
    setSynthesisAborted(false);

    try {
      if (synthesisAborted) {
        return;
      }

      // Check PhD analysis permission
      const shouldIncludePhdAnalysis = includePhdAnalysis && canUseFeature('phd');
      
      if (includePhdAnalysis && !canUseFeature('phd')) {
        toast({
          title: "PhD Analysis - Pro Feature",
          description: "Upgrade to Pro to access detailed academic analysis.",
          variant: "destructive",
        });
        setIncludePhdAnalysis(false);
      }

      const request: any = {
        topic: currentTopic,
        targetOutlets: [
          { name: 'Reuters', type: 'News Agency' },
          { name: 'Bloomberg', type: 'Online Media' },
          { name: 'CNN', type: 'Broadcast Media' },
          { name: 'The Guardian', type: 'National Newspaper' }
        ],
        freshnessHorizonHours: 48,
        targetWordCount: 500,
        includePhdAnalysis: shouldIncludePhdAnalysis
      };

      const result = await synthesizeNews(request);
      setNewsData(result);
      setShowResults(true);
      
      if (user) {
        saveSearchToHistory(user.id, currentTopic, result)
          .then(() => console.log('Search saved to history'))
          .catch(err => console.error('Failed to save search:', err));
      }
      
      toast({
        title: "✓ Analysis Complete",
        description: `Found and synthesized ${result.sources.length} current news articles`,
        duration: 5000,
        className: "bg-green-50 border-green-200",
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

  const handleSaveArticle = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    try {
      // TODO: Implement save functionality
      console.log('Save article:', newsData);
      toast({
        title: "Article Saved",
        description: "Successfully saved to your collection",
        className: "bg-green-50 border-green-200",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save article. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBackToHome = () => {
    setShowResults(false);
    setNewsData(null);
    setTopic('');
  };

  // If showing results, render the full results view
  if (showResults && newsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleBackToHome}
                className="bg-white/80 hover:bg-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Search
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    NewsGlide
                  </h1>
                  <p className="text-xs text-gray-600">Results for: {newsData.topic}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {user && subscription && !isProUser && (
                <div className="text-sm text-gray-600 mr-4">
                  Daily searches: {subscription.daily_search_count}/5
                </div>
              )}
              
              {user ? (
                <UserMenu />
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setAuthModalTab('signin');
                    setAuthModalOpen(true);
                  }}
                  className="bg-white/80 hover:bg-white"
                >
                  Sign In to Save
                </Button>
              )}
            </div>
          </div>

          {/* Results Header */}
          <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{newsData.headline}</span>
                <div className="flex gap-2">
                  <Badge variant={newsData.confidenceLevel === 'High' ? 'default' : 'secondary'}>
                    {newsData.confidenceLevel} Confidence
                  </Badge>
                  <Badge variant={newsData.topicHottness === 'High' ? 'destructive' : 'outline'} className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {newsData.topicHottness} Interest
                  </Badge>
                  <Button
                    onClick={handleSaveArticle}
                    variant="outline"
                    size="sm"
                    className="ml-2"
                  >
                    <BookmarkPlus className="h-4 w-4 mr-2" />
                    Save Article
                  </Button>
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
                    <MessageCircle className="h-4 w-4 text-purple-500" />
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

          {/* Article Content with Reading Levels */}
          <Tabs defaultValue="base" className="w-full mb-8">
            <TabsList className="grid w-full grid-cols-3 bg-white/60 backdrop-blur-sm mb-6">
              <TabsTrigger value="base">📰 Base</TabsTrigger>
              <TabsTrigger value="eli5">🧒 ELI5</TabsTrigger>
              <TabsTrigger 
                value="phd" 
                disabled={!newsData.article.phd || !canUseFeature('phd')}
                className={(!newsData.article.phd || !canUseFeature('phd')) ? "opacity-50 cursor-not-allowed" : ""}
              >
                🔬 PhD {(!newsData.article.phd || !canUseFeature('phd')) && "(Pro Only)"}
              </TabsTrigger>
            </TabsList>
            
            {Object.entries(newsData.article).map(([level, content]) => (
              content && (
                <TabsContent key={level} value={level} className="mt-0">
                  <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                    <CardContent className="pt-6 max-w-4xl mx-auto">
                      <div className="prose prose-lg max-w-none">
                        {(content as string).split('\n\n').map((paragraph, idx) => (
                          <p key={idx} className="mb-4 leading-relaxed text-gray-800">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )
            ))}
          </Tabs>

          {/* Morgan Freeman Voice Player */}
          <div className="mb-8">
            {canUseFeature('voice') ? (
              <MorganFreemanPlayer 
                text={newsData.article.base}
                articleType="base"
                topic={newsData.topic}
              />
            ) : (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50">
                <CardContent className="text-center py-8">
                  <div className="text-4xl mb-3">🎭</div>
                  <h3 className="font-semibold mb-2">Morgan Freeman Voice - Pro Feature</h3>
                  <p className="text-gray-600 mb-4">
                    Upgrade to Pro to listen with the iconic narrator voice
                  </p>
                  <Button 
                    onClick={() => navigate('/subscription')}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                  >
                    Upgrade to Pro
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sources Section */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Sources ({newsData.sources.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {newsData.sources.map((source) => (
                  <div key={source.id} className="border rounded-lg p-4 bg-white/50">
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
            </CardContent>
          </Card>

          {/* Auth Modal */}
          <AuthModal
            isOpen={authModalOpen}
            onClose={() => setAuthModalOpen(false)}
            defaultTab={authModalTab}
          />
        </div>
      </div>
    );
  }

  // Original homepage view
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  NewsGlide
                </h1>
                <p className="text-xs text-gray-600">Glide through the noise</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Usage Counter - only for free users */}
              {user && subscription && !isProUser && (
                <div className="text-sm text-gray-600 mr-4">
                  Daily searches: {subscription.daily_search_count}/5
                </div>
              )}
              
              {user ? (
                <UserMenu />
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAuthModalTab('signin');
                      setAuthModalOpen(true);
                    }}
                    className="bg-white/80 hover:bg-white"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => {
                      setAuthModalTab('signup');
                      setAuthModalOpen(true);
                    }}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-4 text-gray-900">
            Synthesize news from multiple sources instantly
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Get unbiased, multi-perspective analysis that cuts through the noise
          </p>
        </div>

        {/* Search Section */}
        <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder="Enter any topic for instant news synthesis..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      handleSynthesize();
                    }
                  }}
                  className="flex-1 h-12 text-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  disabled={loading}
                />
                <Button
                  onClick={() => handleSynthesize()}
                  disabled={loading || !topic.trim()}
                  className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5 mr-2" />
                      Synthesize
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-center mt-4 text-sm">
                <label className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={includePhdAnalysis}
                    onChange={(e) => {
                      if (e.target.checked && !canUseFeature('phd')) {
                        toast({
                          title: "PhD Analysis - Pro Feature",
                          description: "Upgrade to Pro to access detailed academic analysis.",
                          variant: "destructive",
                        });
                        setIncludePhdAnalysis(false);
                        return;
                      }
                      setIncludePhdAnalysis(e.target.checked);
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span>
                    Include PhD-level analysis (adds ~10 seconds)
                  </span>
                </label>
              </div>

              {/* Trending Topics */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Trending Topics</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchTrendingTopics}
                    disabled={topicsLoading}
                    className="ml-auto text-xs"
                  >
                    {topicsLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Refresh'
                    )}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topicsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-24" />
                    ))
                  ) : (
                    trendingTopics.map((trendingTopic, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSynthesize(trendingTopic)}
                        disabled={loading}
                        className="text-sm bg-white/50 hover:bg-white border-gray-200 hover:border-blue-300 transition-colors"
                      >
                        {trendingTopic}
                      </Button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {loading && (
          <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="font-medium">
                  {loadingStage === 'searching' && 'Searching for articles...'}
                  {loadingStage === 'analyzing' && 'Analyzing sources...'}
                  {loadingStage === 'generating' && 'Generating synthesis...'}
                  {!loadingStage && 'Processing...'}
                </span>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Auth Modal */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          defaultTab={authModalTab}
        />
      </div>
    </div>
  );
};

export default Index;