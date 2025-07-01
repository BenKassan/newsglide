import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Globe, ExternalLink, BrainCircuit } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"

// Define a type for the news data structure
interface NewsData {
  topic: string;
  headline: string;
  generatedAtUTC: string;
  confidenceLevel: string;
  topicHottness: string;
  summaryPoints: string[];
  sourceAnalysis: {
    narrativeConsistency: { score: number; label: string };
    publicInterest: { score: number; label: string };
  };
  disagreements: string[];
  article: {
    base: string;
    eli5: string;
    phd: string | null;
  };
  keyQuestions: string[];
  sources: {
    id: string;
    outlet: string;
    type: string;
    url: string;
    headline: string;
    publishedAt: string;
    analysisNote: string;
  }[];
  missingSources: string[];
}

function getSourceBias(outlet: string) {
  const lowerOutlet = outlet.toLowerCase();

  if (lowerOutlet.includes('fox') || lowerOutlet.includes('breitbart')) {
    return { lean: 'Right', color: 'red' };
  } else if (lowerOutlet.includes('cnn') || lowerOutlet.includes('msnbc')) {
    return { lean: 'Left', color: 'blue' };
  } else {
    return { lean: 'Neutral', color: 'gray' };
  }
}

export default function IndexPage() {
  const [topic, setTopic] = useState('');
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetOutlets, setTargetOutlets] = useState<string[]>([]);
  const [freshnessHorizonHours, setFreshnessHorizonHours] = useState(24);
  const [includePhdAnalysis, setIncludePhdAnalysis] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast()

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setNewsData(null);
    setProgress(30);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic, targetOutlets, freshnessHorizonHours, includePhdAnalysis }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to analyze topic');
        toast({
          title: "Uh oh! Something went wrong.",
          description: errorData.message || 'Failed to analyze topic',
          action: <ToastAction altText="Try again">Try again</ToastAction>,
        })
        setProgress(0);
        return;
      }

      const data = await response.json();
      console.log('Full API Response:', data);

      if (data.output && data.output.length > 0 && data.output[0].content && data.output[0].content.length > 0) {
        try {
          const parsedNewsData = JSON.parse(data.output[0].content[0].text);
          setNewsData(parsedNewsData);
          setProgress(100);
        } catch (parseError) {
          console.error('Failed to parse news data:', parseError);
          setError('Failed to parse the analysis. Please check the format.');
          setProgress(0);
        }
      } else {
        setError('No analysis received. Please try again.');
        setProgress(0);
      }
    } catch (e: any) {
      console.error('Analysis error:', e);
      setError(e.message || 'Failed to analyze topic');
      toast({
        title: "Uh oh! Something went wrong.",
        description: e.message || 'Failed to analyze topic',
        action: <ToastAction altText="Try again">Try again</ToastAction>,
      })
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Real News Analyzer</h1>

      {/* Input Section */}
      <div className="mb-6 flex space-x-4">
        <Input
          type="text"
          placeholder="Enter a topic to analyze (e.g., OpenAI)"
          value={topic}
          onChange={handleTopicChange}
          className="flex-grow"
        />
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? <><BrainCircuit className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : 'Analyze Topic'}
        </Button>
      </div>

      {/* Options Section */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Advanced Options</CardTitle>
            <CardDescription>Customize your analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phd-analysis">Include PhD-level Analysis</Label>
              <Switch id="phd-analysis" checked={includePhdAnalysis} onCheckedChange={(checked) => setIncludePhdAnalysis(checked)} />
              <p className="text-sm text-muted-foreground">Enable in-depth academic analysis (slows processing)</p>
            </div>
            <div>
              <Label>Freshness Horizon (Hours)</Label>
              <div className="flex items-center space-x-2">
                <Slider
                  defaultValue={[freshnessHorizonHours]}
                  max={72}
                  step={1}
                  onValueChange={(value) => setFreshnessHorizonHours(value[0])}
                  aria-label="Freshness Horizon"
                />
                <Input
                  type="number"
                  value={freshnessHorizonHours.toString()}
                  className="w-16"
                  onChange={(e) => setFreshnessHorizonHours(Number(e.target.value))}
                />
              </div>
              <p className="text-sm text-muted-foreground">Limit analysis to articles published within this time frame</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Section */}
      {loading && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">Analyzing topic...</p>
          <Progress value={progress} />
        </div>
      )}

      {/* Error Section */}
      {error && (
        <div className="mb-6">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* Display Section */}
      {newsData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary Section */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BrainCircuit className="h-4 w-4" />
                {newsData.headline}
              </CardTitle>
              <CardDescription>Generated: {new Date(newsData.generatedAtUTC).toLocaleString()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Badge>Confidence: {newsData.confidenceLevel}</Badge>
                <Badge>Hotness: {newsData.topicHottness}</Badge>
              </div>
              <ul className="list-disc pl-4 space-y-1">
                {newsData.summaryPoints.map((point, index) => (
                  <li key={index} className="text-sm">{point}</li>
                ))}
              </ul>
              <p className="text-sm text-gray-500">Narrative Consistency: {newsData.sourceAnalysis.narrativeConsistency.label} ({newsData.sourceAnalysis.narrativeConsistency.score})</p>
              <p className="text-sm text-gray-500">Public Interest: {newsData.sourceAnalysis.publicInterest.label} ({newsData.sourceAnalysis.publicInterest.score})</p>
            </CardContent>
          </Card>

          {/* Article Section */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Base Article
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {newsData.article.base.split('\n\n').map((paragraph, index) => (
                <p key={index} className="text-sm">{paragraph}</p>
              ))}
            </CardContent>
          </Card>

          {/* Sources Section */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Sources ({newsData.sources.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {newsData.sources.map((source, index) => {
                const bias = getSourceBias(source.outlet);
                return (
                  <div key={source.id} className="border rounded-lg p-4 bg-white/50 hover:bg-white/70 transition-all duration-200">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-blue-600">{source.outlet}</h4>
                      <div className="flex gap-2">
                        <Badge variant="outline">{source.type}</Badge>
                        <Badge 
                          variant="outline" 
                          className={`
                            ${bias.color === 'blue' ? 'text-blue-600 border-blue-300' : ''}
                            ${bias.color === 'red' ? 'text-red-600 border-red-300' : ''}
                            ${bias.color === 'gray' ? 'text-gray-600 border-gray-300' : ''}
                          `}
                        >
                          {bias.lean}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      Published: {new Date(source.publishedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                    <p className="text-sm text-gray-700 mb-3">{source.headline}</p>
                    <a 
                      href={source.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                    >
                      Read original <ExternalLink className="h-3 w-3" />
                    </a>
                    <p className="text-xs text-gray-400 mt-2">[^{index + 1}] {source.analysisNote}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {newsData && newsData.article.phd && (
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm mt-6">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4" />
              PhD-Level Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {newsData.article.phd.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-sm">{paragraph}</p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
