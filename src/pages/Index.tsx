import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, TrendingUp, Shield, Clock, Brain, Star, Users, Zap, Flame, CheckCircle } from 'lucide-react';
import OpenAI from 'openai';
import { OpenAIResponse, isMessageOutput } from '@/types/openai';
import { ApiKeyManager } from '@/components/ApiKeyManager';
import { ApiKeyRequired } from '@/components/ApiKeyRequired';
import { useApiKey } from '@/hooks/useApiKey';

export interface TargetOutlet {
  name: string;
  type: 'News Agency' | 'National Newspaper' | 'Broadcast Media' | 'Online Media';
}

export interface SynthesisRequest {
  topic: string;
  targetOutlets: TargetOutlet[];
  freshnessHorizonHours?: number;
  targetWordCount?: number;
}

export interface NewsSource {
  id: string;
  outlet: string;
  type: string;
  url: string;
  headline: string;
  publishedAt: string;
  analysisNote: string;
}

export interface Disagreement {
  pointOfContention: string;
  details: string;
  likelyReason: string;
}

export interface NewsArticle {
  base: string;
  eli5: string;
  middleSchool: string;
  highSchool: string;
  undergrad: string;
  phd: string;
}

export interface SourceAnalysis {
  narrativeConsistency: {
    score: number;
    label: string;
  };
  publicInterest: {
    score: number;
    label: string;
  };
}

export interface NewsData {
  topic: string;
  headline: string;
  generatedAtUTC: string;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  topicHottness: 'High' | 'Medium' | 'Low';
  summaryPoints: string[];
  sourceAnalysis: SourceAnalysis;
  disagreements: Disagreement[];
  article: NewsArticle;
  keyQuestions: string[];
  sources: NewsSource[];
  missingSources: string[];
}

function getOpenAIClient(): OpenAI {
  const apiKey = localStorage.getItem('openai_api_key');
  
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please configure your API key in settings.');
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });
}

