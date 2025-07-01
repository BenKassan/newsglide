import { useEffect, useState } from 'react';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { NewsData, synthesizeNews, askQuestion, fetchTrendingTopics } from "@/services/openaiService";
import { ChatView } from "@/components/ChatView";
import { SourceList } from "@/components/SourceList";
import { KeyQuestions } from "@/components/KeyQuestions";
import { SummaryPoints } from "@/components/SummaryPoints";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FactOpinionView } from "@/components/FactOpinionView";
import { PerspectiveView } from "@/components/PerspectiveView";
import { MissingContextView } from "@/components/MissingContextView";
import { calculateBiasBalance } from "@/services/biasDetectionService";
import { Info } from "lucide-react";

export default function Index() {
  const [topic, setTopic] = useState<string>('Explainable AI');
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [question, setQuestion] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [selectedPerspective, setSelectedPerspective] = useState('traditional');

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

          <SummaryPoints summaryPoints={newsData.summaryPoints} />
          <KeyQuestions keyQuestions={newsData.keyQuestions} />
          <SourceList sources={newsData.sources} />

          {/* Chat Section */}
          <div className="mb-6">
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
          </div>

          {/* Chat View */}
          <ChatView topic={topic} context={{
            headline: newsData.headline,
            summaryPoints: newsData.summaryPoints,
            sources: newsData.sources.map(s => ({
              outlet: s.outlet,
              headline: s.headline,
              url: s.url
            }))
          }} />
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
