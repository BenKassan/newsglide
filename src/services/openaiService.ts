
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

function isMessageOutput(item: any): item is { type: 'message'; content: Array<{ text: string }> } {
  return item && item.type === 'message' && Array.isArray(item.content);
}

function safeJsonParse(rawText: string): any {
  console.log('Attempting to parse JSON, length:', rawText.length);
  
  // Strip markdown code blocks first
  let cleaned = rawText.trim();
  
  // Remove markdown code blocks (```json...``` or ```...```)
  cleaned = cleaned.replace(/```(?:json)?\s*/gi, '').replace(/```$/g, '');
  
  // Find the first { and last } to extract JSON
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }
  
  // First attempt: direct parse of cleaned text
  try {
    const parsed = JSON.parse(cleaned);
    console.log('JSON parse successful');
    return parsed;
  } catch (directError) {
    console.log('Direct parse failed:', directError.message);
  }

  // Second attempt: repair truncated JSON
  try {
    let repaired = cleaned;
    
    // Fix unterminated strings and close open structures
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;
    let lastValidPosition = 0;

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
      }
      
      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            lastValidPosition = i + 1;
          }
        } else if (char === ']') {
          bracketCount--;
        }
      }
    }

    // Use content up to last valid closing brace if found
    if (lastValidPosition > 0) {
      repaired = repaired.slice(0, lastValidPosition);
    } else {
      // Close any unterminated string
      if (inString) {
        repaired += '"';
      }
      
      // Close open brackets and braces
      while (bracketCount > 0) {
        repaired += ']';
        bracketCount--;
      }
      while (braceCount > 0) {
        repaired += '}';
        braceCount--;
      }
    }
    
    // Remove trailing commas before closing brackets/braces
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
    
    const parsed = JSON.parse(repaired);
    console.log('JSON repair successful');
    return parsed;
  } catch (repairError) {
    console.log('JSON repair failed:', repairError.message);
  }

  // If all attempts fail, throw detailed error
  throw new Error(`JSON parsing failed after all repair attempts. Preview: ${rawText.slice(0, 200)}...`);
}

