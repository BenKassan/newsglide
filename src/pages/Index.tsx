import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, TrendingUp, Shield, Clock, Brain, Star, Users, Zap, Flame, CheckCircle } from 'lucide-react';
import { synthesizeNews, SynthesisRequest, NewsData } from '@/services/openaiService';

const Index = () => {
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  const exampleTopics = [
    "AI Regulations",
    "Climate Summit", 
    "Tech Earnings",
    "Election Updates"
  ];

  const valueProps = [
    {
      icon: Shield,
      title: "Cut Through Media Bias",
      description: "AI analyzes multiple sources to reveal different perspectives and identify potential bias."
    },
    {
      icon: Zap,
      title: "Spot Sensationalism",
      description: "Identifies when stories are being exaggerated for clicks versus factual reporting."
    },
    {
      icon: Clock,
      title: "Save Research Time",
      description: "Get comprehensive analysis in seconds, not hours of manual research."
    },
    {
      icon: Brain,
      title: "Understand Complex Topics",
      description: "Adjustable reading levels from ELI5 to PhD-level analysis."
    }
  ];

  const testimonials = [
    {
      quote: "Perfect for students researching current events without the media spin.",
      author: "Sarah M., University Student",
      rating: 5
    },
    {
      quote: "Helps investors understand market news without the hype and speculation.",
      author: "Mike R., Financial Analyst",
      rating: 5
    },
    {
      quote: "Great for parents wanting to explain world events to kids at their level.",
      author: "Jessica L., Parent & Teacher",
      rating: 5
    }
  ];

  const handleSynthesize = async (searchTopic?: string) => {
    const currentTopic = searchTopic || topic.trim();
    if (!currentTopic) {
      toast({
        title: "Error",
        description: "Please enter a topic to synthesize news about.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
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
      
      toast({
        title: "Success",
        description: `News synthesis completed for "${currentTopic}"`,
      });
    } catch (error) {
      console.error('Synthesis failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to synthesize news',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    setShowResults(false);
    setNewsData(null);
    setTopic('');
  };

  if (showResults && newsData) {
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

          <div className="space-y-6 animate-fade-in">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {newsData.headline}
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
                    <CardContent className="pt-6">
                      <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>

            {newsData.sources.length > 0 && (
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Sources ({newsData.sources.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {newsData.sources.map((source) => (
                      <div key={source.id} className="border rounded-lg p-4 bg-white/50 hover:bg-white/70 transition-all duration-200">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-blue-600">{source.outlet}</h4>
                          <Badge variant="outline">{source.type}</Badge>
                        </div>
                        <p className="text-sm font-medium mb-1">{source.headline}</p>
                        <p className="text-xs text-gray-600 mb-2">{source.analysisNote}</p>
                        <p className="text-xs text-gray-500">
                          Published: {new Date(source.publishedAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
              Glide through the noise with clarity. Our AI does not serve an agenda, and just wants to give you the news
            </p>

            {/* Enhanced Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative flex gap-2 p-2 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      placeholder="Enter any topic (e.g., 'nvidia stock price today', 'climate summit')"
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
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Analyzing...
                      </div>
                    ) : (
                      'Analyze News'
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
              Cut through the noise with AI-powered analysis that reveals the complete story
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
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

      {/* Social Proof Section */}
      <div className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-800 mb-4">
              Trusted by Researchers Everywhere
            </h3>
            <p className="text-xl text-gray-600">
              See what people are saying about NewsGlide
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, i) => (
              <Card 
                key={i} 
                className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300"
              >
                <CardContent className="p-8">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 italic">
                    "{testimonial.quote}"
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {testimonial.author}
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
                <p>✨ The latest, top performing AI models</p>
                <p>🌐 Real-time Web Search</p>
                <p>📊 100+ News Sources</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Trust & Transparency</h4>
              <div className="space-y-2 text-gray-400">
                <p>🔒 Privacy Focused</p>
                <p>🎯 Unbiased Analysis</p>
                <p>📈 Constantly Improving</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 NewsGlide. Built with AI to help democratize news understanding.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
