import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Loader2, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play,
  Pause,
  Heart,
  HeartOff,
  Send,
  BookmarkIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AuthModal } from "@/components/auth/AuthModal";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/contexts/AuthContext";
import { MorganFreemanPlayer } from "@/components/MorganFreemanPlayer";
import { supabase } from "@/integrations/supabase/client";

export interface NewsData {
  headline: string;
  summary: string;
  keyPoints: string[];
  sources: string[];
  disagreements: string[];
  topic: string;
  simpleSummary: string;
  verySimpleSummary: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [isArticleSaved, setIsArticleSaved] = useState(false);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const topicParam = searchParams.get("topic");
    if (topicParam) {
      setTopic(topicParam);
    }
  }, [searchParams]);

  const startListening = () => {
    if ("webkitSpeechRecognition" in window) {
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognition.start();

      setIsListening(true);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setTopic(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error("Recognition error:", event.error);
        toast({
          title: "Error",
          description: "Could not start voice recognition. Please try again.",
          variant: "destructive",
        });
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    } else {
      toast({
        title: "Unsupported Browser",
        description: "Your browser does not support voice recognition.",
        variant: "destructive",
      });
    }
  };

  const handleTTS = async (text: string) => {
    if (!text) {
      toast({
        title: "No text to speak",
        description: "Please provide text to convert to speech.",
        variant: "destructive",
      });
      return;
    }

    setIsTTSLoading(true);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Failed to convert text to speech");
      }

      const result = await response.json();
      const audio = new Audio(result.audioUrl);

      audio.onloadedmetadata = () => {
        setIsTTSLoading(false);
        setCurrentAudio(audio);
        setIsPlaying(true);
        audio.play();
      };

      audio.onended = () => {
        setIsPlaying(false);
      };

      audio.onerror = (error) => {
        console.error("Audio error:", error);
        toast({
          title: "Audio Error",
          description: "Failed to play audio. Please try again.",
          variant: "destructive",
        });
        setIsTTSLoading(false);
        setIsPlaying(false);
      };
    } catch (error) {
      console.error("TTS error:", error);
      toast({
        title: "TTS Error",
        description: "Failed to convert text to speech. Please try again.",
        variant: "destructive",
      });
      setIsTTSLoading(false);
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (currentAudio) {
      if (isPlaying) {
        currentAudio.pause();
        setIsPlaying(false);
      } else {
        currentAudio.play();
        setIsPlaying(true);
      }
    }
  };

  const stopAudio = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleChatSubmit = async (question: string) => {
    if (!question.trim()) return;

    setIsChatLoading(true);
    setCurrentQuestion("");

    const newChatMessage: ChatMessage = { role: "user", content: question };
    setChatMessages((prevMessages) => [...prevMessages, newChatMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...chatMessages, newChatMessage],
          newsData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get chat response");
      }

      const result = await response.json();
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: result.content,
      };
      setChatMessages((prevMessages) => [...prevMessages, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Chat Error",
        description: "Failed to get chat response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    const fetchTrendingTopics = async () => {
      try {
        const response = await fetch("/api/trending-topics");
        if (!response.ok) {
          throw new Error("Failed to fetch trending topics");
        }
        const data = await response.json();
        setTrendingTopics(data.topics);
      } catch (error) {
        console.error("Error fetching trending topics:", error);
      }
    };

    fetchTrendingTopics();
  }, []);

  // Add function to check if article is saved
  const checkIfSaved = async (topicToCheck: string) => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('saved_articles')
        .select('id')
        .eq('user_id', user.id)
        .eq('topic', topicToCheck)
        .single();
        
      setIsArticleSaved(!!data);
    } catch (error) {
      // Expected error if not found, ignore
      setIsArticleSaved(false);
    }
  };

  // Add save function
  const handleSaveArticle = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save articles",
        variant: "destructive"
      });
      return;
    }

    if (!newsData) return;

    try {
      // Check if already saved
      const { data: existing } = await supabase
        .from('saved_articles')
        .select('id')
        .eq('user_id', user.id)
        .eq('topic', newsData.topic)
        .single();

      if (existing) {
        toast({
          title: "Already saved",
          description: "This article is already in your library"
        });
        return;
      }

      // Save the article
      const { error } = await supabase
        .from('saved_articles')
        .insert({
          user_id: user.id,
          headline: newsData.headline,
          topic: newsData.topic,
          article_data: newsData,
          tags: [],
          notes: ''
        });

      if (error) throw error;

      setIsArticleSaved(true);
      toast({
        title: "Article saved!",
        description: "Added to your saved articles"
      });

    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: "Failed to save article",
        variant: "destructive"
      });
    }
  };

  // Check if saved when results load
  useEffect(() => {
    if (newsData && user) {
      checkIfSaved(newsData.topic);
    }
  }, [newsData, user]);

  const handleSynthesize = async () => {
    if (!topic.trim()) {
      toast({
        title: "Please enter a topic",
        description: "Enter a topic to generate news analysis",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setChatMessages([]);

    try {
      const response = await fetch("/api/news-synthesis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate news synthesis");
      }

      const result: NewsData = await response.json();
      setNewsData(result);

      // Auto-save to search history
      if (user) {
        supabase
          .from('search_history')
          .insert({
            user_id: user.id,
            topic: topic,
            news_data: result
          })
          .then(() => console.log('Search saved to history'))
          .catch(console.error);
      }

      toast({
        title: "Analysis Complete!",
        description: "Your news synthesis is ready.",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to generate news synthesis. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/lovable-uploads/4aa0d947-eb92-4247-965f-85f5d500d005.png" 
              alt="NewsGlide Logo" 
              className="h-8 w-8"
            />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              NewsGlide
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <UserMenu />
            ) : (
              <AuthModal />
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <section className="mb-8">
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Explore News with AI
          </h2>
          <p className="text-gray-700 mb-6">
            Enter a topic to get a synthesized news analysis.
          </p>
          <div className="flex items-center space-x-4">
            <div className="relative flex-grow">
              <Input
                type="text"
                placeholder="Enter a topic (e.g., Climate Change)"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="rounded-full py-3 px-6 w-full"
              />
              <Button
                onClick={startListening}
                variant="ghost"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full hover:bg-gray-100"
                disabled={isListening}
              >
                {isListening ? (
                  <Mic className="h-5 w-5 animate-pulse text-blue-500" />
                ) : (
                  <MicOff className="h-5 w-5 text-gray-500" />
                )}
              </Button>
            </div>
            <Button
              onClick={handleSynthesize}
              className="rounded-full py-3 px-6 font-bold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Analysis"
              )}
            </Button>
          </div>
        </section>

        {newsData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-3 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                        {newsData.headline}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Topic: {newsData.topic}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Generated now
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={handleSaveArticle}
                      variant={isArticleSaved ? "default" : "outline"}
                      size="sm"
                      disabled={isArticleSaved}
                      className="ml-4 shrink-0"
                    >
                      <BookmarkIcon className={`h-4 w-4 mr-1 ${isArticleSaved ? 'fill-current' : ''}`} />
                      {isArticleSaved ? 'Saved' : 'Save Article'}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent>
                  <Tabs defaultValue="summary" className="space-y-4">
                    <TabsList className="bg-transparent p-0">
                      <TabsTrigger value="summary" className="text-sm font-medium">
                        Summary
                      </TabsTrigger>
                      <TabsTrigger value="simple" className="text-sm font-medium">
                        Simple Summary
                      </TabsTrigger>
                      <TabsTrigger value="very-simple" className="text-sm font-medium">
                        Very Simple
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="summary" className="text-sm text-gray-700">
                      {newsData.summary}
                    </TabsContent>
                    <TabsContent value="simple" className="text-sm text-gray-700">
                      {newsData.simpleSummary}
                    </TabsContent>
                    <TabsContent value="very-simple" className="text-sm text-gray-700">
                      {newsData.verySimpleSummary}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Sources</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700">
                  <ul>
                    {newsData.sources.map((source, index) => (
                      <li key={index} className="mb-1">
                        <a
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {source}
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Key Points</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700">
                  <ul className="list-disc pl-5">
                    {newsData.keyPoints.map((point, index) => (
                      <li key={index} className="mb-2">
                        {point}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Disagreements</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-700">
                  {newsData.disagreements.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {newsData.disagreements.map((disagreement, index) => (
                        <li key={index} className="mb-2">
                          {disagreement}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "No major disagreements reported."
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Chat about {newsData.topic}</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px] flex flex-col">
                  <div className="flex-grow overflow-y-auto mb-4">
                    {chatMessages.map((message, index) => (
                      <div
                        key={index}
                        className={`mb-2 p-3 rounded-lg ${
                          message.role === "user"
                            ? "bg-blue-100 text-blue-800 ml-auto w-fit"
                            : "bg-gray-100 text-gray-800 mr-auto w-fit"
                        }`}
                      >
                        {message.content}
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="text-gray-500">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" />
                        Thinking...
                      </div>
                    )}
                  </div>
                  <div className="mt-auto">
                    <div className="flex items-center">
                      <Input
                        type="text"
                        placeholder="Ask a question..."
                        value={currentQuestion}
                        onChange={(e) => setCurrentQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleChatSubmit(currentQuestion);
                          }
                        }}
                        className="rounded-full py-2 px-4 flex-grow mr-2"
                      />
                      <Button
                        onClick={() => handleChatSubmit(currentQuestion)}
                        className="rounded-full py-2 px-4 font-bold"
                        disabled={isChatLoading}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Ask
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Text-to-Speech</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Textarea
                      placeholder="Enter text to convert to speech"
                      className="w-full rounded-md"
                      defaultValue={newsData.summary}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Button
                      onClick={() => handleTTS(newsData.summary)}
                      className="rounded-full py-3 px-6 font-bold"
                      disabled={isTTSLoading}
                    >
                      {isTTSLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Generate Audio"
                      )}
                    </Button>
                    {currentAudio && (
                      <Button
                        onClick={togglePlay}
                        className="rounded-full py-3 px-6 font-bold"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="mr-2 h-4 w-4" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Play
                          </>
                        )}
                      </Button>
                    )}
                    {currentAudio && (
                      <Button
                        onClick={stopAudio}
                        className="rounded-full py-3 px-6 font-bold"
                      >
                        Stop
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
