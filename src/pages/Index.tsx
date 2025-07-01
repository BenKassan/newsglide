import { useEffect, useState } from 'react';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { NewsData, synthesizeNews, askQuestion, fetchTrendingTopics } from "@/services/openaiService";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FactOpinionView } from "@/components/FactOpinionView";
import { PerspectiveView } from "@/components/PerspectiveView";
import { MissingContextView } from "@/components/MissingContextView";
import { calculateBiasBalance } from "@/services/biasDetectionService";
import { Info, MessageCircle, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Index() {
  const [topic, setTopic] = useState<string>('Explainable AI');
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [question, setQuestion] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [selectedPerspective, setSelectedPerspective] = useState('traditional');
  const [isSynthesisCancelled, setIsSynthesisCancelled] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{
    role: 'user' | 'assistant',
    content: string
  }>>([]);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [clickedQuestion, setClickedQuestion] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadTrendingTopics = async () => {
      const topics = await fetchTrendingTopics();
      setTrendingTopics(topics);
    };

    loadTrendingTopics();
  }, []);

  const handleTopicChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(event.target.value);
  };

  const handleQuestionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuestion(event.target.value);
  };

  const handleSynthesis = async () => {
    setIsSynthesisCancelled(false);
    setIsLoading(true);
    setShowResults(false);
    setAnswer('');
    setNewsData(null);

    try {
      const data = await synthesizeNews({
        topic: topic,
        targetOutlets: [
          { name: 'Reuters', type: 'News Agency' },
          { name: 'CNN', type: 'Broadcast Media' },
          { name: 'TechCrunch', type: 'Online Media' },
          { name: 'The New York Times', type: 'National Newspaper' }
        ],
        freshnessHorizonHours: 48,
        targetWordCount: 1000,
        includePhdAnalysis: true
      });

      if (isSynthesisCancelled) {
        console.log('Synthesis was cancelled, ignoring results');
        return;
      }

      setNewsData(data);
      setShowResults(true);
    } catch (error: any) {
      console.error("Synthesis error:", error);
      setAnswer(error.message || 'Failed to synthesize news.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    setIsLoading(true);
    setAnswer('');

    if (!newsData) {
      setAnswer('Please synthesize news first.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await askQuestion({
        question: question,
        topic: topic,
        context: {
          headline: newsData.headline,
          summaryPoints: newsData.summaryPoints,
          sources: newsData.sources.map(s => ({
            outlet: s.outlet,
            headline: s.headline,
            url: s.url
          }))
        }
      });
      setAnswer(response);
    } catch (error: any) {
      console.error("Question error:", error);
      setAnswer(error.message || 'Failed to get answer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionClick = async (question: string) => {
    setClickedQuestion(question);
    setChatMessages([{ role: 'user', content: question }]);
    setChatExpanded(true);
    setChatLoading(true);
    setChatError('');
    
    setTimeout(() => {
      const chatSection = document.getElementById('news-chat-section');
      if (chatSection) {
        chatSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

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
      
      setTimeout(() => {
        toast({
          title: "💡 Tip",
          description: "Ask a follow-up question or try another key question!",
          duration: 4000,
        });
      }, 2000);
      
    } catch (error) {
      console.error('Chat error:', error);
      setChatError('Failed to get response. Please try again.');
    } finally {
      setChatLoading(false);
      setTimeout(() => setClickedQuestion(null), 1000);
    }
  };

  const handleTopicClick = (topic: string) => {
    setTopic(topic);
  };

  const biasBalance = newsData ? calculateBiasBalance(newsData.sources.map(s => s.outlet)) : null;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4 rounded">
        News Analysis & Multi-Perspective Synthesis
      </h1>

      {/* Input Section */}
      <div className="mb-6 flex space-x-4">
        <Input
          type="text"
          placeholder="Enter a topic"
          value={topic}
          onChange={handleTopicChange}
          className="flex-grow"
        />
        <Button onClick={handleSynthesis} disabled={isLoading}>
          {isLoading ? (
            <>
              Loading <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            </>
          ) : (
            "Synthesize News"
          )}
        </Button>
      </div>

      {/* Trending Topics */}
      {trendingTopics.length > 0 && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Trending Topics</h2>
          <div className="flex flex-wrap gap-2">
            {trendingTopics.map((topic, index) => (
              <Button
                key={index}
                variant="secondary"
                size="sm"
                onClick={() => handleTopicClick(topic)}
              >
                {topic}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Results Section */}
      {showResults && newsData && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              News Analysis: {newsData.headline}
            </h2>
            {biasBalance && (
              <div className="flex items-center gap-2">
                <Badge variant={biasBalance.balance === 'Balanced' ? 'default' : 'secondary'}>
                  Sources: {biasBalance.balance}
                </Badge>
                <div className="group relative">
                  <Info className="h-4 w-4 text-gray-500 cursor-help" />
                  <div className="absolute right-0 top-6 hidden group-hover:block bg-black text-white text-xs p-2 rounded whitespace-nowrap z-10">
                    {biasBalance.recommendation}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Tabs value={selectedPerspective} onValueChange={setSelectedPerspective} className="w-full">
            <TabsList className="grid grid-cols-5 mb-4">
              <TabsTrigger value="traditional">Traditional</TabsTrigger>
              <TabsTrigger value="facts">Just Facts</TabsTrigger>
              <TabsTrigger value="progressive">Progressive</TabsTrigger>
              <TabsTrigger value="conservative">Conservative</TabsTrigger>
              <TabsTrigger value="missing">What's Missing</TabsTrigger>
            </TabsList>
            
            <TabsContent value="traditional" className="space-y-4">
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <Badge variant={newsData.confidenceLevel === 'High' ? 'default' : 'secondary'}>
                        {newsData.confidenceLevel} Confidence
                      </Badge>
                      <Badge variant={newsData.topicHottness === 'High' ? 'destructive' : 'secondary'}>
                        {newsData.topicHottness} Interest
                      </Badge>
                    </div>
                  </div>
                  
                  <Tabs defaultValue="base" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                      <TabsTrigger value="base">Base</TabsTrigger>
                      <TabsTrigger value="eli5">ELI5</TabsTrigger>
                      <TabsTrigger value="phd">PhD</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="base">
                      <article className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
                        {newsData.article.base.split('\n\n').map((paragraph, i) => (
                          <p key={i} className="mb-4">{paragraph}</p>
                        ))}
                      </article>
                    </TabsContent>
                    
                    <TabsContent value="eli5">
                      <article className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
                        {newsData.article.eli5.split('\n\n').map((paragraph, i) => (
                          <p key={i} className="mb-4 text-lg">{paragraph}</p>
                        ))}
                      </article>
                    </TabsContent>
                    
                    <TabsContent value="phd">
                      <article className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
                        {newsData.article.phd ? (
                          newsData.article.phd.split('\n\n').map((paragraph, i) => (
                            <p key={i} className="mb-4">{paragraph}</p>
                          ))
                        ) : (
                          <p className="text-gray-600 italic">PhD analysis not available for this topic.</p>
                        )}
                      </article>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="facts">
              <FactOpinionView 
                factualCore={newsData.factualCore || []} 
                disputedFacts={newsData.disputedFacts || []} 
              />
            </TabsContent>
            
            <TabsContent value="progressive">
              <PerspectiveView 
                perspective={newsData.perspectives?.progressive || {
                  headline: "Progressive perspective not available",
                  narrative: "This perspective was not generated for the current analysis.",
                  emphasis: "Try a different topic or request reanalysis."
                }}
                color="blue"
                title="Progressive Perspective"
              />
            </TabsContent>
            
            <TabsContent value="conservative">
              <PerspectiveView 
                perspective={newsData.perspectives?.conservative || {
                  headline: "Conservative perspective not available", 
                  narrative: "This perspective was not generated for the current analysis.",
                  emphasis: "Try a different topic or request reanalysis."
                }}
                color="red"
                title="Conservative Perspective"
              />
            </TabsContent>
            
            <TabsContent value="missing">
              <MissingContextView 
                missingContext={newsData.missingContext || []}
                biasIndicators={newsData.biasIndicators || []}
              />
            </TabsContent>
          </Tabs>

          {/* Summary Points */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-800">Key Summary Points</h3>
              <ul className="space-y-2">
                {newsData.summaryPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Key Questions */}
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-purple-800">Key Questions</h3>
              <ul className="space-y-2">
                {newsData.keyQuestions.map((question, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                    <button
                      onClick={() => handleQuestionClick(question)}
                      className={`text-left hover:text-purple-600 transition-all duration-200 flex items-start gap-2 group flex-1 relative ${
                        clickedQuestion === question ? 'animate-pulse text-purple-600' : ''
                      }`}
                    >
                      <span className="underline decoration-purple-300 decoration-1 underline-offset-2 group-hover:decoration-purple-500 group-hover:decoration-2">
                        {question}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MessageCircle className="h-3 w-3 flex-shrink-0" />
                        <span className="text-xs text-purple-600">Ask AI</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Sources */}
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Sources</h3>
              <div className="grid gap-3">
                {newsData.sources.map((source, i) => (
                  <div key={i} className="p-3 bg-white rounded border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{source.outlet}</h4>
                        <p className="text-xs text-gray-600 mt-1">{source.headline}</p>
                      </div>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 text-xs underline"
                      >
                        Read
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Chat Section */}
          <div className="mb-6" id="news-chat-section">
            <h2 className="text-xl font-semibold mb-2">Ask a Question</h2>
            <div className="flex space-x-4">
              <Input
                type="text"
                placeholder="Enter your question"
                value={question}
                onChange={handleQuestionChange}
                className="flex-grow"
              />
              <Button onClick={handleAskQuestion} disabled={isLoading}>
                {isLoading ? (
                  <>
                    Loading <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  </>
                ) : (
                  "Get Answer"
                )}
              </Button>
            </div>
            {answer && (
              <Card className="mt-4">
                <CardContent>
                  <p>{answer}</p>
                </CardContent>
              </Card>
            )}

            {/* Chat Messages */}
            {chatExpanded && (
              <Card className="mt-4 border-purple-200">
                <CardContent className="p-4">
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {chatMessages.map((message, idx) => {
                      const isKeyQuestion = newsData?.keyQuestions.includes(message.content);
                      
                      return (
                        <div
                          key={idx}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} chat-message`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg p-3 text-sm ${
                              message.role === 'user'
                                ? isKeyQuestion 
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                                  : 'bg-purple-100 text-purple-900'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {isKeyQuestion && message.role === 'user' && (
                              <div className="text-xs text-purple-600 mb-1 flex items-center gap-1">
                                <Brain className="h-3 w-3" />
                                Key Question
                              </div>
                            )}
                            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          </div>
                        </div>
                      );
                    })}

                    {chatLoading && (
                      <div className="flex justify-start chat-message">
                        <div className="bg-gray-100 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                              <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                              <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                            </div>
                            <span className="text-xs text-gray-600">Thinking about your question...</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {chatError && (
                      <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
                        {chatError}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {answer && !showResults && (
        <Card className="mt-6">
          <CardContent>
            <p className="text-red-500">{answer}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
