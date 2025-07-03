import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, TrendingUp, Shield, MessageCircle, Brain, Flame, CheckCircle, User, Globe, ExternalLink, Loader2, FileText, Sparkles, Send, X, ChevronDown, ChevronUp, RefreshCw, Eye, EyeOff, Volume2, BookmarkIcon } from 'lucide-react';
import { synthesizeNews, askQuestion, fetchTrendingTopics, SynthesisRequest, NewsData } from '@/services/openaiService';
import { MorganFreemanPlayer } from '@/components/MorganFreemanPlayer';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { UserMenu } from '@/components/auth/UserMenu';
import { saveArticle, checkIfArticleSaved } from '@/services/savedArticlesService';
import { saveSearchToHistory } from '@/services/searchHistoryService';
import { useLocation } from 'react-router-dom';

const Index = () => {
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'searching' | 'analyzing' | 'generating' | ''>('');
  const [synthesisAborted, setSynthesisAborted] = useState(false);
  const [includePhdAnalysis, setIncludePhdAnalysis] = useState(false);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  
  // Chat management states
  const [chatVisible, setChatVisible] = useState(true);
  const [chatExpanded, setChatExpanded] = useState(false);
  
  // Add state for tracking selected reading level
  const [selectedReadingLevel, setSelectedReadingLevel] = useState<'base' | 'eli5' | 'phd'>('base');
  
  // Add new states for section visibility
  const [keyPointsVisible, setKeyPointsVisible] = useState(true);
  const [articleVisible, setArticleVisible] = useState(true);
  const [morganFreemanVisible, setMorganFreemanVisible] = useState(true);
  const [allSectionsCollapsed, setAllSectionsCollapsed] = useState(false);
  
  // Add trending topics state
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
  
  // Save functionality state
  const [articleSaved, setArticleSaved] = useState(false);
  const [savingArticle, setSavingArticle] = useState(false);
  
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { isProUser, dailySearchCount, searchLimit, canUseFeature, incrementSearchCount } = useSubscription();
  const location = useLocation();

  // Check for search topic from navigation state (from search history)
  useEffect(() => {
    if (location.state?.searchTopic) {
      setTopic(location.state.searchTopic);
      // Optionally auto-trigger search
      handleSynthesize(location.state.searchTopic);
    }
  }, [location.state]);

  // Check if article is saved when newsData changes
  useEffect(() => {
    if (newsData && user) {
      checkSavedStatus();
    }
  }, [newsData, user]);

  const checkSavedStatus = async () => {
    if (!user || !newsData) return;
    
    const isSaved = await checkIfArticleSaved(user.id, newsData.topic);
    setArticleSaved(isSaved);
  };

  const handleSaveArticle = async () => {
    if (!user || !newsData) {
      setAuthModalTab('signin');
      setAuthModalOpen(true);
      return;
    }

    setSavingArticle(true);
    
    const result = await saveArticle(user.id, newsData);
    
    if (result.success) {
      setArticleSaved(true);
      toast({
        title: "Article Saved",
        description: "Article saved to your library successfully!",
        duration: 3000,
      });
    } else if (result.alreadySaved) {
      toast({
        title: "Already Saved",
        description: "This article is already in your saved library.",
        variant: "default",
      });
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to save article. Please try again.",
        variant: "destructive",
      });
    }
    
    setSavingArticle(false);
  };

  const valueProps = [
    {
      icon: Shield,
      title: "Defeat Bias",
      description: "We search and analyze news from dozens of reputable outlets, crafting a neutral story while highlighting key disagreements."
    },
    {
      icon: User,
      title: "Personalized For You",
      description: "Search exactly what you want — word for word. Create a customized list of news stories to follow. We'll update you on new developments."
    },
    {
      icon: MessageCircle,
      title: "Interact With Your Content",
      description: "Ask follow-up questions and learn more about your interests with our live AI agent."
    },
    {
      icon: Brain,
      title: "Adjustable Complexity",
      description: "From simple summaries to PhD-level analysis - choose the reading level that works for you."
    }
  ];

  // Loading stages with just labels and icons
  const loadingStages = [
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

  // Chat personalization function
  const getChatPersonalization = () => {
    if (!newsData) return { title: 'Ask Me Anything', subtitle: 'Ready to dig deeper?' };
    
    const shortTopic = newsData.topic.length > 40 
      ? newsData.topic.substring(0, 40) + '...' 
      : newsData.topic;
    
    const subtitles = [
      `Let's unpack ${newsData.topic} - what's really going on here?`,
      `Got questions about ${newsData.topic}? Let's get personal.`,
      `Time to dig deeper into ${newsData.topic}. What's on your mind?`,
      `${newsData.topic} - let's talk about what this means for YOU.`
    ];
    
    const subtitleIndex = newsData.topic.length % subtitles.length;
    
    return {
      title: `Let's Talk: ${shortTopic}`,
      subtitle: subtitles[subtitleIndex]
    };
  };

  // Updated chat handler functions
  const handleQuestionClick = async (question: string) => {
    setChatMessages([{ role: 'user', content: question }]);
    setChatLoading(true);
    setChatError('');
    
    // Scroll to chat section
    const chatSection = document.getElementById('news-chat-section');
    if (chatSection) {
      chatSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    try {
      const response = await askQuestion({
        question,
        topic: newsData?.topic || '',
        context: {
          headline: newsData?.headline || '',
          summaryPoints: newsData?.summaryPoints || [],
          sources: newsData?.sources.map(s => ({
            outlet: s.outlet,
            headline: s.headline,
            url: s.url
          })) || []
        }
      });

      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatError('Failed to get response. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);
    setChatError('');

    try {
      const response = await askQuestion({
        question: userMessage,
        topic: newsData?.topic || '',
        context: {
          headline: newsData?.headline || '',
          summaryPoints: newsData?.summaryPoints || [],
          sources: newsData?.sources.map(s => ({
            outlet: s.outlet,
            headline: s.headline,
            url: s.url
          })) || [],
          previousMessages: chatMessages
        }
      });

      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatError('Failed to get response. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatMessages([]);
    setChatInput('');
    setChatError('');
    setChatExpanded(false);
  };

  // Simpler loading stage management
  useEffect(() => {
    if (!loading) {
      setLoadingStage('');
      return;
    }

    // Set initial stage
    setLoadingStage('searching');

    // Progress through stages automatically
    const stage1 = setTimeout(() => setLoadingStage('analyzing'), 5000);
    const stage2 = setTimeout(() => setLoadingStage('generating'), 10000);

    return () => {
      clearTimeout(stage1);
      clearTimeout(stage2);
    };
  }, [loading]);

  // Fetch trending topics on mount and every hour
  useEffect(() => {
    const loadTrendingTopics = async () => {
      setTopicsLoading(true);
      try {
        console.log('Fetching trending topics...');
        const topics = await fetchTrendingTopics();
        console.log('Received topics:', topics);
        setTrendingTopics(topics);
      } catch (error) {
        console.error('Failed to load trending topics:', error);
      } finally {
        setTopicsLoading(false);
      }
    };

    // Load immediately
    loadTrendingTopics();

    // Refresh every hour
    const interval = setInterval(loadTrendingTopics, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const handleCancelSynthesis = () => {
    setSynthesisAborted(true);
    setLoading(false);
    setLoadingStage('');
    toast({
      title: "Search Cancelled",
      description: "News synthesis was cancelled. Try another topic!",
    });
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
    if (!isProUser && !canUseFeature('unlimited_searches')) {
      toast({
        title: "Search Limit Reached",
        description: `You've used all ${searchLimit} free searches today. Upgrade to Pro for unlimited searches!`,
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
    setSynthesisAborted(false); // Reset abort flag

    try {
      // Check if user cancelled before making the API call
      if (synthesisAborted) {
        return;
      }

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
        includePhdAnalysis: includePhdAnalysis // Add PhD analysis option
      };

      const result = await synthesizeNews(request);
      setNewsData(result);
      setShowResults(true);
      
      // Increment search count for free users
      if (user && !isProUser) {
        try {
          await incrementSearchCount();
          console.log('Search count incremented successfully');
        } catch (error) {
          console.error('Failed to increment search count:', error);
        }
      }
      
      // Auto-save to search history if user is logged in
      if (user) {
        // Don't await - do this async so it doesn't block UI
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

  const handleBackToHome = () => {
    setShowResults(false);
    setNewsData(null);
    setTopic('');
    setChatMessages([]);
    setChatError('');
    setArticleSaved(false);
  };

  // Calm loading overlay component
  const LoadingOverlay = () => {
    if (!loading) return null;

    const currentStage = loadingStages.find(s => s.id === loadingStage) || loadingStages[0];
    const Icon = currentStage.icon;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 relative">
          {/* Add Cancel Button */}
          <Button
            onClick={handleCancelSynthesis}
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 hover:bg-gray-100"
            aria-label="Cancel search"
          >
            <X className="h-5 w-5" />
          </Button>
          
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

            {/* Smooth indeterminate progress bar */}
            <div className="mb-4">
              <div className="bg-gray-200 rounded-full h-3 overflow-hidden relative">
                <div className="absolute inset-0 -translate-x-full animate-progress-slide">
                  <div className="h-full w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
                </div>
              </div>
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <img 
                  src="/lovable-uploads/4aa0d947-eb92-4247-965f-85f5d500d005.png" 
                  alt="NewsGlide Logo" 
                  className="h-8 w-8"
                />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  NewsGlide Analysis
                </h1>
              </div>
              
              {/* Add Auth buttons and Save button in header */}
              <div className="flex items-center gap-3">
                {/* Save Article Button */}
                <Button
                  onClick={handleSaveArticle}
                  disabled={savingArticle}
                  variant={articleSaved ? "default" : "outline"}
                  className={articleSaved ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {savingArticle ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <BookmarkIcon className={`h-4 w-4 mr-2 ${articleSaved ? "fill-current" : ""}`} />
                  )}
                  {articleSaved ? "Saved ✓" : "Save Article"}
                </Button>

                {!authLoading && (
                  <>
                    {user ? (
                      <UserMenu 
                        onOpenSavedArticles={() => window.location.href = '/saved-articles'}
                        onOpenHistory={() => window.location.href = '/search-history'}
                      />
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAuthModalTab('signin');
                            setAuthModalOpen(true);
                          }}
                          className="bg-white/60 backdrop-blur-sm hover:bg-white/80"
                        >
                          Sign In
                        </Button>
                        <Button
                          size="sm"
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
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Collapse All Button */}
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (allSectionsCollapsed) {
                  // Expand all (except Morgan Freeman)
                  setKeyPointsVisible(true);
                  setArticleVisible(true);
                  setAllSectionsCollapsed(false);
                } else {
                  // Collapse all (except Morgan Freeman)
                  setKeyPointsVisible(false);
                  setArticleVisible(false);
                  setAllSectionsCollapsed(true);
                }
              }}
              className="text-xs flex items-center gap-1"
            >
              {allSectionsCollapsed ? (
                <>
                  <Eye className="h-3 w-3" />
                  Expand All Sections
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3" />
                  Collapse All Sections
                </>
              )}
            </Button>
          </div>

          <div className="space-y-6 animate-fade-in">
            {/* Updated collapsible Key Points/Questions Card */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="cursor-pointer select-none" onClick={() => setKeyPointsVisible(!keyPointsVisible)}>
                <CardTitle className="flex items-center justify-between">
                  <span>{headlineWithDate}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-2">
                      <Badge variant={newsData.confidenceLevel === 'High' ? 'default' : 'secondary'}>
                        {newsData.confidenceLevel} Confidence
                      </Badge>
                      <Badge variant={newsData.topicHottness === 'High' ? 'destructive' : 'outline'} className="flex items-center gap-1">
                        <Flame className="h-3 w-3" />
                        {newsData.topicHottness} Interest
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setKeyPointsVisible(!keyPointsVisible);
                      }}
                    >
                      {keyPointsVisible ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              
              {keyPointsVisible && (
                <CardContent className="animate-fade-in">
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
                          <li key={i} className="text-sm flex items-start gap-2 group">
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                            <button
                              onClick={() => handleQuestionClick(question)}
                              className="text-left hover:text-purple-600 transition-colors duration-200 flex items-start gap-2 group flex-1"
                            >
                              <span className="underline decoration-purple-300 decoration-1 underline-offset-2 group-hover:decoration-purple-500">
                                {question}
                              </span>
                              <MessageCircle className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0" />
                            </button>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-gray-500 mt-3 italic">
                        💡 Click to explore with AI • More questions below ↓
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
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

            {/* Enhanced Reading Level Tabs - Collapsible */}
            <div className="space-y-4">
              <div 
                className="flex items-center justify-between cursor-pointer select-none p-3 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setArticleVisible(!articleVisible)}
              >
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Read Full Analysis
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1"
                >
                  {articleVisible ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {articleVisible && (
                <Tabs 
                  defaultValue="base" 
                  value={selectedReadingLevel} 
                  onValueChange={(value) => {
                    // Don't allow selecting PhD if it wasn't generated
                    if (value === 'phd' && !newsData.article.phd) {
                      toast({
                        title: "PhD Analysis Not Available",
                        description: "Re-run the search with 'Include PhD-level analysis' checked",
                        variant: "destructive"
                      });
                      return;
                    }
                    setSelectedReadingLevel(value as 'base' | 'eli5' | 'phd');
                  }} 
                  className="w-full animate-fade-in"
                >
                  <TabsList className="grid w-full grid-cols-3 bg-white/60 backdrop-blur-sm">
                    <TabsTrigger value="base">📰 Essentials</TabsTrigger>
                    <TabsTrigger value="eli5">🧒 ELI5</TabsTrigger>
                    <TabsTrigger 
                      value="phd" 
                      disabled={!newsData.article.phd || !canUseFeature('phd_analysis')}
                      className={(!newsData.article.phd || !canUseFeature('phd_analysis')) ? "opacity-50 cursor-not-allowed" : ""}
                      onClick={() => {
                        if (!canUseFeature('phd_analysis')) {
                          toast({
                            title: "Pro Feature",
                            description: "PhD-level analysis is only available for Pro users. Upgrade to unlock!",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      🔬 PhD {!newsData.article.phd ? "(Not generated)" : !canUseFeature('phd_analysis') ? "Pro" : ""}
                    </TabsTrigger>
                  </TabsList>
                  {Object.entries(newsData.article).map(([level, content]) => (
                    content && (
                      <TabsContent key={level} value={level} className="mt-4">
                        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                          <CardContent className="pt-6 max-w-4xl mx-auto">
                            {/* Add reading level indicator */}
                            <div className="mb-4 text-sm text-gray-600 border-b border-gray-200 pb-3">
                              <span className="font-semibold">Reading Level:</span> {
                                level === 'base' ? 'Everyone' :
                                level === 'eli5' ? 'Ages 5+' :
                                level === 'phd' ? 'Academic Analysis' :
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
                    )
                  ))}
                </Tabs>
              )}
            </div>

            {/* Interactive Q&A Chat Section - Compact and Integrated */}
            <div className="mt-8 mb-8 animate-fade-in" id="news-chat-section">
              <Card className={`border-0 shadow-lg bg-white/80 backdrop-blur-sm transition-all duration-300 ${
                chatExpanded ? '' : 'overflow-hidden'
              }`}>
                {!chatExpanded ? (
                  // Collapsed state - single line
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-5 w-5 text-purple-500 flex-shrink-0" />
                      <div className="flex-1 relative">
                        <Input
                          placeholder={`Ask about ${newsData?.topic || 'this news'}...`}
                          value={chatInput}
                          onChange={(e) => {
                            setChatInput(e.target.value);
                            // Don't expand on typing anymore
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && chatInput.trim()) {
                              e.preventDefault();
                              setChatExpanded(true); // Expand when sending
                              handleSendMessage();
                            }
                          }}
                          className="pr-10 bg-gray-50/50"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                          onClick={() => {
                            if (chatInput.trim()) {
                              setChatExpanded(true); // Expand when sending
                              handleSendMessage();
                            }
                          }}
                        >
                          <Send className="h-4 w-4 text-purple-600" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Fun, engaging quick action buttons */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setChatExpanded(true);
                          handleQuestionClick("How does this affect me personally?");
                        }}
                        className="text-xs hover:bg-purple-50"
                      >
                        How does this affect me? 🤔
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setChatExpanded(true);
                          handleQuestionClick("What's the hot take on this?");
                        }}
                        className="text-xs hover:bg-purple-50"
                      >
                        Give me a hot take 🔥
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setChatExpanded(true);
                          handleQuestionClick("What's everyone missing about this story?");
                        }}
                        className="text-xs hover:bg-purple-50"
                      >
                        Hidden angle? 🕵️
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  // Expanded state - full chat interface
                  <>
                    <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-blue-50">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="h-5 w-5 text-purple-500" />
                          <span className="text-lg">{getChatPersonalization().title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {chatMessages.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleClearChat}
                              className="text-xs"
                            >
                              Clear
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setChatExpanded(false);
                              setChatInput('');
                            }}
                            className="p-1"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="pt-4">
                      <div className="h-[300px] flex flex-col">
                        {/* Chat messages area */}
                        {chatMessages.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                              <MessageCircle className="h-10 w-10 mx-auto mb-3 text-purple-400/50" />
                              <p className="text-sm text-gray-700 mb-3 font-medium">
                                {getChatPersonalization().subtitle}
                              </p>
                              <div className="flex flex-wrap gap-2 justify-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleQuestionClick("How does this affect me personally?")}
                                  className="text-xs hover:bg-purple-50"
                                >
                                  How does this affect me? 🤔
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleQuestionClick("What's the hot take on this?")}
                                  className="text-xs hover:bg-purple-50"
                                >
                                  Give me a hot take 🔥
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleQuestionClick("What's everyone missing about this story?")}
                                  className="text-xs hover:bg-purple-50"
                                >
                                  Hidden angle? 🕵️
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleQuestionClick("Explain this like I'm 5 years old")}
                                  className="text-xs hover:bg-purple-50"
                                >
                                  ELI5 version? 👶
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <ScrollArea className="flex-1 pr-4">
                            <div className="space-y-3">
                              {chatMessages.map((message, idx) => (
                                <div
                                  key={idx}
                                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} chat-message`}
                                >
                                  <div
                                    className={`max-w-[85%] rounded-lg p-3 text-sm ${
                                      message.role === 'user'
                                        ? 'bg-purple-100 text-purple-900'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                  </div>
                                </div>
                              ))}
                              
                              {chatLoading && (
                                <div className="flex justify-start chat-message">
                                  <div className="bg-gray-100 rounded-lg p-3">
                                    <div className="flex items-center gap-2">
                                      <Loader2 className="h-3 w-3 animate-spin text-gray-600" />
                                      <span className="text-xs text-gray-600">Thinking...</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {chatError && (
                                <div className="text-center">
                                  <p className="text-xs text-red-600">{chatError}</p>
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        )}

                        {/* Input Area */}
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex gap-2">
                            <Textarea
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendMessage();
                                }
                              }}
                              placeholder={`Ask about ${newsData?.topic || 'this news'}...`}
                              className="resize-none min-h-[40px] text-sm"
                              rows={1}
                              disabled={chatLoading}
                            />
                            <Button
                              onClick={handleSendMessage}
                              disabled={!chatInput.trim() || chatLoading}
                              size="sm"
                              className="px-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <p className="text-xs text-gray-500 mt-1">
                            Enter to send • Shift+Enter for new line
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            </div>

            {/* Morgan Freeman Voice Player Section - Collapsible */}
            <div className="mt-6 animate-fade-in">
              <div className="space-y-2">
                <div 
                  className="flex items-center justify-between cursor-pointer select-none p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setMorganFreemanVisible(!morganFreemanVisible)}
                >
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Volume2 className="h-5 w-5 text-purple-600" />
                    Listen with Morgan Freeman
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMorganFreemanVisible(!morganFreemanVisible);
                    }}
                  >
                    {morganFreemanVisible ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {morganFreemanVisible && (
                  <div className="animate-fade-in">
                    <MorganFreemanPlayer 
                      text={newsData.article[selectedReadingLevel]} 
                      articleType={selectedReadingLevel}
                      topic={newsData.topic}
                      canUseFeature={canUseFeature('morgan_freeman')}
                    />
                  </div>
                )}
              </div>
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

        {/* Auth Modal */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          defaultTab={authModalTab}
        />
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center justify-center gap-4 flex-1">
                <img 
                  src="/lovable-uploads/4aa0d947-eb92-4247-965f-85f5d500d005.png" 
                  alt="NewsGlide Logo" 
                  className="h-12 w-12"
                />
                <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  NewsGlide
                </h1>
              </div>
              
              {/* Auth buttons in top right */}
              <div className="flex items-center gap-3">
                {!authLoading && (
                  <>
                    {user ? (
                      <>
                        {/* Subscription Status Indicator */}
                        <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-1 text-sm">
                          {isProUser ? (
                            <Badge variant="default" className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                              ✨ Pro
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-600">
                              <span>{dailySearchCount}/{searchLimit}</span>
                              <span className="text-xs">searches</span>
                            </div>
                          )}
                        </div>
                        <UserMenu 
                          onOpenSavedArticles={() => window.location.href = '/saved-articles'}
                          onOpenHistory={() => window.location.href = '/search-history'}
                        />
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAuthModalTab('signin');
                            setAuthModalOpen(true);
                          }}
                          className="bg-white/60 backdrop-blur-sm hover:bg-white/80"
                        >
                          Sign In
                        </Button>
                        <Button
                          size="sm"
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
                  </>
                )}
              </div>
            </div>
            
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              Glide through the noise. Our model does not serve an agenda — it serves you.
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
              
              {/* Add PhD Analysis Option */}
              <div className="flex items-center justify-center mt-4 text-sm">
                <label className={`flex items-center gap-2 ${canUseFeature('phd_analysis') ? 'cursor-pointer hover:text-blue-600' : 'cursor-not-allowed opacity-60'} transition-colors`}>
                  <input
                    type="checkbox"
                    checked={includePhdAnalysis && canUseFeature('phd_analysis')}
                    onChange={(e) => {
                      if (!canUseFeature('phd_analysis')) {
                        toast({
                          title: "Pro Feature",
                          description: "PhD-level analysis is only available for Pro users. Upgrade to unlock!",
                          variant: "destructive"
                        });
                        return;
                      }
                      setIncludePhdAnalysis(e.target.checked);
                    }}
                    disabled={!canUseFeature('phd_analysis')}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span>
                    Include PhD-level analysis (adds ~10 seconds)
                    {!canUseFeature('phd_analysis') && <span className="ml-1 text-blue-600 font-semibold">Pro</span>}
                  </span>
                </label>
              </div>
            </div>

            {/* Example Topics */}
            <div className="flex flex-wrap justify-center items-center gap-3 mb-16">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-gray-700">Try:</span>
                {!topicsLoading && (
                  <button
                    onClick={async () => {
                      setTopicsLoading(true);
                      try {
                        // Force new fetch by adding timestamp
                        const topics = await fetchTrendingTopics();
                        console.log('Refreshed topics:', topics);
                        
                        // Only update if we got new topics
                        if (topics && topics.length > 0) {
                          setTrendingTopics(topics);
                        }
                      } catch (error) {
                        console.error('Refresh failed:', error);
                        toast({
                          title: "Couldn't refresh topics",
                          description: "Using cached suggestions",
                          variant: "destructive"
                        });
                      } finally {
                        setTopicsLoading(false);
                      }
                    }}
                    className="ml-2 p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-200"
                    title="Refresh trending topics"
                  >
                    <RefreshCw className={`h-4 w-4 ${topicsLoading ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>
              
              {trendingTopics.map((example, i) => (
                <Button
                  key={`${example}-${Date.now()}-${i}`} // Force re-render
                  variant="outline"
                  size="sm"
                  onClick={() => handleSynthesize(example)}
                  disabled={loading || topicsLoading}
                  className="bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-all duration-200"
                >
                  {topicsLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      {example}
                      {i === 0 && <Badge variant="secondary" className="ml-1 text-xs scale-90">Hot</Badge>}
                    </>
                  )}
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
              Our cutting-edge AI model beats traditional news media in every sense. Here's how:
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </div>
  );
};

export default Index;
