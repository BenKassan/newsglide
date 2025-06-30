
import { supabase } from "@/integrations/supabase/client";

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

function isMessageOutput(item: any): item is { type: 'message'; content: Array<{ text: string }> } {
  return item && item.type === 'message' && Array.isArray(item.content);
}

// Simplified JSON parser for faster client-side processing
function fastJsonParse(rawText: string): any {
  console.log('Fast parsing JSON, length:', rawText.length);
  
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/```(?:json)?\s*/gi, '').replace(/```$/g, '');
  
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }
  
  try {
    const parsed = JSON.parse(cleaned);
    console.log('Fast JSON parse successful');
    return parsed;
  } catch (error) {
    // Quick repair
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    const parsed = JSON.parse(cleaned);
    console.log('JSON repair successful');
    return parsed;
  }
}

export async function synthesizeNews(request: SynthesisRequest): Promise<NewsData> {
  console.log(`Fast synthesis for topic: ${request.topic}`);
  
  try {
    // Single optimized call with shorter timeout
    const { data, error } = await supabase.functions.invoke('news-synthesis', {
      body: {
        topic: request.topic,
        targetOutlets: request.targetOutlets,
        freshnessHorizonHours: request.freshnessHorizonHours || 48
      }
    });

    if (error) {
      console.error('Synthesis error:', error);
      
      if (error.message?.includes('Edge Function returned a non-2xx status code')) {
        throw new Error('Service temporarily unavailable. Please try again.');
      }
      
      throw new Error(error.message || 'Failed to call news synthesis function');
    }

    if (!data) {
      throw new Error('No data returned from synthesis function');
    }

    if (data.error) {
      console.error('Function returned error:', data);
      
      switch (data.code) {
        case 'NO_SOURCES':
          throw new Error('No current news articles found for this topic. Try different search terms.');
        case 'TIMEOUT':
          throw new Error('Analysis took too long. Please try a simpler topic.');
        case 'OPENAI':
          throw new Error('Analysis service temporarily unavailable.');
        default:
          throw new Error(data.message || 'Analysis failed. Please try again.');
      }
    }

    console.log('Synthesis response received');

    // Extract response using fast parsing
    let outputText = '';
    
    if (data.output && Array.isArray(data.output)) {
      const messageOutput = data.output.find(isMessageOutput);
      
      if (messageOutput && messageOutput.content && messageOutput.content[0] && messageOutput.content[0].text) {
        outputText = messageOutput.content[0].text;
      }
    }
    
    if (!outputText && data.output_text) {
      outputText = data.output_text;
    }

    if (!outputText) {
      console.error('No output text found');
      throw new Error('No output text in response');
    }

    console.log('Processing output, length:', outputText.length);

    // Use fast JSON parser
    let newsData: NewsData;
    try {
      newsData = fastJsonParse(outputText);
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      throw new Error(`Failed to parse news data: ${parseError.message}`);
    }

    // Quick validation
    if (!newsData.sources || !Array.isArray(newsData.sources) || newsData.sources.length < 2) {
      throw new Error('Insufficient current news sources found. Try a different topic.');
    }

    const validSources = newsData.sources.filter(source => 
      source.url && 
      source.url.startsWith('http') &&
      source.outlet && 
      source.headline
    );

    if (validSources.length < 2) {
      throw new Error('No reliable current news sources found. Try rephrasing your search.');
    }

    // Fast validation and cleanup
    const validated: NewsData = {
      topic: newsData.topic || request.topic,
      headline: (newsData.headline || `Current News: ${request.topic}`).substring(0, 100),
      generatedAtUTC: newsData.generatedAtUTC || new Date().toISOString(),
      confidenceLevel: newsData.confidenceLevel || 'Medium',
      topicHottness: newsData.topicHottness || 'Medium',
      summaryPoints: Array.isArray(newsData.summaryPoints) 
        ? newsData.summaryPoints.slice(0, 4).map(p => String(p).substring(0, 120))
        : ['Analysis based on current news sources'],
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
        ? newsData.disagreements.slice(0, 2)
        : [],
      article: {
        base: newsData.article?.base || 'Analysis based on current news sources.',
        eli5: newsData.article?.eli5 || 'Simple explanation based on news.',
        phd: newsData.article?.phd || 'Academic analysis based on news sources.'
      },
      keyQuestions: Array.isArray(newsData.keyQuestions) 
        ? newsData.keyQuestions.slice(0, 4)
        : ['What are the key developments?'],
      sources: validSources.slice(0, 6).map((s, i) => ({
        id: s.id || `source_${i + 1}`,
        outlet: s.outlet || 'Unknown',
        type: s.type || 'Online Media',
        url: s.url,
        headline: String(s.headline || 'No headline').substring(0, 100),
        publishedAt: s.publishedAt || new Date().toISOString(),
        analysisNote: String(s.analysisNote || 'Current news source').substring(0, 120)
      })),
      missingSources: Array.isArray(newsData.missingSources) 
        ? newsData.missingSources 
        : []
    };

    console.log(`Fast synthesis complete with ${validated.sources.length} sources`);
    return validated;

  } catch (error) {
    console.error('Synthesis failed:', error);
    throw error;
  }
}

// Optimized Q&A function
export async function askQuestion(request: QuestionRequest): Promise<string> {
  try {
    console.log(`Fast Q&A for: ${request.question}`);
    
    const { data, error } = await supabase.functions.invoke('news-qa', {
      body: request
    });

    if (error) {
      console.error('Q&A error:', error);
      throw new Error(error.message || 'Failed to get answer');
    }

    if (!data || data.error) {
      throw new Error(data?.message || 'Failed to process question');
    }

    if (data.answer) {
      return data.answer;
    }

    if (data.output && Array.isArray(data.output)) {
      const messageOutput = data.output.find(isMessageOutput);
      if (messageOutput?.content?.[0]?.text) {
        return messageOutput.content[0].text;
      }
    }

    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Question error:', error);
    throw error;
  }
}

// Background TTS generation (non-blocking)
export async function generateBackgroundTTS(text: string, voiceId: string): Promise<void> {
  try {
    // This runs in background and doesn't block the main flow
    console.log('Starting background TTS generation...');
    
    const { data, error } = await supabase.functions.invoke('text-to-speech', {
      body: { text: text.substring(0, 3000) } // Limit text for faster generation
    });

    if (error) {
      console.warn('Background TTS failed:', error);
      return;
    }

    console.log('Background TTS completed');
  } catch (error) {
    console.warn('Background TTS error:', error);
    // Don't throw - this is background processing
  }
}