export async function synthesizeNews(request: SynthesisRequest): Promise<NewsData> {
  try {
    console.log('Calling Supabase Edge Function for topic:', request.topic);
    
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('news-synthesis', {
      body: {
        topic: request.topic,
        targetOutlets: request.targetOutlets,
        freshnessHorizonHours: request.freshnessHorizonHours || 48
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      
      // Try to parse the error response if it's a FunctionsHttpError
      if (error.message?.includes('Edge Function returned a non-2xx status code')) {
        // The actual error details should be in the response body
        // Let's try to get more specific error info
        throw new Error('Service temporarily unavailable. Please try again in a few moments.');
      }
      
      throw new Error(error.message || 'Failed to call news synthesis function');
    }

    if (!data) {
      throw new Error('No data returned from news synthesis function');
    }

    // Handle structured error responses from the edge function
    if (data.error) {
      console.error('Edge function returned structured error:', data);
      
      // Handle specific error codes with user-friendly messages
      switch (data.code) {
        case 'NO_SOURCES':
        case 'INSUFFICIENT_SOURCES':
          throw new Error('No reliable sources found for this keyword. Try rephrasing or using a narrower topic.');
        
        case 'RATE_LIMIT':
          throw new Error('Rate limit reached. Please wait a moment and try again.');
        
        case 'OPENAI':
          throw new Error('Analysis service temporarily unavailable. Please try again in a few moments.');
        
        case 'PARSE_ERROR':
          throw new Error('Analysis failed due to response format issues. Please try again.');
        
        case 'CONFIG_ERROR':
          throw new Error('Service configuration error. Please contact support.');
        
        default:
          throw new Error(data.message || 'Analysis failed. Please try again.');
      }
    }

    console.log('Response received from Edge Function');

    // Parse response with improved error handling
    let outputText = '';
    
    if (data.output && Array.isArray(data.output)) {
      const messageOutput = data.output.find(isMessageOutput);
      
      if (messageOutput && messageOutput.content && messageOutput.content[0] && messageOutput.content[0].text) {
        outputText = messageOutput.content[0].text;
      }
    }
    
    // Fallback to legacy structure
    if (!outputText && data.output_text) {
      outputText = data.output_text;
    }

    if (!outputText) {
      console.error('No output text found in response:', data);
      throw new Error('No output text in response');
    }

    console.log('Output text length:', outputText.length);

    // Use the safe JSON parser
    let newsData: NewsData;
    try {
      newsData = safeJsonParse(outputText);
    } catch (parseError) {
      console.error('All JSON parsing strategies failed:', parseError);
      throw new Error(`Failed to parse news data: ${parseError.message}`);
    }

    // Strict validation - require real sources with URLs (minimum 3)
    if (!newsData.sources || !Array.isArray(newsData.sources) || newsData.sources.length < 3) {
      throw new Error('No reliable sources found for this keyword. Try rephrasing or using a narrower topic.');
    }

    // Validate that sources have proper URLs
    const validSources = newsData.sources.filter(source => 
      source.url && 
      (source.url.startsWith('http://') || source.url.startsWith('https://')) &&
      source.outlet && 
      source.headline
    );

    if (validSources.length < 3) {
      throw new Error('No reliable sources found for this keyword. Try rephrasing or using a narrower topic.');
    }

    // Validate and clean the data with stricter requirements
    const validated: NewsData = {
      topic: newsData.topic || request.topic,
      headline: (newsData.headline || `News Analysis: ${request.topic}`).substring(0, 100),
      generatedAtUTC: newsData.generatedAtUTC || new Date().toISOString(),
      confidenceLevel: newsData.confidenceLevel || 'Medium',
      topicHottness: newsData.topicHottness || 'Medium',
      summaryPoints: Array.isArray(newsData.summaryPoints) 
        ? newsData.summaryPoints.slice(0, 5).map(p => String(p).substring(0, 150))
        : ['Analysis based on available sources'],
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
        base: newsData.article?.base || 'Analysis unavailable - insufficient source data.',
        eli5: newsData.article?.eli5 || 'Simple explanation unavailable.',
        middleSchool: newsData.article?.middleSchool || 'Explanation unavailable.',
        highSchool: newsData.article?.highSchool || 'Explanation unavailable.',
        undergrad: newsData.article?.undergrad || 'Analysis unavailable.',
        phd: newsData.article?.phd || 'Technical analysis unavailable.'
      },
      keyQuestions: Array.isArray(newsData.keyQuestions) 
        ? newsData.keyQuestions.slice(0, 5)
        : ['What are the key developments?'],
      sources: validSources.slice(0, 6).map((s, i) => ({
        id: s.id || `source_${i + 1}`,
        outlet: s.outlet || 'Unknown',
        type: s.type || 'Unknown',
        url: s.url, // Keep original URL from AI
        headline: String(s.headline || 'No headline').substring(0, 100),
        publishedAt: s.publishedAt || new Date().toISOString(),
        analysisNote: String(s.analysisNote || 'Source analysis unavailable').substring(0, 150)
      })),
      missingSources: Array.isArray(newsData.missingSources) 
        ? newsData.missingSources 
        : []
    };

    console.log(`Successfully synthesized news with ${validated.sources.length} valid sources with URLs`);
    return validated;

  } catch (error) {
    console.error('Synthesis error:', error);
    throw error; // Re-throw the error so the UI can handle it properly
  }
}

export async function testCurrentNewsSynthesis(): Promise<void> {
  const testRequest: SynthesisRequest = {
    topic: 'artificial intelligence news today 2025',
    targetOutlets: [
      { name: 'Reuters', type: 'News Agency' },
      { name: 'CNN', type: 'Broadcast Media' },
      { name: 'TechCrunch', type: 'Online Media' },
      { name: 'The New York Times', type: 'National Newspaper' }
    ],
    freshnessHorizonHours: 48,
    targetWordCount: 1000
  };

  try {
    console.log('Testing synthesis with current news request:', testRequest);
    const result = await synthesizeNews(testRequest);
    console.log('Test successful!');
    console.log('Found sources:', result.sources.map(s => ({
      outlet: s.outlet,
      publishedAt: s.publishedAt,
      headline: s.headline.substring(0, 80) + '...'
    })));
    console.log('Topic hottness:', result.topicHottness);
    console.log('Summary points:', result.summaryPoints);
  } catch (error) {
    console.error('Test failed:', error);
  }
}
