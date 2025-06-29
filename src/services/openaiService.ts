
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
  
  // First attempt: direct parse
  try {
    const parsed = JSON.parse(rawText.trim());
    console.log('Direct JSON parse successful');
    return parsed;
  } catch (directError) {
    console.log('Direct parse failed:', directError.message);
  }

  // Second attempt: clean up common formatting issues
  try {
    let cleaned = rawText.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');
    
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(cleaned);
      console.log('Cleanup parse successful');
      return parsed;
    }
  } catch (cleanupError) {
    console.log('Cleanup parse failed:', cleanupError.message);
  }

  // Third attempt: repair truncated JSON
  try {
    let repaired = rawText.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');
    
    const jsonStart = repaired.indexOf('{');
    if (jsonStart >= 0) {
      repaired = repaired.slice(jsonStart);
      
      // Fix unterminated strings by finding the last complete string
      const lines = repaired.split('\n');
      let validJson = '';
      let braceCount = 0;
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
          }
        }
      }

      // Try to use the content up to the last valid brace
      if (lastValidPosition > 0) {
        validJson = repaired.slice(0, lastValidPosition);
      } else {
        // If no valid end found, try to reconstruct
        validJson = repaired;
        
        // Count open braces/brackets and close them
        let openBraces = 0;
        let openBrackets = 0;
        inString = false;
        escapeNext = false;
        
        for (let i = 0; i < validJson.length; i++) {
          const char = validJson[i];
          
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
            if (char === '{') openBraces++;
            if (char === '}') openBraces--;
            if (char === '[') openBrackets++;
            if (char === ']') openBrackets--;
          }
        }
        
        // If we're still in a string, close it
        if (inString) {
          validJson += '"';
        }
        
        // Close any open brackets/braces
        while (openBrackets > 0) {
          validJson += ']';
          openBrackets--;
        }
        while (openBraces > 0) {
          validJson += '}';
          openBraces--;
        }
      }
      
      // Remove trailing commas before closing brackets/braces
      validJson = validJson.replace(/,(\s*[}\]])/g, '$1');
      
      const parsed = JSON.parse(validJson);
      console.log('JSON repair successful');
      return parsed;
    }
  } catch (repairError) {
    console.log('JSON repair failed:', repairError.message);
  }

  // If all attempts fail, throw the original error
  throw new Error(`JSON parsing failed after all repair attempts. Text preview: ${rawText.slice(0, 200)}...`);
}

export async function synthesizeNews(request: SynthesisRequest): Promise<NewsData> {
  try {
    console.log('Calling Supabase Edge Function for topic:', request.topic);
    
    // Call Supabase Edge Function with request to limit response size
    const { data, error } = await supabase.functions.invoke('news-synthesis', {
      body: {
        topic: request.topic,
        targetOutlets: request.targetOutlets,
        freshnessHorizonHours: request.freshnessHorizonHours || 48,
        maxSources: 20, // Limit sources to prevent oversized responses
        targetWordCount: Math.min(request.targetWordCount || 500, 800) // Cap word count
      }
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(error.message || 'Failed to call news synthesis function');
    }

    if (!data) {
      throw new Error('No data returned from news synthesis function');
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

    // Use the new safe JSON parser
    let newsData: NewsData;
    try {
      newsData = safeJsonParse(outputText);
    } catch (parseError) {
      console.error('All JSON parsing strategies failed:', parseError);
      throw new Error(`Failed to parse news data: ${parseError.message}`);
    }

    // Validate and clean the data with more robust defaults
    const validated: NewsData = {
      topic: newsData.topic || request.topic,
      headline: (newsData.headline || `News Update: ${request.topic}`).substring(0, 100),
      generatedAtUTC: newsData.generatedAtUTC || new Date().toISOString(),
      confidenceLevel: newsData.confidenceLevel || 'Medium',
      topicHottness: newsData.topicHottness || 'Medium',
      summaryPoints: Array.isArray(newsData.summaryPoints) 
        ? newsData.summaryPoints.slice(0, 5).map(p => String(p).substring(0, 150))
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
            headline: String(s.headline || 'No headline').substring(0, 100),
            publishedAt: s.publishedAt || new Date().toISOString(),
            analysisNote: String(s.analysisNote || 'No analysis').substring(0, 100)
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
        error instanceof Error ? error.message : 'Unknown error occurred',
        'Please try again or contact support'
      ],
      sourceAnalysis: {
        narrativeConsistency: { score: 0, label: 'Error' },
        publicInterest: { score: 0, label: 'Error' }
      },
      disagreements: [],
      article: {
        base: 'Unable to generate article due to error.',
        eli5: 'Something went wrong while getting the news.',
        middleSchool: 'An error occurred while fetching news data.',
        highSchool: 'The system encountered an error during news processing.',
        undergrad: 'System error during news synthesis operation.',
        phd: 'Critical system failure in news aggregation pipeline.'
      },
      keyQuestions: [
        'Is the service temporarily unavailable?',
        'Should we retry with simpler parameters?',
        'Are there any network connectivity issues?'
      ],
      sources: [],
      missingSources: request.targetOutlets.map(o => o.name)
    };
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