export async function synthesizeNews(request: SynthesisRequest): Promise<NewsData> {
  const systemPrompt = `You are a news analyst. Today is ${new Date().toISOString().split('T')[0]}.

Use web search to find the 4 most recent articles about the topic from the last ${request.freshnessHorizonHours || 48} hours.

IMPORTANT: Carefully evaluate these metrics based on your analysis:

CONFIDENCE LEVEL:
- High: Multiple consistent sources, verified information, clear facts
- Medium: Some sources agree, some uncertainty or conflicting details
- Low: Limited sources, unverified claims, or highly speculative

TOPIC HOTNESS (Public Interest):
- High: Breaking news, trending topics, widespread social media discussion, major impact
- Medium: Regular news coverage, moderate public attention
- Low: Niche topics, limited coverage, specialized interest only

DISAGREEMENTS ANALYSIS:
Actively look for and identify disagreements between sources:
- Different reported facts, numbers, or outcomes
- Conflicting statements from officials or experts
- Varying interpretations of the same events
- Different emphasis or framing of the story
- Contradictory claims about causation or responsibility

Return ONLY valid JSON matching this exact structure. Keep all text fields concise to prevent truncation:

{
  "topic": "string",
  "headline": "string (max 100 chars)",
  "generatedAtUTC": "ISO timestamp",
  "confidenceLevel": "High|Medium|Low (based on source consistency and verification)",
  "topicHottness": "High|Medium|Low (based on current public interest and coverage volume)",
  "summaryPoints": ["3-4 bullet points, each max 150 chars"],
  "sourceAnalysis": {
    "narrativeConsistency": {"score": 1-10, "label": "Consistent|Mixed|Conflicting (based on how well sources agree)"},
    "publicInterest": {"score": 1-10, "label": "Viral|Popular|Moderate|Niche (based on engagement and coverage)"}
  },
  "disagreements": [
    {
      "pointOfContention": "specific disagreement topic (max 80 chars)",
      "details": "what sources disagree about specifically (max 200 chars)",
      "likelyReason": "why sources might disagree - bias, timing, access, etc (max 150 chars)"
    }
  ],
  "article": {
    "base": "200-300 words",
    "eli5": "50-75 words",
    "middleSchool": "75-100 words",
    "highSchool": "100-150 words",
    "undergrad": "400-600 words with detailed analysis, multiple perspectives, data interpretation, and contextual background",
    "phd": "800-1200 words with comprehensive analysis, methodological considerations, theoretical frameworks, interdisciplinary connections, historical context, expert opinions, statistical analysis, and potential research implications"
  },
  "keyQuestions": ["3 short questions"],
  "sources": [
    {
      "id": "s1",
      "outlet": "name",
      "type": "type",
      "url": "url",
      "headline": "headline (max 100 chars)",
      "publishedAt": "ISO timestamp",
      "analysisNote": "1 sentence about source reliability and perspective"
    }
  ],
  "missingSources": ["outlet names"]
}

CRITICAL: 
1. Base confidenceLevel on actual source verification and consistency
2. Base topicHottness on real-time search results and coverage volume
3. Provide honest assessment - not everything is "High"
4. ACTIVELY LOOK FOR DISAGREEMENTS - compare sources and identify where they conflict
5. For undergrad level: Include detailed analysis, multiple perspectives, data interpretation, and contextual background
6. For PhD level: Provide comprehensive analysis with methodological considerations, theoretical frameworks, interdisciplinary connections, historical context, expert opinions, statistical analysis, and research implications
7. Keep ALL other text concise. Return ONLY the JSON.`;

  const userPrompt = `${systemPrompt}

Find current news about: ${request.topic}
Include temporal terms like "today", "June 2025", "latest" in searches.
Target outlets: ${request.targetOutlets.slice(0, 4).map(o => o.name).join(', ')}

Analyze the search results to determine:
- How many reliable sources are covering this?
- How consistent is the information across sources?
- What's the current level of public discussion/interest?
- Are there any conflicting reports or uncertainty?`;

  try {
    const openai = getOpenAIClient();
    console.log('Synthesizing news for:', request.topic);
    
    const response = await openai.responses.create({
      model: 'gpt-4.1',
      input: userPrompt,
      tools: [{ 
        type: 'web_search_preview',
        search_context_size: 'medium'
      }],
      tool_choice: { type: 'web_search_preview' }
    }) as unknown as OpenAIResponse;

    console.log('Response received:', response);

    // Parse response with proper type checking
    let outputText = '';
    
    if (response.output && Array.isArray(response.output)) {
      // Find the message output item using type guard
      const messageOutput = response.output.find(isMessageOutput);
      
      if (messageOutput && messageOutput.content && messageOutput.content[0] && messageOutput.content[0].text) {
        outputText = messageOutput.content[0].text;
      }
    }
    
    // Fallback to legacy structure if new structure not found
    if (!outputText && response.output_text) {
      outputText = response.output_text;
    }

    if (!outputText) {
      console.error('No output text found in response:', response);
      throw new Error('No output text in response');
    }

    console.log('Output text length:', outputText.length);

    let newsData: NewsData;
    let parseSuccess = false;

    // Try direct JSON parse first
    try {
      newsData = JSON.parse(outputText.trim());
      parseSuccess = true;
      console.log('Direct JSON parse successful');
    } catch (e1) {
      console.log('Direct parse failed, trying cleanup strategies...');
      
      // Clean up common formatting issues
      try {
        let cleaned = outputText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        
        const jsonStart = cleaned.indexOf('{');
        const jsonEnd = cleaned.lastIndexOf('}');
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
          newsData = JSON.parse(cleaned);
          parseSuccess = true;
          console.log('Cleanup parse successful');
        }
      } catch (e2) {
        console.log('Cleanup parse failed, attempting repair...');
        
        // Try to repair truncated JSON
        try {
          let repaired = outputText.trim();
          
          repaired = repaired.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
          
          const jsonStart = repaired.indexOf('{');
          if (jsonStart >= 0) {
            repaired = repaired.slice(jsonStart);
            
            // Count braces and brackets to fix truncation
            let braceCount = 0;
            let bracketCount = 0;
            let inString = false;
            let escapeNext = false;
            
            for (let i = 0; i < repaired.length; i++) {
              const char = repaired[i];
              
              if (escapeNext) {
                escapeNext = false;
                continue;
              }
              
              if (char === '\\') {
                escapeNext = true;
                continue;
              }
              
              if (char === '"' && !escapeNext) {
                inString = !inString;
                continue;
              }
              
              if (!inString) {
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
                if (char === '[') bracketCount++;
                if (char === ']') bracketCount--;
              }
            }
            
            // Add missing closing brackets/braces
            while (bracketCount > 0) {
              repaired += ']';
              bracketCount--;
            }
            while (braceCount > 0) {
              repaired += '}';
              braceCount--;
            }
            
            // Remove trailing commas
            repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
            
            newsData = JSON.parse(repaired);
            parseSuccess = true;
            console.log('Successfully repaired truncated JSON');
          }
        } catch (e3) {
          console.error('All parsing strategies failed:', e3);
          throw new Error(`JSON parsing failed after all attempts: ${e1}`);
        }
      }
    }

    if (!parseSuccess || !newsData) {
      throw new Error('Failed to parse response into valid NewsData structure');
    }

    // Validate and clean the data
    const validated: NewsData = {
      topic: newsData.topic || request.topic,
      headline: (newsData.headline || `News Update: ${request.topic}`).substring(0, 100),
      generatedAtUTC: newsData.generatedAtUTC || new Date().toISOString(),
      confidenceLevel: newsData.confidenceLevel || 'Medium',
      topicHottness: newsData.topicHottness || 'Medium',
      summaryPoints: Array.isArray(newsData.summaryPoints) 
        ? newsData.summaryPoints.slice(0, 5).map(p => p.substring(0, 150))
        : ['No summary available'],
      sourceAnalysis: {
        narrativeConsistency: {
          score: newsData.sourceAnalysis?.narrativeConsistency?.score || 5,
          label: newsData.sourceAnalysis?.narrativeConsistency?.label || 'Medium'
        },
        publicInterest: {
          score: newsData.sourceAnalysis?.publicInterest?.score || 5,
          label: newsData.sourceAnalysis?.publicInterest?.label || 'Medium'
        }
      },
      disagreements: Array.isArray(newsData.disagreements) 
        ? newsData.disagreements.slice(0, 3)
        : [],
      article: {
        base: newsData.article?.base || 'Article content unavailable.',
        eli5: newsData.article?.eli5 || 'Simple explanation unavailable.',
        middleSchool: newsData.article?.middleSchool || 'Explanation unavailable.',
        highSchool: newsData.article?.highSchool || 'Explanation unavailable.',
        undergrad: newsData.article?.undergrad || 'Analysis unavailable.',
        phd: newsData.article?.phd || 'Technical analysis unavailable.'
      },
      keyQuestions: Array.isArray(newsData.keyQuestions) 
        ? newsData.keyQuestions.slice(0, 5)
        : ['What are the latest developments?'],
      sources: Array.isArray(newsData.sources) 
        ? newsData.sources.slice(0, 4).map((s, i) => ({
            id: s.id || `source_${i + 1}`,
            outlet: s.outlet || 'Unknown',
            type: s.type || 'Unknown',
            url: s.url || '',
            headline: (s.headline || 'No headline').substring(0, 100),
            publishedAt: s.publishedAt || new Date().toISOString(),
            analysisNote: (s.analysisNote || 'No analysis').substring(0, 100)
          }))
        : [],
      missingSources: Array.isArray(newsData.missingSources) 
        ? newsData.missingSources 
        : []
    };

    console.log(`Successfully synthesized news with ${validated.sources.length} sources`);
    return validated;

  } catch (error) {
    console.error('Synthesis error:', error);
    
    return {
      topic: request.topic,
      headline: `Unable to fetch current news for "${request.topic}"`,
      generatedAtUTC: new Date().toISOString(),
      confidenceLevel: 'Low',
      topicHottness: 'Low',
      summaryPoints: [
        'Failed to retrieve news articles',
        error instanceof Error ? error.message : 'Unknown error',
        'Please try again or check your API key configuration'
      ],
      sourceAnalysis: {
        narrativeConsistency: { score: 0, label: 'Error' },
        publicInterest: { score: 0, label: 'Error' }
      },
      disagreements: [],
      article: {
        base: 'Unable to generate article due to error.',
        eli5: 'Something went wrong.',
        middleSchool: 'An error occurred.',
        highSchool: 'The system encountered an error.',
        undergrad: 'System error during processing.',
        phd: 'Critical system failure.'
      },
      keyQuestions: [
        'Is the API key valid?',
        'Is the topic too complex?',
        'Should we retry with simpler parameters?'
      ],
      sources: [],
      missingSources: request.targetOutlets.map(o => o.name)
    };
  }
}

