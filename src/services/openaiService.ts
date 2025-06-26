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
  // Simplified system prompt focused on JSON generation
  const systemPrompt = `You are NewsSynth, an expert news analyst. Analyze news sources and return ONLY valid JSON.

CRITICAL INSTRUCTIONS:
1. Return ONLY a JSON object - no markdown, no backticks, no explanations
2. Use web_search to find the 4 most recent articles about the topic
3. Ensure all string values are properly escaped
4. Keep article content concise to avoid token limits

TASK:
1. Search for recent news on the given topic
2. Analyze up to 4 sources maximum
3. Create synthesis at different complexity levels
4. Return the exact JSON structure specified

JSON Structure Required:
{
  "topic": "string",
  "headline": "string",
  "generatedAtUTC": "ISO 8601 string",
  "confidenceLevel": "High|Medium|Low",
  "topicHottness": "High|Medium|Low",
  "summaryPoints": ["string array"],
  "sourceAnalysis": {
    "narrativeConsistency": {"score": number, "label": "string"},
    "publicInterest": {"score": number, "label": "string"}
  },
  "disagreements": [{"pointOfContention": "string", "details": "string", "likelyReason": "string"}],
  "article": {
    "base": "string (200-300 words)",
    "eli5": "string (100-150 words)",
    "middleSchool": "string (150-200 words)",
    "highSchool": "string (200-250 words)",
    "undergrad": "string (250-300 words)",
    "phd": "string (300-400 words)"
  },
  "keyQuestions": ["string array"],
  "sources": [{"id": "string", "outlet": "string", "type": "string", "url": "string", "headline": "string", "publishedAt": "string", "analysisNote": "string"}],
  "missingSources": ["string array"]
}`;

  const userPrompt = `Topic: ${request.topic}
Target Outlets: ${JSON.stringify(request.targetOutlets)}
Maximum articles to analyze: 4
Focus on recency (last ${request.freshnessHorizonHours || 168} hours)`;

  try {
    const openai = getOpenAIClient();
    console.log('Calling OpenAI with topic:', request.topic);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // or 'gpt-4' if you have access
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent JSON
      max_tokens: 4000, // Ensure enough tokens for response
      response_format: { type: "json_object" } // Force JSON response if using compatible model
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    console.log('Raw response length:', response.length);

    // Parse the JSON response with better error handling
    let newsData: NewsData;
    try {
      // Clean the response
      let cleanedResponse = response.trim();
      
      // Remove any potential markdown code blocks
      cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/i, '');
      cleanedResponse = cleanedResponse.replace(/\s*```$/i, '');
      
      // Try to extract JSON object if there's extra text
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      newsData = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Failed to parse:', response.substring(0, 500) + '...');
      
      // Attempt recovery by creating minimal valid response
      throw new Error(`JSON parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
    }

    // Validate required fields with defaults
    newsData = {
      topic: newsData.topic || request.topic,
      headline: newsData.headline || `News Summary: ${request.topic}`,
      generatedAtUTC: newsData.generatedAtUTC || new Date().toISOString(),
      confidenceLevel: newsData.confidenceLevel || 'Medium',
      topicHottness: newsData.topicHottness || 'Medium',
      summaryPoints: Array.isArray(newsData.summaryPoints) ? newsData.summaryPoints : [],
      sourceAnalysis: newsData.sourceAnalysis || {
        narrativeConsistency: { score: 5, label: 'Medium' },
        publicInterest: { score: 5, label: 'Medium' }
      },
      disagreements: Array.isArray(newsData.disagreements) ? newsData.disagreements : [],
      article: newsData.article || {
        base: 'Unable to generate article content.',
        eli5: 'Unable to generate simplified content.',
        middleSchool: 'Unable to generate content.',
        highSchool: 'Unable to generate content.',
        undergrad: 'Unable to generate content.',
        phd: 'Unable to generate content.'
      },
      keyQuestions: Array.isArray(newsData.keyQuestions) ? newsData.keyQuestions : [],
      sources: Array.isArray(newsData.sources) ? newsData.sources.slice(0, 4) : [],
      missingSources: Array.isArray(newsData.missingSources) ? newsData.missingSources : []
    };

    // Clean up sources
    newsData.sources = newsData.sources.map((source, index) => ({
      id: source.id || `source_${index + 1}`,
      outlet: source.outlet || 'Unknown',
      type: source.type || 'Unknown',
      url: source.url || '',
      headline: source.headline || 'No headline',
      publishedAt: source.publishedAt || new Date().toISOString(),
      analysisNote: (source.analysisNote || '').trim() || 'No analysis available'
    }));

    return newsData;

  } catch (error) {
    console.error('Error in synthesizeNews:', error);
    
    // Return a fallback response structure
    const fallbackResponse: NewsData = {
      topic: request.topic,
      headline: `Error analyzing news for: ${request.topic}`,
      generatedAtUTC: new Date().toISOString(),
      confidenceLevel: 'Low',
      topicHottness: 'Low',
      summaryPoints: ['An error occurred while fetching and analyzing news sources.'],
      sourceAnalysis: {
        narrativeConsistency: { score: 0, label: 'Error' },
        publicInterest: { score: 0, label: 'Error' }
      },
      disagreements: [],
      article: {
        base: `Unable to generate news synthesis for "${request.topic}". Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        eli5: 'Something went wrong while trying to get the news.',
        middleSchool: 'An error occurred while fetching news articles.',
        highSchool: 'The news synthesis system encountered an error.',
        undergrad: 'The automated news analysis system failed to process the request.',
        phd: 'The news aggregation and synthesis pipeline encountered a critical error during execution.'
      },
      keyQuestions: ['What caused the error?', 'Is the OpenAI API properly configured?'],
      sources: [],
      missingSources: request.targetOutlets.map(outlet => outlet.name)
    };

    return fallbackResponse;
  }
}

// Helper function to validate API key
export function validateApiKey(): boolean {
  const apiKey = localStorage.getItem('openai_api_key') || process.env.OPENAI_API_KEY;
  return !!apiKey && apiKey.length > 0;
}

// Helper function to test with a simple topic
export async function testSynthesis(): Promise<void> {
  const testRequest: SynthesisRequest = {
    topic: 'artificial intelligence',
    targetOutlets: [
      { name: 'Reuters', type: 'News Agency' },
      { name: 'TechCrunch', type: 'Online Media' }
    ],
    freshnessHorizonHours: 24,
    targetWordCount: 500
  };

  try {
    console.log('Testing synthesis with:', testRequest);
    const result = await synthesizeNews(testRequest);
    console.log('Test successful:', result);
  } catch (error) {
    console.error('Test failed:', error);
  }
}