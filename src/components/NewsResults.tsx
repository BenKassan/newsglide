
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, CheckCircle, Brain, Flame, Globe, ExternalLink, MessageCircle } from 'lucide-react';
import { NewsData } from '@/services/openaiService';
import { VoicePlayer } from '@/components/VoicePlayer';
import { ChatSection } from '@/components/ChatSection';

interface NewsResultsProps {
  newsData: NewsData;
  onBackToHome: () => void;
  onQuestionClick: (question: string) => void;
}

export const NewsResults: React.FC<NewsResultsProps> = ({
  newsData,
  onBackToHome,
  onQuestionClick
}) => {
  const [selectedReadingLevel, setSelectedReadingLevel] = useState<'base' | 'eli5' | 'phd'>('base');
  
  const currentDate = new Date();
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const headlineWithDate = `${newsData.headline} (${monthYear})`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-6">
          <Button onClick={onBackToHome} variant="ghost" className="mb-4">
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

        {/* Analysis Complete Badge */}
        <div className="mb-6">
          <Card className="border-green-200 bg-green-50/80 backdrop-blur-sm">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 text-green-800">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Analysis complete</p>
                  <p className="text-green-700">
                    All sources were published within the last 48 hours
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 animate-fade-in">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {headlineWithDate}
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
                      <li key={i} className="text-sm flex items-start gap-2 group">
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                        <button
                          onClick={() => onQuestionClick(question)}
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

          {/* Reading Level Tabs */}
          <Tabs 
            defaultValue="base" 
            value={selectedReadingLevel} 
            onValueChange={(value) => setSelectedReadingLevel(value as 'base' | 'eli5' | 'phd')} 
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 bg-white/60 backdrop-blur-sm">
              <TabsTrigger value="base">📰 Essentials</TabsTrigger>
              <TabsTrigger value="eli5">🧒 ELI5</TabsTrigger>
              <TabsTrigger value="phd">🔬 PhD</TabsTrigger>
            </TabsList>
            {Object.entries(newsData.article).map(([level, content]) => (
              <TabsContent key={level} value={level} className="mt-4">
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardContent className="pt-6 max-w-4xl mx-auto">
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
            ))}
          </Tabs>

          {/* Voice Player Section */}
          <div className="mt-6 animate-fade-in">
            <VoicePlayer 
              text={newsData.article[selectedReadingLevel]} 
              articleType={selectedReadingLevel}
              topic={newsData.topic}
            />
          </div>

          {/* Chat Section */}
          <ChatSection newsData={newsData} onQuestionClick={onQuestionClick} />

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
    </div>
  );
};
