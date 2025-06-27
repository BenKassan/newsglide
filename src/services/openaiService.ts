
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

export async function synthesizeNews(request: SynthesisRequest): Promise<NewsData> {
  try {
    console.log('Calling Supabase Edge Function for topic:', request.topic);
    
    // Call Supabase Edge Function instead of OpenAI directly
    const { data, error } = await supabase.functions.invoke('news-synthesis', {
      body: {
        topic: request.topic,
        targetOutlets: request.targetOutlets,
        freshnessHorizonHours: request.freshnessHorizonHours || 48
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

    // Parse response with proper type checking
    let outputText = '';
    
    if (data.output && Array.isArray(data.output)) {
      // Find the message output item using type guard
      const messageOutput = data.output.find(isMessageOutput);
      
      if (messageOutput && messageOutput.content && messageOutput.content[0] && messageOutput.content[0].text) {
        outputText = messageOutput.content[0].text;
      }
    }
    
    // Fallback to legacy structure if new structure not found
    if (!outputText && data.output_text) {
      outputText = data.output_text;
    }

    if (!outputText) {
      console.error('No output text found in response:', data);
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
        'Please try again or contact support'
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
