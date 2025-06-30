import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Sparkles, GraduationCap, BookOpen, Clock, TrendingUp, Globe, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VoicePlayer } from "@/components/VoicePlayer";
import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const [topic, setTopic] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useAuth();

  const trendingTopics = [
    { name: "Artificial Intelligence", icon: "🤖", searches: "2.1M" },
    { name: "Climate Change", icon: "🌍", searches: "1.8M" },
    { name: "Space Exploration", icon: "🚀", searches: "1.5M" },
    { name: "Cryptocurrency", icon: "₿", searches: "1.2M" },
    { name: "Healthcare Innovation", icon: "⚕️", searches: "1.0M" },
    { name: "Renewable Energy", icon: "⚡", searches: "950K" }
  ];

  const fetchNews = async (searchTopic: string) => {
    console.log("Fetching news for topic:", searchTopic);
    
    const response = await supabase.functions.invoke('news-synthesis', {
      body: { topic: searchTopic }
    });

    console.log("Supabase response:", response);

    if (response.error) {
      console.error("Supabase error:", response.error);
      throw new Error(response.error.message || 'Failed to fetch news');
    }

    if (!response.data) {
      throw new Error('No data received from news synthesis');
    }

    return response.data;
  };

  const { data: newsData, isLoading, error, refetch } = useQuery({
    queryKey: ['news', searchTerm],
    queryFn: () => fetchNews(searchTerm),
    enabled: false, // Don't auto-fetch
  });

  const handleSearch = (searchTopic?: string) => {
    const topicToSearch = searchTopic || topic;
    if (topicToSearch.trim()) {
      setSearchTerm(topicToSearch.trim());
      refetch();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header with User Menu */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              NewsGlide
            </h1>
          </div>
          <UserMenu />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Message for Logged In Users */}
        {user && (
          <div className="mb-6">
            <p className="text-lg text-gray-700">
              Welcome back, <span className="font-semibold text-blue-600">{user.email?.split('@')[0]}</span>! 
              Ready to explore today's news?
            </p>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
            News That Adapts to You
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Get AI-powered news summaries tailored to your reading level. From simple explanations to PhD-level analysis.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="What news topic interests you today?"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-12 pr-32 py-6 text-lg rounded-full border-2 border-gray-200 focus:border-blue-400 shadow-lg"
              />
              <Button 
                onClick={() => handleSearch()}
                disabled={isLoading || !topic.trim()}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  "Search"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Trending Topics */}
        {!searchTerm && (
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Trending Topics</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {trendingTopics.map((trending, index) => (
                <Card 
                  key={index} 
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-0 bg-white/70 backdrop-blur-sm"
                  onClick={() => handleSearch(trending.name)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{trending.icon}</span>
                        <div>
                          <h4 className="font-semibold text-gray-800">{trending.name}</h4>
                          <p className="text-sm text-gray-500">{trending.searches} searches</p>
                        </div>
                      </div>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="max-w-2xl mx-auto border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <div className="text-red-600 mb-2">
                <Globe className="h-8 w-8 mx-auto mb-2" />
                <h3 className="text-lg font-semibold">Unable to fetch news</h3>
                <p className="text-sm mt-1">
                  {error instanceof Error ? error.message : 'Please try again later'}
                </p>
              </div>
              <Button 
                onClick={() => refetch()} 
                variant="outline" 
                className="mt-4 border-red-300 text-red-600 hover:bg-red-100"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* News Results */}
        {newsData && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6 text-center">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Latest on "{searchTerm}"</h3>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Updated just now</span>
                <Badge variant="secondary" className="ml-2">
                  <Zap className="h-3 w-3 mr-1" />
                  AI Generated
                </Badge>
              </div>
            </div>

            <Tabs defaultValue="base" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-white/70 backdrop-blur-sm">
                <TabsTrigger value="base" className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Standard
                </TabsTrigger>
                <TabsTrigger value="eli5" className="flex items-center gap-2 ">
                  <Sparkles className="h-4 w-4" />
                  Simple
                </TabsTrigger>
                <TabsTrigger value="phd" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Academic 
                </TabsTrigger>
              </TabsList>

              {['base', 'eli5', 'phd'].map((level) => (
                <TabsContent key={level} value={level}>
                  <div className="space-y-6">
                    <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-2xl leading-relaxed">
                          {newsData[level]?.headline || `${searchTerm} - Latest Updates`}
                        </CardTitle>
                        <CardDescription className="text-base">
                          {level === 'eli5' && "Explained in simple terms"}
                          {level === 'base' && "Comprehensive overview"}
                          {level === 'phd' && "In-depth analysis"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-lg max-w-none">
                          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                            {newsData[level]?.content || "Content not available"}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Voice Player Component */}
                    {newsData[level]?.content && (
                      <VoicePlayer 
                        text={newsData[level].content}
                        articleType={level as 'base' | 'eli5' | 'phd'}
                        topic={searchTerm}
                      />
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        {/* Features Section */}
        {!searchTerm && (
          <div className="mt-20 text-center">
            <h3 className="text-3xl font-bold text-gray-800 mb-12">Why Choose NewsGlide?</h3>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <Card className="border-0 bg-white/70 backdrop-blur-sm shadow-lg">
                <CardContent className="p-6 text-center">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                  <h4 className="text-xl font-semibold mb-2">AI-Powered</h4>
                  <p className="text-gray-600">Advanced AI creates personalized news summaries tailored to your reading level</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-white/70 backdrop-blur-sm shadow-lg">
                <CardContent className="p-6 text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-purple-600" />
                  <h4 className="text-xl font-semibold mb-2">Multiple Levels</h4>
                  <p className="text-gray-600">From simple explanations to academic analysis - choose what works for you</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-white/70 backdrop-blur-sm shadow-lg">
                <CardContent className="p-6 text-center">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <h4 className="text-xl font-semibold mb-2">Real-time</h4>
                  <p className="text-gray-600">Get the latest news updates synthesized from multiple trusted sources</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
