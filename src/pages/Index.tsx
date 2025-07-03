import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Search, Sparkles, Clock, TrendingUp, Users, BookOpen, MessageCircle, Heart, Share, Volume2, Volume1 } from "lucide-react";
import { ArticleViewer } from "@/components/ArticleViewer";
import { synthesizeNews, fetchTrendingTopics, type SynthesisRequest, type NewsData } from "@/services/openaiService";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { UserMenu } from "@/components/auth/UserMenu";
import { saveArticle, isArticleSaved } from "@/services/savedArticlesService";
import { saveToSearchHistory } from "@/services/searchHistoryService";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { MorganFreemanPlayer } from "@/components/MorganFreemanPlayer";

export default function Index() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [synthesisTrigger, setSynthesisTrigger] = useState(0);
  const [savedStatus, setSavedStatus] = useState(false);
  const [synthesisAborted, setSynthesisAborted] = useState(false);
  
  // Add this ref to track the current abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  // Add this to track if we're currently aborting
  const [isAborting, setIsAborting] = useState(false);

  const { user } = useAuth();
  const { isProUser, canUseFeature, incrementSearchCount } = useSubscription();
  const { toast } = useToast();

  // Fetch trending topics
  const { data: trendingTopics = [] } = useQuery({
    queryKey: ['trending-topics'],
    queryFn: fetchTrendingTopics,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });

  const includePhdAnalysis = canUseFeature('phd_analysis');

  useEffect(() => {
    const checkSavedStatus = async () => {
      if (newsData && user) {
        const saved = await isArticleSaved(user.id, newsData.topic);
        setSavedStatus(saved);
      }
    };
    
    if (showResults) {
      checkSavedStatus();
    }
  }, [newsData, user, showResults, synthesisTrigger]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      // Cleanup: abort any pending request when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleCancelSynthesis = () => {
    console.log('User requested search cancellation');
    
    // First, abort the actual HTTP request
    if (abortControllerRef.current) {
      console.log('Aborting active request...');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Set aborting flag to prevent results from showing
    setIsAborting(true);
    
    // Clear all the UI states
    setSynthesisAborted(true);
    setLoading(false);
    setLoadingStage('');
    
    // Reset topic to clear the input
    setTopic('');
    
    toast({
      title: "Search Cancelled",
      description: "News synthesis was cancelled. Try another topic!",
    });
    
    // Reset aborting flag after a short delay
    setTimeout(() => setIsAborting(false), 500);
  };

  const handleSynthesize = async () => {
    if (!topic.trim()) return;
    
    const currentTopic = topic.trim();

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Check daily limit for free users
    if (!canUseFeature('unlimited_searches')) {
      toast({
        title: "Daily Limit Reached",
        description: "You've reached your daily limit of 5 searches. Upgrade to Pro for unlimited searches!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setLoadingStage('searching');
    setSynthesisAborted(false);
    setIsAborting(false); // Reset aborting flag

    // Cancel any existing request
    if (abortControllerRef.current) {
      console.log('Cancelling previous request...');
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const currentController = abortControllerRef.current;

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
        targetWordCount: 500,
        includePhdAnalysis: includePhdAnalysis
      };

      // Pass the abort signal to synthesizeNews
      const result = await synthesizeNews(request, currentController.signal);
      
      // IMPORTANT: Check if we're aborting before setting results
      if (isAborting || currentController.signal.aborted) {
        console.log('Results received but search was cancelled, ignoring...');
        return;
      }
      
      setNewsData(result);
      setShowResults(true);
      
      // Increment search count for non-pro users
      if (!isProUser) {
        await incrementSearchCount();
      }

      // Save to search history
      try {
        await saveToSearchHistory(user.id, currentTopic, result);
        console.log('Search saved to history');
      } catch (error) {
        console.error('Failed to save search history:', error);
      }

      setSynthesisTrigger(prev => prev + 1);
      
    } catch (error) {
      // Special handling for abort errors
      if (error.name === 'AbortError') {
        console.log('Search aborted successfully');
        return; // Don't show error toast for user-initiated cancellation
      }
      
      console.error('Synthesis failed:', error);
      
      // Only show error toast if not aborting
      if (!isAborting) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : 'Failed to find current news articles',
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setLoadingStage('');
      
      // Clear the abort controller reference if it's the current one
      if (abortControllerRef.current === currentController) {
        abortControllerRef.current = null;
      }
    }
  };

  const handleSaveArticle = async () => {
    if (!newsData || !user) return;

    try {
      await saveArticle(user.id, newsData.topic, newsData.headline, newsData);
      setSavedStatus(true);
      toast({
        title: "Article Saved",
        description: "This article has been saved to your collection.",
      });
    } catch (error) {
      console.error('Failed to save article:', error);
      toast({
        title: "Error",
        description: "Failed to save article. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTrendingClick = (trendingTopic: string) => {
    setTopic(trendingTopic);
    setShowResults(false);
  };

  const getLoadingText = () => {
    switch (loadingStage) {
      case 'searching':
        return 'Searching news sources...';
      case 'analyzing':
        return 'Analyzing articles...';
      case 'synthesizing':
        return 'Creating synthesis...';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AuthModal show={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            <Sparkles className="inline-block mr-2"/>
            Current News Synthesis
          </h1>
          <div className="space-x-4">
            {user ? (
              <UserMenu />
            ) : (
              <Button onClick={() => setShowAuthModal(true)}>
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">

          {/* Search Input */}
          <div className="mb-8 flex items-center">
            <Input
              type="text"
              placeholder="Enter a topic to synthesize news"
              className="mr-4 flex-grow"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSynthesize();
                }
              }}
            />
            {loading ? (
              <Button disabled variant="secondary" className="animate-pulse">
                <Clock className="mr-2 h-4 w-4" />
                {getLoadingText()}
              </Button>
            ) : (
              <Button onClick={handleSynthesize} disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                Synthesize
              </Button>
            )}
            {loading && (
              <Button variant="destructive" onClick={handleCancelSynthesis} className="ml-2">
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>

          {/* Trending Topics */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-2">Trending Topics</h2>
            <div className="flex flex-wrap gap-2">
              {trendingTopics.map((trendingTopic, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer hover:bg-gray-300 transition-colors duration-200"
                  onClick={() => handleTrendingClick(trendingTopic)}
                >
                  {trendingTopic}
                </Badge>
              ))}
            </div>
          </div>

          {/* Results Section */}
          {showResults && newsData && !synthesisAborted && (
            <Card className="bg-white shadow-md rounded-md overflow-hidden">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">{newsData.headline}</CardTitle>
                <CardDescription>
                  Generated at: {new Date(newsData.generatedAtUTC).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">

                {/* Summary Points */}
                <div className="mb-4">
                  <h3 className="text-xl font-semibold mb-2">Summary Points</h3>
                  <ul className="list-disc pl-5">
                    {newsData.summaryPoints.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>

                {/* Source Analysis */}
                <div className="mb-4">
                  <h3 className="text-xl font-semibold mb-2">Source Analysis</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <TrendingUp className="inline-block mr-2"/>
                      Narrative Consistency:
                    </div>
                    <Badge variant="outline">{newsData.sourceAnalysis.narrativeConsistency.label}</Badge>
                    <div>
                      <Users className="inline-block mr-2"/>
                      Public Interest:
                    </div>
                    <Badge variant="outline">{newsData.sourceAnalysis.publicInterest.label}</Badge>
                  </div>
                </div>

                {/* Disagreements */}
                {newsData.disagreements.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold mb-2">Disagreements</h3>
                    {newsData.disagreements.map((disagreement, index) => (
                      <div key={index} className="mb-2">
                        <p className="font-semibold">{disagreement.pointOfContention}</p>
                        <p className="text-gray-700">{disagreement.details}</p>
                        <p className="text-gray-600">Reason: {disagreement.likelyReason}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Article Viewer */}
                <div className="mb-4">
                  <h3 className="text-xl font-semibold mb-2">Article</h3>
                  <ArticleViewer newsData={newsData} includePhdAnalysis={includePhdAnalysis} />
                </div>

                {/* Key Questions */}
                <div className="mb-4">
                  <h3 className="text-xl font-semibold mb-2">Key Questions</h3>
                  <ul className="list-decimal pl-5">
                    {newsData.keyQuestions.map((question, index) => (
                      <li key={index}>{question}</li>
                    ))}
                  </ul>
                </div>

                {/* Sources */}
                <div>
                  <h3 className="text-xl font-semibold mb-2">Sources</h3>
                  <ul>
                    {newsData.sources.map((source, index) => (
                      <li key={index} className="mb-2">
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          {source.outlet} - {source.headline}
                        </a>
                        <p className="text-gray-600">Published: {new Date(source.publishedAt).toLocaleDateString()}</p>
                        <p className="text-gray-600">Analysis Note: {source.analysisNote}</p>
                        <Separator className="my-2" />
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Missing Sources */}
                {newsData.missingSources.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Missing Sources</h3>
                    <p className="text-gray-700">We were unable to find the following sources:</p>
                    <ul className="list-disc pl-5">
                      {newsData.missingSources.map((source, index) => (
                        <li key={index}>{source}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-6 flex justify-between items-center">
                  <div>
                    <Button variant="ghost" onClick={handleSaveArticle} disabled={savedStatus}>
                      {savedStatus ? (
                        <>
                          <Heart className="mr-2 h-4 w-4 text-red-500" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Heart className="mr-2 h-4 w-4" />
                          Save Article
                        </>
                      )}
                    </Button>
                    <Button variant="ghost">
                      <Share className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                  </div>
                  <div>
                    <Badge variant="secondary">
                      Confidence: {newsData.confidenceLevel}
                    </Badge>
                    <Badge variant="secondary" className="ml-2">
                      <TrendingUp className="mr-2 h-4 w-4 inline-block" />
                      Hotness: {newsData.topicHottness}
                    </Badge>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

          {/* No Results Message */}
          {showResults && !newsData && !synthesisAborted && (
            <div className="text-center mt-10">
              <h2 className="text-2xl font-semibold text-gray-700">No Results Found</h2>
              <p className="text-gray-600">Try a different search term or check your network connection.</p>
            </div>
          )}

          {/* Synthesis Aborted Message */}
          {synthesisAborted && (
            <div className="text-center mt-10">
              <h2 className="text-2xl font-semibold text-gray-700">Synthesis Cancelled</h2>
              <p className="text-gray-600">The news synthesis was cancelled. Please try a new search.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white shadow mt-8">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-gray-500">
          <p>&copy; 2024 Current News Synthesis. All rights reserved.</p>
        </div>
      </footer>
      <MorganFreemanPlayer newsData={newsData} />
    </div>
  );
}
