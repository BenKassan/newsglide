
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

export interface QuestionRequest {
  question: string;
  topic: string;
  context: {
    headline: string;
    summaryPoints: string[];
    sources: Array<{
      outlet: string;
      headline: string;
      url: string;
    }>;
    previousMessages?: Array<{role: 'user' | 'assistant', content: string}>;
  };
}
