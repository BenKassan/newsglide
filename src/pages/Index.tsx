import OpenAI from 'openai';

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
  const apiKey = localStorage.getItem('openai_api_key') || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please set it in localStorage or environment variables.');
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true // Only for development - move to backend in production
  });
}

export async function synthesizeNews(request: SynthesisRequest): Promise<NewsData> {
  // Streamlined prompt to reduce token usage and prevent truncation
  const systemPrompt = `You are a news analyst. Today is ${new Date().toISOString().split('T')[0]}.

Use web search to find the 4 most recent articles about the topic from the last ${request.freshnessHorizonHours || 48} hours.

Return ONLY valid JSON matching this exact structure. Keep all text fields concise to prevent truncation:

{
  "topic": "string",
  "headline": "string (max 100 chars)",
  "generatedAtUTC": "ISO timestamp",
  "confidenceLevel": "High|Medium|Low",
  "topicHottness": "High|Medium|Low",
  "summaryPoints": ["3-4 bullet points, each max 150 chars"],
  "sourceAnalysis": {
    "narrativeConsistency": {"score": 1-10, "label": "string"},
    "publicInterest": {"score": 1-10, "label": "string"}
  },
  "disagreements": [{"pointOfContention": "short", "details": "short", "likelyReason": "short"}],
  "article": {
    "base": "200-300 words",
    "eli5": "50-75 words",
    "middleSchool": "75-100 words",
    "highSchool": "100-150 words",
    "undergrad": "150-200 words",
    "phd": "200-250 words"
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
      "analysisNote": "1 sentence"
    }
  ],
  "missingSources": ["outlet names"]
}

CRITICAL: Keep ALL text concise. No long URLs or descriptions. Return ONLY the JSON.`;

  const userPrompt = `Find current news about: ${request.topic}
Include temporal terms like "today", "June 2025", "latest" in searches.
Target outlets: ${request.targetOutlets.slice(0, 4).map(o => o.name).join(', ')}`;

  try {
    const openai = getOpenAIClient();
    console.log('Synthesizing news for:', request.topic);
    
    // Use the responses API with forced JSON output
    const response = await openai.responses.create({
      model: 'gpt-4.1-mini', // Use mini for better token efficiency
      instructions: systemPrompt,
      input: userPrompt,
      tools: [{ 
        type: 'web_search_preview',
        search_context_size: 'medium' // Reduce from 'high' to prevent truncation
      }],
      tool_choice: { type: 'web_search_preview' },
      max_tokens: 4000 // Explicitly set max tokens
    });

    if (!response.output_text) {
      throw new Error('No output text in response');
    }

    const outputText = response.output_text;
    console.log('Response length:', outputText.length);

    // Enhanced JSON extraction with multiple strategies
    let newsData: NewsData;
    let parseSuccess = false;

    // Strategy 1: Try direct parse
    try {
      newsData = JSON.parse(outputText.trim());
      parseSuccess = true;
    } catch (e1) {
      console.log('Direct parse failed, trying cleanup strategies...');
      
      // Strategy 2: Remove markdown and find JSON
      try {
        let cleaned = outputText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        
        // Find JSON boundaries
        const jsonStart = cleaned.indexOf('{');
        const jsonEnd = cleaned.lastIndexOf('}');
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
          newsData = JSON.parse(cleaned);
          parseSuccess = true;
        }
      } catch (e2) {
        console.log('Cleanup parse failed, attempting repair...');
        
        // Strategy 3: Try to repair truncated JSON
        try {
          let repaired = outputText.trim();
          
          // Remove markdown if present
          repaired = repaired.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
          
          // Find where JSON likely starts
          const jsonStart = repaired.indexOf('{');
          if (jsonStart >= 0) {
            repaired = repaired.slice(jsonStart);
            
            // Count open/close braces and brackets
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
            
            // Add missing closing characters
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
          console.error('All parsing strategies failed');
          throw new Error(`JSON parsing failed after all attempts: ${e1}`);
        }
      }
    }

    if (!parseSuccess || !newsData) {
      throw new Error('Failed to parse response into valid NewsData structure');
    }

    // Validate and ensure all required fields exist
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
    
    // Return a structured error response
    return {
      topic: request.topic,
      headline: `Unable to fetch current news for "${request.topic}"`,
      generatedAtUTC: new Date().toISOString(),
      confidenceLevel: 'Low',
      topicHottness: 'Low',
      summaryPoints: [
        'Failed to retrieve news articles',
        error instanceof Error ? error.message : 'Unknown error',
        'Please try again'
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

// Simplified test function
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