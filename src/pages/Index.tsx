import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, Lightbulb, User, Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { VoicePlayer } from "@/components/VoicePlayer";
import { UserMenu } from "@/components/navigation/UserMenu";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from '@/integrations/supabase/client';

interface NewsArticle {
  title: string;
  source: string;
  published_date: string;
  summary: string;
  url: string;
  relevance_score: number;
}

interface NewsData {
  headline: string;
  synthesis: string;
  sources_count: number;
  confidence_level: number;
  topic_hottness: number;
  articles: NewsArticle[];
}

const mockSearchNews = async (topic: string, readingLevel: "base" | "eli5" | "phd"): Promise<NewsData> => {
  // Simulate an API call with a delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const baseSynthesis = `In a stunning turn of events, the world has been captivated by the recent advancements in ${topic}. Scientists have achieved breakthroughs that were once considered the realm of science fiction. The implications of these discoveries are far-reaching, promising to reshape industries and redefine our understanding of the universe.`;
  const eli5Synthesis = `${topic} is getting super cool! Scientists are making big steps, like in movies. This could change everything and how we see the world.`;
  const phdSynthesis = `Recent investigations into ${topic} have yielded significant advancements, challenging existing paradigms and necessitating a reevaluation of established theoretical frameworks. These findings, characterized by a high degree of empirical validation, portend transformative shifts across multiple disciplines.`;

  const synthesis = readingLevel === "base" ? baseSynthesis : readingLevel === "eli5" ? eli5Synthesis : phdSynthesis;

  return {
    headline: `AI Revolutionizes ${topic} Research`,
    synthesis: synthesis,
    sources_count: 7,
    confidence_level: 0.95,
    topic_hottness: 0.8,
    articles: Array.from({ length: 5 }, (_, i) => ({
      title: `Article ${i + 1}: Key Findings in ${topic}`,
      source: `Source ${i + 1}`,
      published_date: "2024-07-15",
      summary: "This article delves into the specifics of the AI advancements, providing a detailed analysis of the methodologies employed and the results obtained.",
      url: "https://example.com/article1",
      relevance_score: Math.random() * 100,
    })),
  };
};

const getReadingLevelColor = (level: "base" | "eli5" | "phd") => {
  switch (level) {
    case "eli5":
      return "bg-green-100 text-green-700";
    case "base":
      return "bg-blue-100 text-blue-700";
    case "phd":
      return "bg-red-100 text-red-700";
    default:
      return "";
  }
};

const getReadingLevelDescription = (level: "base" | "eli5" | "phd") => {
  switch (level) {
    case "eli5":
      return "Simple explanations for everyone";
    case "base":
      return "Standard news reporting";
    case "phd":
      return "In-depth, academic analysis";
    default:
      return "";
  }
};

const Index = () => {
  const [searchTopic, setSearchTopic] = useState("");
  const [readingLevel, setReadingLevel] = useState<"base" | "eli5" | "phd">("base");
  const { user } = useAuth();

  const { data: newsData, isLoading, error, refetch } = useQuery({
    queryKey: ["news", searchTopic, readingLevel],
    queryFn: () => mockSearchNews(searchTopic, readingLevel),
    enabled: false,
  });

  const handleSearch = async () => {
    if (!searchTopic.trim()) return;
    
    // Save search to history if user is logged in
    if (user) {
      try {
        await supabase
          .from('search_history')
          .insert({
            user_id: user.id,
            topic: searchTopic.trim()
          });
      } catch (error) {
        console.error('Error saving search history:', error);
      }
    }
    
    refetch();
  };

  const handleSaveArticle = async (article: any) => {
    if (!user) return;
    
    // This is just UI preparation - actual saving will be implemented later
    console.log('Save article:', article);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              NewsGlide
            </h1>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
              AI-Powered
            </Badge>
          </div>
          <UserMenu />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        {user && (
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Welcome back! Ready to explore the news?
            </h2>
          </div>
        )}

        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Discover News with AI Intelligence
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Get comprehensive news analysis tailored to your reading level, 
            powered by advanced AI synthesis
          </p>

          {/* Search Section */}
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Enter a news topic (e.g., 'climate change', 'AI developments')"
                value={searchTopic}
                onChange={(e) => setSearchTopic(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 h-12 text-lg"
              />
              <Button 
                onClick={handleSearch} 
                disabled={!searchTopic.trim() || isLoading}
                className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Search className="mr-2 h-5 w-5" />
                {isLoading ? "Searching..." : "Search"}
              </Button>
            </div>

            {/* Reading Level Selector */}
            <div className="flex flex-wrap justify-center gap-2">
              {(["base", "eli5", "phd"] as const).map((level) => (
                <Button
                  key={level}
                  variant={readingLevel === level ? "default" : "outline"}
                  size="sm"
                  onClick={() => setReadingLevel(level)}
                  className={readingLevel === level ? getReadingLevelColor(level) : ""}
                >
                  {level === "base" ? "Standard" : level === "eli5" ? "Simple" : "Advanced"}
                </Button>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              {getReadingLevelDescription(readingLevel)}
            </p>
          </div>
        </div>

        {/* Results Section */}
        {error && (
          <Card className="max-w-2xl mx-auto mb-8 border-red-200 bg-red-50">
            <CardContent className="p-6">
              <p className="text-red-600">
                Failed to fetch news. Please try again later.
              </p>
            </CardContent>
          </Card>
        )}

        {newsData && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Main Story */}
            <Card className="border-2 border-blue-200 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">{newsData.headline}</CardTitle>
                    <CardDescription className="text-base">
                      Synthesized from {newsData.sources_count} sources • 
                      Confidence: {newsData.confidence_level} • 
                      Topic Interest: {newsData.topic_hottness}
                    </CardDescription>
                  </div>
                  {user && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveArticle(newsData)}
                      className="ml-4"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-lg max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {newsData.synthesis}
                  </p>
                </div>
                
                <div className="pt-4 border-t">
                  <VoicePlayer text={newsData.synthesis} />
                </div>
              </CardContent>
            </Card>

            {/* Individual Articles */}
            <div className="grid gap-6 md:grid-cols-2">
              {newsData.articles.map((article, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg leading-tight flex-1">
                        {article.title}
                      </CardTitle>
                      {user && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveArticle(article)}
                          className="ml-2"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <CardDescription>
                      {article.source} • {article.published_date}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-4 line-clamp-3">
                      {article.summary}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        Relevance: {article.relevance_score}%
                      </Badge>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Read Full Article →
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Features Section */}
        {!newsData && (
          <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8 mt-16">
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <CardTitle className="mb-2">AI Synthesis</CardTitle>
              <CardDescription>
                Get comprehensive summaries from multiple news sources, 
                synthesized by advanced AI
              </CardDescription>
            </Card>
            
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <Lightbulb className="h-12 w-12 mx-auto mb-4 text-purple-600" />
              <CardTitle className="mb-2">Smart Analysis</CardTitle>
              <CardDescription>
                Understand complex topics with confidence scores 
                and relevance ratings
              </CardDescription>
            </Card>
            
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <User className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <CardTitle className="mb-2">Personalized</CardTitle>
              <CardDescription>
                Choose your reading level from simple explanations 
                to academic depth
              </CardDescription>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
