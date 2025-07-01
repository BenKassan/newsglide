import React, { useState, useEffect, useRef } from 'react';
import { Search, Sparkles, Send, MessageCircle, Volume2, FileText, Clock, TrendingUp, Globe, Zap, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { UserMenu } from '@/components/auth/UserMenu';
import { ArticleViewer } from '@/components/ArticleViewer';
import { MorganFreemanPlayer } from '@/components/MorganFreemanPlayer';
import { PricingModal } from '@/components/PricingModal';
import { UsageTracker } from '@/components/UsageTracker';
import { synthesizeNews, askNewsQuestion, fetchTrendingTopics } from '@/services/openaiService';
import { saveToSearchHistory } from '@/services/searchHistoryService';
import { useToast } from "@/hooks/use-toast";
import { NewsData } from '@/types/openai';

const Index = () => {
  const [topic, setTopic] = useState('');
  const [article, setArticle] = useState<NewsData | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [articleType, setArticleType] = useState<'base' | 'eli5' | 'phd'>('base');
  const [loading, setLoading] = useState(false);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [includePhdAnalysis, setIncludePhdAnalysis] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  
  const { user } = useAuth();
  const { subscription, canUseFeature } = useSubscription();
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadSearchHistory = () => {
      const history = localStorage.getItem('searchHistory');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    };

    const fetchTrending = async () => {
      try {
        const topics = await fetchTrendingTopics();
        setTrendingTopics(topics);
      } catch (error) {
        console.error("Failed to fetch trending topics:", error);
        toast({
          title: "Error fetching trending topics",
          description: "Failed to update trending topics. Please try again later.",
          variant: "destructive",
        });
      }
    };

    loadSearchHistory();
    fetchTrending();
  }, [toast]);

  useEffect(() => {
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
  }, [searchHistory]);

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value);
  };

  const handleQuestionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuestion(e.target.value);
  };

  const handleSelectTrending = (topic: string) => {
    setTopic(topic);
    searchInputRef.current?.focus();
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
    toast({
      title: "Search history cleared",
      description: "Your search history has been cleared successfully.",
    });
  };

  const handleRemoveSearch = (search: string) => {
    const updatedHistory = searchHistory.filter((item) => item !== search);
    setSearchHistory(updatedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
  };

  const handleSynthesize = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Check if user can perform search
    const canSearch = await canUseFeature('search');
    if (!canSearch) {
      setShowPricingModal(true);
      toast({
        title: "Daily limit reached",
        description: "Upgrade to Pro for 100 searches per day!",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setArticle(null);
    setAnswer('');
    try {
      const data = await synthesizeNews(topic, articleType, includePhdAnalysis);
      setArticle(data);

      // Save search term to history
      setSearchHistory((prevHistory) => {
        const newHistory = [topic, ...prevHistory.filter((item) => item !== topic)].slice(0, 5);
        return newHistory;
      });

      // Save to user search history in DB
      await saveToSearchHistory(topic, data);

    } catch (error: any) {
      console.error("Synthesis error:", error);
      toast({
        title: "Error synthesizing news",
        description: error.message || "Failed to synthesize news. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!article?.summary) {
      toast({
        title: "No article available",
        description: "Please synthesize an article first.",
        variant: "destructive",
      });
      return;
    }

    setQuestionLoading(true);
    setAnswer('');
    try {
      const response = await askNewsQuestion(article.summary, question);
      setAnswer(response.answer);
    } catch (error: any) {
      console.error("Question error:", error);
      toast({
        title: "Error answering question",
        description: error.message || "Failed to answer question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setQuestionLoading(false);
    }
  };

  const handlePhdAnalysisChange = async (checked: boolean) => {
    if (checked) {
      const canUsePhdAnalysis = await canUseFeature('phd');
      if (!canUsePhdAnalysis) {
        setShowPricingModal(true);
        toast({
          title: "PhD Analysis - Pro Feature",
          description: "Upgrade to Pro to unlock PhD-level analysis",
          variant: "destructive"
        });
        return;
      }
    }
    setIncludePhdAnalysis(checked);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Globe className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    NewsGlide
                  </h1>
                  <p className="text-xs text-gray-600">Glide through the noise</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {user && <UsageTracker />}
              
              {user && subscription?.subscription_tier === 'free' && (
                <Button
                  size="sm"
                  onClick={() => setShowPricingModal(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  Upgrade to Pro
                </Button>
              )}
              
              {user ? (
                <UserMenu onOpenPricing={() => setShowPricingModal(true)} />
              ) : (
                <Button onClick={() => setShowAuthModal(true)} variant="outline">
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Search Section */}
        <div className="mb-6">
          <div className="flex items-center">
            <Input
              type="text"
              placeholder="Enter a topic to synthesize news"
              value={topic}
              onChange={handleTopicChange}
              className="rounded-r-none shadow-sm"
              ref={searchInputRef}
            />
            <Button
              onClick={handleSynthesize}
              disabled={loading}
              className="rounded-l-none bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  <span>Synthesize</span>
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* PhD Analysis Checkbox */}
        <div className="flex items-center space-x-2 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includePhdAnalysis}
              onChange={(e) => handlePhdAnalysisChange(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">
              Include PhD-level analysis
              {subscription?.subscription_tier !== 'pro' && (
                <Badge className="ml-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs">
                  Pro
                </Badge>
              )}
            </span>
          </label>
        </div>

        {/* Trending Topics */}
        {trendingTopics.length > 0 && (
          <Collapsible className="w-full mb-4">
            <CollapsibleTrigger className="w-full flex items-center justify-between py-2 px-3 bg-gray-100 rounded-md text-sm font-medium hover:bg-gray-200">
              <span>Trending Topics</span>
              <TrendingUp className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="flex flex-wrap gap-2">
                {trendingTopics.map((topic) => (
                  <Badge
                    key={topic}
                    onClick={() => handleSelectTrending(topic)}
                    className="cursor-pointer hover:bg-gray-300 transition-colors duration-200"
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Search History */}
        {searchHistory.length > 0 && (
          <Collapsible className="w-full mb-6">
            <CollapsibleTrigger className="w-full flex items-center justify-between py-2 px-3 bg-gray-100 rounded-md text-sm font-medium hover:bg-gray-200">
              <span>Recent Searches</span>
              <Clock className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="flex flex-col gap-2">
                {searchHistory.map((search) => (
                  <div key={search} className="flex items-center justify-between py-1 px-2 bg-white rounded-md shadow-sm">
                    <span className="text-sm">{search}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveSearch(search)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button onClick={handleClearHistory} variant="link" className="justify-start text-xs">
                  Clear History
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Tabs */}
        {article && (
          <Tabs defaultValue="base" className="w-full">
            <TabsList>
              <TabsTrigger value="base" onClick={() => setArticleType('base')}>
                <FileText className="mr-2 h-4 w-4" />
                Base
              </TabsTrigger>
              <TabsTrigger value="eli5" onClick={() => setArticleType('eli5')}>
                <MessageCircle className="mr-2 h-4 w-4" />
                ELI5
              </TabsTrigger>
              {subscription?.subscription_tier === 'pro' && (
                <TabsTrigger value="phd" onClick={() => setArticleType('phd')}>
                  <FileText className="mr-2 h-4 w-4" />
                  PhD
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="base">
              <ArticleViewer article={article} articleType="base" />
            </TabsContent>
            <TabsContent value="eli5">
              <ArticleViewer article={article} articleType="eli5" />
            </TabsContent>
            {subscription?.subscription_tier === 'pro' && (
              <TabsContent value="phd">
                <ArticleViewer article={article} articleType="phd" />
              </TabsContent>
            )}
          </Tabs>
        )}

        {/* Morgan Freeman Player */}
        {article && (
          <MorganFreemanPlayer text={article.summary} articleType={articleType} topic={topic} />
        )}

        {/* Question Section */}
        {article && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Ask a Question</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Input
                  type="text"
                  placeholder="Ask a question about the article"
                  value={question}
                  onChange={handleQuestionChange}
                  className="rounded-r-none shadow-sm"
                />
                <Button
                  onClick={handleAskQuestion}
                  disabled={questionLoading}
                  className="rounded-l-none bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {questionLoading ? (
                    <>
                      <Send className="mr-2 h-4 w-4 animate-spin" />
                      <span>Answering...</span>
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      <span>Ask</span>
                    </>
                  )}
                </Button>
              </div>
              {answer && <div className="mt-4">{answer}</div>}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modals */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
    </div>
  );
};

export default Index;