export async function testWithSimpleTopic(): Promise<void> {
  const test: SynthesisRequest = {
    topic: 'nvidia stock price today',
    targetOutlets: [
      { name: 'Reuters', type: 'News Agency' },
      { name: 'Bloomberg', type: 'Online Media' }
    ],
    freshnessHorizonHours: 24,
    targetWordCount: 500
  };

  try {
    console.log('Testing with:', test.topic);
    const result = await synthesizeNews(test);
    console.log('Success! Sources found:', result.sources.length);
    console.log('Headlines:', result.sources.map(s => s.headline));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

const Index = () => {
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();
  const { hasValidKey, isChecking, onKeyValidated } = useApiKey();

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

    if (!hasValidKey) {
      toast({
        title: "API Key Required",
        description: "Please configure your OpenAI API key in settings first.",
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
      
      let errorMessage = 'Failed to synthesize news';
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage = 'API key issue: Please check your OpenAI API key configuration';
        } else if (error.message.includes('insufficient')) {
          errorMessage = 'Insufficient API credits. Please check your OpenAI account balance';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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

  // Show loading state while checking for API key
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show API key setup if no valid key
  if (!hasValidKey) {
    return <ApiKeyRequired onKeyValidated={onKeyValidated} />;
  }

  if (showResults && newsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto p-6 max-w-6xl">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <Button onClick={handleBackToHome} variant="ghost">
                ← Back to Search
              </Button>
              <ApiKeyManager onKeyValidated={onKeyValidated} />
            </div>
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
            
            <h2 className="text-3xl font-semibold text-gray-800 mb-4">
              Navigate News with Clarity
            </h2>
            
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              Understand bias, spot sensationalism, and get the full picture with AI-powered news analysis
            </p>

            {/* Enhanced Search Bar with API Key Settings */}
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
                    disabled={loading || !hasValidKey}
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
              
              {/* API Key Manager */}
              <div className="flex justify-center mt-4">
                <ApiKeyManager onKeyValidated={onKeyValidated} />
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
