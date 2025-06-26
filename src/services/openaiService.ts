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
  // Try environment variable first, then localStorage
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY || localStorage.getItem('openai_api_key');
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please set REACT_APP_OPENAI_API_KEY in your .env file or set it in localStorage.');
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true // Only for development - move to backend in production
  });
}

// Helper function to clean markdown from response
function cleanMarkdownJSON(text: string): string {
  let cleaned = text;
  
  // Remove all possible markdown code block variations
  cleaned = cleaned.replace(/^```json\s*\n?/i, '');
  cleaned = cleaned.replace(/^```JSON\s*\n?/i, '');
  cleaned = cleaned.replace(/^```\s*\n?/i, '');
  cleaned = cleaned.replace(/\n?```\s*$/i, '');
  
  // Remove any leading/trailing backticks
  cleaned = cleaned.replace(/^`+/, '');
  cleaned = cleaned.replace(/`+$/, '');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  // If it still has backticks at start, remove them more aggressively
  while (cleaned.startsWith('`')) {
    cleaned = cleaned.substring(1);
  }
  while (cleaned.endsWith('`')) {
    cleaned = cleaned.substring(0, cleaned.length - 1);
  }
  
  return cleaned.trim();
}

export async function synthesizeNews(request: SynthesisRequest): Promise<NewsData> {
  // Extremely simple prompt to avoid any formatting issues
  const systemPrompt = `You are a news analyst. Search for recent news about the topic and return pure JSON only.

DO NOT use markdown, code blocks, or backticks. Return raw JSON starting with { and ending with }

Structure:
{
  "topic": "string",
  "headline": "string (max 100 chars)",
  "generatedAtUTC": "ISO timestamp",
  "confidenceLevel": "High|Medium|Low",
  "topicHottness": "High|Medium|Low",
  "summaryPoints": ["array of 3-4 points, max 150 chars each"],
  "sourceAnalysis": {
    "narrativeConsistency": {"score": 1-10, "label": "High Consistency|Some Variance|Low Consistency"},
    "publicInterest": {"score": 1-10, "label": "Very High|High|Medium|Low"}
  },
  "disagreements": [],
  "article": {
    "base": "200-300 word article",
    "eli5": "50-75 words",
    "middleSchool": "75-100 words",
    "highSchool": "100-150 words",
    "undergrad": "150-200 words",
    "phd": "200-250 words"
  },
  "keyQuestions": ["array of 3 questions"],
  "sources": [{"id": "s1", "outlet": "name", "type": "type", "url": "url", "headline": "headline", "publishedAt": "ISO date", "analysisNote": "note"}],
  "missingSources": []
}`;

  const userPrompt = `Topic: ${request.topic}
Date: ${new Date().toISOString()}
Find news from the last 48 hours.`;

  try {
    const openai = getOpenAIClient();
    console.log('Synthesizing news for:', request.topic);
    
    // Use the responses API
    const response = await openai.responses.create({
      model: 'gpt-4.1-mini',
      instructions: systemPrompt,
      input: userPrompt,
      tools: [{ 
        type: 'web_search_preview',
        search_context_size: 'medium'
      }],
      tool_choice: { type: 'web_search_preview' }
    });

    if (!response.output_text) {
      throw new Error('No output text in response');
    }

    const outputText = response.output_text;
    console.log('Response length:', outputText.length);
    console.log('First 200 chars of response:', outputText.substring(0, 200));

    // Try multiple parsing strategies
    let newsData: NewsData | null = null;
    let parseError: Error | null = null;

    // Strategy 1: Try direct parse
    try {
      newsData = JSON.parse(outputText);
      console.log('Direct parse successful');
    } catch (e1) {
      console.log('Direct parse failed:', e1);
      
      // Strategy 2: Clean markdown
      try {
        const cleaned = cleanMarkdownJSON(outputText);
        console.log('Cleaned text preview:', cleaned.substring(0, 100));
        newsData = JSON.parse(cleaned);
        console.log('Parse after markdown cleanup successful');
      } catch (e2) {
        console.log('Markdown cleanup parse failed:', e2);
        
        // Strategy 3: Extract JSON object
        try {
          // Find first { and last }
          const startIdx = outputText.indexOf('{');
          const endIdx = outputText.lastIndexOf('}');
          
          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            const extracted = outputText.substring(startIdx, endIdx + 1);
            console.log('Extracted JSON length:', extracted.length);
            newsData = JSON.parse(extracted);
            console.log('Extracted JSON parse successful');
          } else {
            throw new Error('No JSON object found in response');
          }
        } catch (e3) {
          console.log('JSON extraction failed:', e3);
          
          // Strategy 4: Try to fix common issues
          try {
            let fixed = outputText;
            
            // Remove everything before first {
            const firstBrace = fixed.indexOf('{');
            if (firstBrace > 0) {
              fixed = fixed.substring(firstBrace);
            }
            
            // Remove everything after last }
            const lastBrace = fixed.lastIndexOf('}');
            if (lastBrace !== -1 && lastBrace < fixed.length - 1) {
              fixed = fixed.substring(0, lastBrace + 1);
            }
            
            // Clean any remaining markdown
            fixed = cleanMarkdownJSON(fixed);
            
            // Remove trailing commas
            fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
            
            console.log('Fixed JSON preview:', fixed.substring(0, 100));
            newsData = JSON.parse(fixed);
            console.log('Fixed JSON parse successful');
          } catch (e4) {
            parseError = new Error(`All parsing strategies failed. Response starts with: "${outputText.substring(0, 50)}..."`);
            console.error('All parsing failed:', e4);
            console.error('Full response:', outputText);
          }
        }
      }
    }

    if (!newsData) {
      throw parseError || new Error('Failed to parse API response');
    }

    // Validate and clean the response
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
      disagreements: Array.isArray(newsData.disagreements) ? newsData.disagreements.slice(0, 3) : [],
      article: {
        base: newsData.article?.base || 'Article content unavailable.',
        eli5: newsData.article?.eli5 || 'Simple explanation unavailable.',
        middleSchool: newsData.article?.middleSchool || 'Explanation unavailable.',
        highSchool: newsData.article?.highSchool || 'Explanation unavailable.',
        undergrad: newsData.article?.undergrad || 'Analysis unavailable.',
        phd: newsData.article?.phd || 'Technical analysis unavailable.'
      },
      keyQuestions: Array.isArray(newsData.keyQuestions) ? newsData.keyQuestions.slice(0, 5) : ['What are the latest developments?'],
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
      missingSources: Array.isArray(newsData.missingSources) ? newsData.missingSources : []
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
        error instanceof Error ? error.message.substring(0, 100) : 'Unknown error',
        'Please try again with a simpler topic'
      ],
      sourceAnalysis: {
        narrativeConsistency: { score: 0, label: 'Error' },
        publicInterest: { score: 0, label: 'Error' }
      },
      disagreements: [],
      article: {
        base: 'Unable to generate article due to an error in processing.',
        eli5: 'Something went wrong while trying to get the news.',
        middleSchool: 'An error occurred while searching for news articles.',
        highSchool: 'The news synthesis system encountered an error.',
        undergrad: 'System error during news aggregation and processing.',
        phd: 'Critical failure in the news synthesis pipeline.'
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

// Test function
export async function testWithSimpleTopic(): Promise<void> {
  const test: SynthesisRequest = {
    topic: 'nvidia stock today',
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