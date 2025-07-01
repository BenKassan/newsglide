import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { NewsData } from '@/services/openaiService';
import { saveSearchToHistory } from '@/services/searchHistoryService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { ModeToggle } from '@/components/ModeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Newspaper } from 'lucide-react';
import MorganFreemanPlayer from '@/components/MorganFreemanPlayer';
import { useDebounce } from '@/hooks/useDebounce';
import { useRateLimit } from '@/hooks/useRateLimit';
import { withPerformanceLogging } from '@/utils/monitoring';

export default function Index() {
  const [topic, setTopic] = useState('');
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArticle, setShowArticle] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { checkUserRateLimit } = useRateLimit();
  const debouncedTopic = useDebounce(topic, 500);

  useEffect(() => {
    if (newsData) {
      setShowArticle(true);
    }
  }, [newsData]);

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      })
    } catch (error) {
      console.error("Sign out failed:", error);
      toast({
        title: "Sign out failed",
        description: "There was an error signing you out. Please try again.",
        variant: "destructive"
      })
    }
  };

  const handleSynthesize = async () => {
    if (!debouncedTopic.trim()) {
      toast({
        title: "Please enter a topic",
        description: "Enter a news topic you'd like to explore.",
        variant: "destructive"
      });
      return;
    }

    // Check rate limits first
    if (!await checkUserRateLimit()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await withPerformanceLogging(
        'news_synthesis_request',
        async () => {
          const { data, error } = await supabase.functions.invoke('news-synthesis', {
            body: { topic: debouncedTopic }
          });

          if (error) {
            throw new Error(error.message || 'Failed to generate news synthesis');
          }

          return data;
        },
        user?.id
      );

      setNewsData(result);
      setShowArticle(true);

      // Save to search history for authenticated users
      if (user) {
        await saveSearchToHistory(user.id, debouncedTopic, result);
      }

      toast({
        title: "News synthesis complete!",
        description: "Your personalized news summary is ready.",
      });

    } catch (error) {
      console.error('Synthesis failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast({
        title: "Synthesis failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Newspaper className="h-8 w-8" />
            NewsGlide
          </h1>

          {/* User Profile Section */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <div className="flex items-center gap-2 cursor-pointer">
                  <Avatar>
                    <AvatarImage src={`https://avatars.dicebear.com/api/open-peeps/${user.email}.svg`} />
                    <AvatarFallback>
                      {user.email ? user.email[0].toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-gray-700 font-semibold">{user.email}</span>
                  <MoreVertical className="h-4 w-4 text-gray-500" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/preferences')}>
                  Preferences
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/search-history')}>
                  Search History
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/profile')}>Sign In</Button>
              <Button onClick={() => navigate('/profile')}>Sign Up</Button>
            </div>
          )}
          <ModeToggle />
        </div>

        {/* Search Input */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <Input
            type="text"
            placeholder="Enter a topic to synthesize news"
            value={topic}
            onChange={handleTopicChange}
            className="border-gray-300 focus:ring-blue-500 focus:border-blue-500"
          />
          <Button
            onClick={handleSynthesize}
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {loading ? 'Synthesizing...' : 'Synthesize News'}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {/* News Article Display */}
        {showArticle && newsData ? (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">{newsData.headline}</CardTitle>
              <CardDescription>
                {newsData.summary}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MorganFreemanPlayer article={newsData} />
              <h3 className="text-xl font-semibold">Key Points:</h3>
              <ul className="list-disc list-inside">
                {newsData.keyPoints.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
              <h3 className="text-xl font-semibold">Analysis:</h3>
              <p>{newsData.analysis}</p>
              <h3 className="text-xl font-semibold">Real Articles:</h3>
              <ul className="space-y-2">
                {newsData.articles.map((article, index) => (
                  <li key={index} className="border p-4 rounded-md">
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      <h4 className="font-semibold">{article.title}</h4>
                    </a>
                    <p className="text-gray-600">{article.summary} - {article.source}</p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : loading ? (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold"><Skeleton className="h-8 w-3/4" /></CardTitle>
              <CardDescription><Skeleton className="h-4 w-1/2" /></CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" count={5} />
            </CardContent>
          </Card>
        ) : (
          <div className="text-center text-gray-700">
            <p>Enter a topic to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
