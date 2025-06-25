
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Search, AlertTriangle, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface NewsSource {
  id: string;
  outlet: string;
  url: string;
  headline: string;
  publishedAt: string;
}

interface Disagreement {
  pointOfContention: string;
  details: string;
}

interface NewsArticle {
  base: string;
  eli5: string;
  middleSchool: string;
  highSchool: string;
  undergrad: string;
  phd: string;
}

interface NewsData {
  topic: string;
  headline: string;
  generatedAtUTC: string;
  summaryPoints: string[];
  disagreements: Disagreement[];
  article: NewsArticle;
  sources: NewsSource[];
  missingSources: string[];
}

const READING_LEVELS = [
  { key: 'eli5', label: 'ELI5', description: 'Explain Like I\'m 5' },
  { key: 'middleSchool', label: 'Middle School', description: 'Age 11-14' },
  { key: 'highSchool', label: 'High School', description: 'Age 15-18' },
  { key: 'undergrad', label: 'Undergraduate', description: 'College Level' },
  { key: 'phd', label: 'PhD', description: 'Expert/Academic' }
];

const Index = () => {
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [readingLevel, setReadingLevel] = useState(0);

  // Mock data for demonstration
  const handleSynthesize = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic to synthesize");
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const mockData: NewsData = {
        topic,
        headline: `Breaking: ${topic} - Latest Developments`,
        generatedAtUTC: new Date().toISOString(),
        summaryPoints: [
          "Major developments reported across multiple news outlets",
          "Key stakeholders have provided official statements",
          "Timeline of events spans the last 48 hours",
          "Ongoing investigation continues with new findings"
        ],
        disagreements: [
          {
            pointOfContention: "Number of people affected",
            details: "CNN reports 10,000 people affected, while Reuters estimates 'nearly 15,000'"
          }
        ],
        article: {
          base: `Recent developments regarding ${topic} have emerged from multiple credible news sources [S1, S2]. The situation began approximately 48 hours ago when initial reports surfaced [S1]. Key officials have since provided statements addressing the ongoing circumstances [S2, S3]. The scope of impact remains under investigation, with estimates varying between sources [S1, S3]. Authorities continue to monitor the situation and have promised regular updates as more information becomes available [S2].`,
          eli5: `Something important happened with ${topic}. News reporters found out about it two days ago. Important people are talking about it and trying to figure out what to do. They're still learning more about what happened and will tell us when they know more.`,
          middleSchool: `There's been some big news about ${topic} in the last two days. Several news companies are reporting on what happened. Government officials and other important people are making statements about the situation. They're still investigating to understand everything that occurred and how many people it affects.`,
          highSchool: `Recent events surrounding ${topic} have been reported by major news outlets over the past 48 hours [S1, S2]. Officials have issued statements addressing the developing situation [S2, S3]. The full scope and impact are still being assessed, with some discrepancies in reported figures [S1, S3]. Authorities have committed to providing regular updates as their investigation progresses [S2].`,
          undergrad: `Multiple reputable news sources have reported on significant developments related to ${topic} within the last 48-hour period [S1, S2]. Government officials and relevant stakeholders have issued public statements addressing the evolving circumstances [S2, S3]. The magnitude of impact remains under active investigation, with notable variations in statistical reporting between sources [S1, S3]. Regulatory authorities have established protocols for ongoing monitoring and public communication [S2].`,
          phd: `Contemporary reporting from established journalistic institutions indicates significant developments pertaining to ${topic} within a 48-hour temporal framework [S1, S2]. Institutional stakeholders and governmental entities have provided official commentary regarding the evolving situational parameters [S2, S3]. Quantitative assessments of impact magnitude demonstrate methodological variance across reporting entities, suggesting potential discrepancies in data collection or analysis protocols [S1, S3]. Regulatory oversight mechanisms have been established to ensure systematic monitoring and transparent public communication processes [S2].`
        },
        sources: [
          { id: "S1", outlet: "CNN", url: "https://cnn.com/example", headline: `${topic}: Breaking News Alert`, publishedAt: "2024-06-24T15:30:00Z" },
          { id: "S2", outlet: "Reuters", url: "https://reuters.com/example", headline: `Officials respond to ${topic} situation`, publishedAt: "2024-06-24T16:45:00Z" },
          { id: "S3", outlet: "BBC", url: "https://bbc.com/example", headline: `${topic}: What we know so far`, publishedAt: "2024-06-25T08:15:00Z" }
        ],
        missingSources: []
      };
      
      setNewsData(mockData);
      setIsLoading(false);
      toast.success("News synthesis complete!");
    }, 2000);
  };

  const getCurrentArticle = () => {
    if (!newsData) return "";
    const levelKey = READING_LEVELS[readingLevel].key as keyof NewsArticle;
    return newsData.article[levelKey];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">NewsSynth</h1>
            <p className="text-lg text-gray-600">AI-powered news synthesis across reading levels</p>
          </div>
          
          {/* Search Input */}
          <div className="max-w-2xl mx-auto flex gap-3">
            <Input
              placeholder="Enter a news topic to synthesize..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSynthesize()}
              className="flex-1"
            />
            <Button onClick={handleSynthesize} disabled={isLoading} className="px-6">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Synthesizing...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Synthesize
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {newsData && (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Article */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">{newsData.headline}</CardTitle>
                      <div className="flex items-center text-sm text-gray-500 mb-4">
                        <Clock className="h-4 w-4 mr-1" />
                        Generated {new Date(newsData.generatedAtUTC).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Reading Level Slider */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Reading Level:</span>
                      <Badge variant="outline" className="text-xs">
                        {READING_LEVELS[readingLevel].label}
                      </Badge>
                    </div>
                    <Slider
                      value={[readingLevel]}
                      onValueChange={(value) => setReadingLevel(value[0])}
                      max={4}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      {READING_LEVELS.map((level, index) => (
                        <span key={level.key} className={index === readingLevel ? "font-medium text-gray-900" : ""}>
                          {level.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-lg leading-relaxed whitespace-pre-line">
                      {getCurrentArticle()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Points */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Key Takeaways</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {newsData.summaryPoints.map((point, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Source Disagreements */}
              {newsData.disagreements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                      Source Disagreements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {newsData.disagreements.map((disagreement, index) => (
                      <div key={index} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="font-medium text-amber-900 mb-1">
                          {disagreement.pointOfContention}
                        </div>
                        <div className="text-sm text-amber-700">
                          {disagreement.details}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Sources */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {newsData.sources.map((source) => (
                    <div key={source.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{source.outlet}</div>
                        <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {source.headline}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(source.publishedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs ml-2">
                        {source.id}
                      </Badge>
                    </div>
                  ))}
                  
                  {newsData.missingSources.length > 0 && (
                    <>
                      <Separator />
                      <div className="text-sm text-gray-600">
                        <div className="font-medium mb-2">Unavailable Sources:</div>
                        {newsData.missingSources.map((source, index) => (
                          <div key={index} className="text-gray-500">• {source}</div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!newsData && !isLoading && (
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-lg p-12 shadow-sm border border-gray-200">
            <div className="text-6xl mb-6">📰</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Ready to Synthesize News
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Enter any news topic above to get a comprehensive, multi-level analysis. 
              Our AI will gather information from trusted sources and present it at different reading levels, 
              from simple explanations to academic depth.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
