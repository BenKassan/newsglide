
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { synthesizeNews, askQuestion, SynthesisRequest, NewsData } from '@/services/openaiService';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { SearchBar } from '@/components/SearchBar';
import { ValuePropositionSection } from '@/components/ValuePropositionSection';
import { Footer } from '@/components/Footer';
import { NewsResults } from '@/components/NewsResults';

const Index = () => {
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'searching' | 'analyzing' | 'generating' | ''>('');
  const [fakeProgress, setFakeProgress] = useState(0);
  
  const { toast } = useToast();

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

  // Fake progress timer - purely visual
  useEffect(() => {
    if (!loading) {
      setFakeProgress(0);
      return;
    }

    let progress = 0;
    const timer = setInterval(() => {
      progress += 2; // Increase by 2% every 200ms
      if (progress >= 95) {
        clearInterval(timer);
        progress = 95; // Stop at 95%
      }
      setFakeProgress(progress);
    }, 200); // Update every 200ms = ~10 seconds to reach 95%

    return () => clearInterval(timer);
  }, [loading]);

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

    // Set the topic in the input field when using example topics
    if (searchTopic) {
      setTopic(searchTopic);
    }

    setLoading(true);
    setLoadingStage('searching');

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
        description: `Found and synthesized ${result.sources.length} real news articles about "${currentTopic}"`,
      });
    } catch (error) {
      console.error('Synthesis failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to find current news articles',
        variant: "destructive",
      });
    } finally {
      setFakeProgress(100); // Show 100% briefly
      setTimeout(() => setFakeProgress(0), 500); // Reset after half second
      setLoading(false);
      setLoadingStage('');
    }
  };

  const handleBackToHome = () => {
    setShowResults(false);
    setNewsData(null);
    setTopic('');
  };

  const handleQuestionClick = async (question: string) => {
    // This will be handled by the ChatSection component
    console.log('Question clicked:', question);
  };

  if (showResults && newsData) {
    return (
      <NewsResults 
        newsData={newsData}
        onBackToHome={handleBackToHome}
        onQuestionClick={handleQuestionClick}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <LoadingOverlay 
        loading={loading}
        topic={topic}
        loadingStage={loadingStage}
        fakeProgress={fakeProgress}
      />
      
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
              Glide through the noise. Our model does not serve an agenda — it serves you.
            </p>

            <SearchBar 
              topic={topic}
              setTopic={setTopic}
              onSearch={handleSynthesize}
              loading={loading}
            />
          </div>
        </div>
      </div>

      <ValuePropositionSection />
      <Footer />
    </div>
  );
};

export default Index;
