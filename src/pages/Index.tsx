import { useState, useEffect } from "react";
import { Newspaper, TrendingUp, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { synthesizeNews, fetchTrendingTopics, type NewsData } from "@/services/openaiService";
import { ArticleViewer } from "@/components/ArticleViewer";
import { MorganFreemanPlayer } from "@/components/MorganFreemanPlayer";
import { UserMenu } from "@/components/auth/UserMenu";
import { AuthModal } from "@/components/auth/AuthModal";
import { supabase } from "@/integrations/supabase/client";
import { saveSearchHistory } from "@/services/searchHistoryService";

export default function Index() {
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [includePhdAnalysis, setIncludePhdAnalysis] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check auth state
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadTrendingTopics = async () => {
      try {
        const topics = await fetchTrendingTopics();
        setTrendingTopics(topics);
      } catch (error) {
        console.error('Failed to load trending:', error);
        setTrendingTopics([
          "Technology news",
          "Political updates", 
          "Business today",
          "World events"
        ]);
      } finally {
        setLoadingTrending(false);
      }
    };

    loadTrendingTopics();
  }, []);

  const handleSynthesize = async () => {
    if (!topic.trim()) {
      toast({
        title: "Missing Topic",
        description: "Please enter a topic to analyze",
        variant: "destructive",
      });
      return;
    }

    const currentTopic = topic.trim();
    setIsLoading(true);
    setNewsData(null);

    try {
      console.log(`Starting synthesis for: ${currentTopic}`);
      
      const result = await synthesizeNews({
        topic: currentTopic,
        targetOutlets: [
          { name: 'Reuters', type: 'News Agency' },
          { name: 'CNN', type: 'Broadcast Media' },
          { name: 'BBC', type: 'Broadcast Media' },
          { name: 'The Guardian', type: 'National Newspaper' },
          { name: 'Associated Press', type: 'News Agency' }
        ],
        freshnessHorizonHours: 48,
        includePhdAnalysis
      });

      console.log('Synthesis completed:', result);
      setNewsData(result);

      // Check if result was cached and show appropriate toast
      const cacheHit = (result as any).cached; // This would need to be added to the response
      
      toast({
        title: cacheHit ? "✓ Analysis Complete (Cached)" : "✓ Analysis Complete",
        description: cacheHit ? 
          `Found recent analysis for "${currentTopic}"` :
          `Found ${result.sources?.length || 0} current sources for "${currentTopic}"`,
        duration: 3000,
      });

      // Save to search history if user is logged in
      if (user) {
        try {
          await saveSearchHistory(user.id, currentTopic, result);
        } catch (error) {
          console.error('Failed to save search history:', error);
        }
      }

    } catch (error: any) {
      console.error('Synthesis error:', error);
      
      toast({
        title: "Analysis Failed",
        description: error.message || "Unable to analyze this topic. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrendingClick = (trendingTopic: string) => {
    setTopic(trendingTopic);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSynthesize();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Newspaper className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">NewsGlide</h1>
          </div>
          <div className="flex items-center space-x-4">
            <UserMenu user={user} onAuthClick={() => setShowAuth(true)} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Sparkles className="h-6 w-6 text-yellow-500" />
            <h2 className="text-4xl font-bold text-gray-900">AI News Analysis</h2>
            <Sparkles className="h-6 w-6 text-yellow-500" />
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get instant, comprehensive analysis of current news topics from multiple trusted sources
          </p>
        </div>

        {/* Search Section */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Analyze Current News</span>
            </CardTitle>
            <CardDescription>
              Enter any topic to get real-time analysis from multiple news sources
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Enter a news topic (e.g., 'AI developments', 'climate change', 'tech earnings')"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                onClick={handleSynthesize} 
                disabled={isLoading || !topic.trim()}
                className="px-8"
              >
                {isLoading ? "Analyzing..." : "Analyze"}
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="phd-analysis" 
                checked={includePhdAnalysis}
                onCheckedChange={setIncludePhdAnalysis}
              />
              <Label 
                htmlFor="phd-analysis" 
                className="text-sm text-gray-600 cursor-pointer"
              >
                Include advanced academic analysis (slower, more detailed)
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Trending Topics */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Trending Now</span>
            </CardTitle>
            <CardDescription>Popular topics being discussed right now</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {loadingTrending ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-24 rounded-full" />
                ))
              ) : (
                trendingTopics.map((trendingTopic, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-blue-100 transition-colors px-3 py-1"
                    onClick={() => handleTrendingClick(trendingTopic)}
                  >
                    {trendingTopic}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600">Analyzing current news sources...</p>
                <p className="text-sm text-gray-500">This may take 10-30 seconds</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {newsData && (
          <div className="max-w-6xl mx-auto space-y-6">
            <ArticleViewer newsData={newsData} />
            <MorganFreemanPlayer newsData={newsData} />
          </div>
        )}
      </main>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
