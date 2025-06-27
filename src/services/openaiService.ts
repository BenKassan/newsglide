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
  // Updated system prompt to emphasize current date and real-time search
  const systemPrompt = `You are NewsSynth, an expert news analyst. Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.

CRITICAL: You have access to real-time web search. Use it to find the MOST RECENT articles from the last ${request.freshnessHorizonHours || 24} hours.

Your response must be PURE JSON only - no markdown, no backticks, no extra text.

TASK:
1. Search for "${request.topic}" with temporal qualifiers like "today", "latest", "2025", "June 2025" to ensure current results
2. Find and analyze the 4 most recent articles (prioritize articles from the last 24-48 hours)
3. If searching for specific outlets from TargetOutlets, include outlet names in your search
4. Create comprehensive synthesis at different complexity levels
5. Return ONLY the JSON structure specified below

IMPORTANT: 
- Always include dates/timestamps in your search queries for current results
- Verify article dates - only use articles from the last few days
- If you find older articles, search again with more specific date qualifiers

JSON Structure (return EXACTLY this structure):
{
  "topic": "string",
  "headline": "string (compelling headline summarizing the current situation)",
  "generatedAtUTC": "ISO 8601 timestamp",
  "confidenceLevel": "High|Medium|Low",
  "topicHottness": "High|Medium|Low",
  "summaryPoints": ["array of 3-5 key points from the most recent coverage"],
  "sourceAnalysis": {
    "narrativeConsistency": {
      "score": number (1-10),
      "label": "Identical|High Consistency|Some Variance|Low Consistency"
    },
    "publicInterest": {
      "score": number (1-10),
      "label": "Very High|High|Medium|Low"
    }
  },
  "disagreements": [
    {
      "pointOfContention": "string",
      "details": "string",
      "likelyReason": "string"
    }
  ],
  "article": {
    "base": "string (comprehensive 300-500 word article)",
    "eli5": "string (simple 100-150 word explanation)",
    "middleSchool": "string (150-200 words)",
    "highSchool": "string (200-250 words)",
    "undergrad": "string (250-300 words)",
    "phd": "string (technical 300-400 word analysis)"
  },
  "keyQuestions": ["array of 3-5 unanswered questions about this topic"],
  "sources": [
    {
      "id": "string",
      "outlet": "string",
      "type": "string",
      "url": "string",
      "headline": "string",
      "publishedAt": "ISO 8601 timestamp",
      "analysisNote": "string"
    }
  ],
  "missingSources": ["array of outlet names that couldn't be found"]
}`;

  const userPrompt = `Analyze news about: ${request.topic}

Target Outlets to prioritize (if available): ${JSON.stringify(request.targetOutlets)}
Time frame: Last ${request.freshnessHorizonHours || 24} hours
Current date for reference: ${new Date().toISOString()}

IMPORTANT: Use web search to find the most recent articles. Include temporal qualifiers in your searches.`;

  try {
    const openai = getOpenAIClient();
    console.log('Calling OpenAI Responses API with web search for topic:', request.topic);
    
    // Use the responses API with web_search_preview tool
    const response = await openai.responses.create({
      model: 'gpt-4.1', // or 'gpt-4.1-mini' for cost efficiency
      instructions: systemPrompt,
      input: userPrompt,
      tools: [{ 
        type: 'web_search_preview',
        search_context_size: 'high' // Use high context for better news coverage
      }],
      tool_choice: { type: 'web_search_preview' } // Force web search usage
    });

    console.log('Response received, processing output...');

    // Extract the output text from the response
    const outputText = response.output_text;
    if (!outputText) {
      throw new Error('No output text in response');
    }

    // Log first part of response for debugging
    console.log('Output preview:', outputText.substring(0, 200) + '...');

    // Parse the JSON from the output
    let newsData: NewsData;
    try {
      // Clean the response - remove any markdown or extra formatting
      let cleanJson = outputText.trim();
      
      // Remove markdown code blocks if present
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '');
      cleanJson = cleanJson.replace(/\s*```$/i, '');
      
      // Extract JSON object using regex as fallback
      const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanJson = jsonMatch[0];
      }
      
      // Remove any trailing commas before closing braces/brackets
      cleanJson = cleanJson.replace(/,(\s*[}\]])/g, '$1');
      
      newsData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Failed to parse:', outputText.substring(0, 1000));
      
      // Try to extract just the JSON part if there's explanatory text
      const jsonStart = outputText.indexOf('{');
      const jsonEnd = outputText.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        try {
          const extractedJson = outputText.slice(jsonStart, jsonEnd + 1);
          newsData = JSON.parse(extractedJson);
        } catch (secondParseError) {
          throw new Error(`Failed to parse JSON after extraction: ${secondParseError}`);
        }
      } else {
        throw new Error(`Could not find valid JSON in response: ${parseError}`);
      }
    }

    // Validate and clean the response
    if (!newsData || typeof newsData !== 'object') {
      throw new Error('Invalid response structure - not an object');
    }

    // Ensure all required fields exist with proper defaults
    const validatedData: NewsData = {
      topic: newsData.topic || request.topic,
      headline: newsData.headline || `Latest News: ${request.topic}`,
      generatedAtUTC: newsData.generatedAtUTC || new Date().toISOString(),
      confidenceLevel: newsData.confidenceLevel || 'Medium',
      topicHottness: newsData.topicHottness || 'Medium',
      summaryPoints: Array.isArray(newsData.summaryPoints) ? newsData.summaryPoints : [],
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
      disagreements: Array.isArray(newsData.disagreements) ? newsData.disagreements : [],
      article: {
        base: newsData.article?.base || 'Unable to generate article content.',
        eli5: newsData.article?.eli5 || 'Unable to generate simplified content.',
        middleSchool: newsData.article?.middleSchool || 'Unable to generate content.',
        highSchool: newsData.article?.highSchool || 'Unable to generate content.',
        undergrad: newsData.article?.undergrad || 'Unable to generate content.',
        phd: newsData.article?.phd || 'Unable to generate content.'
      },
      keyQuestions: Array.isArray(newsData.keyQuestions) ? newsData.keyQuestions : [],
      sources: Array.isArray(newsData.sources) ? newsData.sources.slice(0, 4) : [],
      missingSources: Array.isArray(newsData.missingSources) ? newsData.missingSources : []
    };

    // Clean and validate sources
    validatedData.sources = validatedData.sources.map((source, index) => ({
      id: source.id || `source_${index + 1}`,
      outlet: source.outlet || 'Unknown Outlet',
      type: source.type || 'Unknown Type',
      url: source.url || '',
      headline: source.headline || 'No headline available',
      publishedAt: source.publishedAt || new Date().toISOString(),
      analysisNote: (source.analysisNote || '').trim() || 'No analysis note'
    }));

    // Log success
    console.log(`Successfully synthesized news for "${request.topic}" with ${validatedData.sources.length} sources`);

    return validatedData;

  } catch (error) {
    console.error('Error in synthesizeNews:', error);
    
    // Create a detailed error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    const fallbackResponse: NewsData = {
      topic: request.topic,
      headline: `Error: Unable to fetch current news for "${request.topic}"`,
      generatedAtUTC: new Date().toISOString(),
      confidenceLevel: 'Low',
      topicHottness: 'Low',
      summaryPoints: [
        `Failed to retrieve news articles about ${request.topic}`,
        `Error: ${errorMessage}`,
        'Please check your API configuration and try again'
      ],
      sourceAnalysis: {
        narrativeConsistency: { score: 0, label: 'Error' },
        publicInterest: { score: 0, label: 'Error' }
      },
      disagreements: [],
      article: {
        base: `Unable to generate news synthesis for "${request.topic}". The system encountered an error: ${errorMessage}. Please ensure your OpenAI API key is valid and has access to the Responses API with web search capabilities.`,
        eli5: 'Something went wrong while trying to get the news.',
        middleSchool: 'An error occurred while searching for news articles.',
        highSchool: 'The news synthesis system encountered an error during the search process.',
        undergrad: 'The automated news analysis system failed to retrieve current articles from web sources.',
        phd: `System failure in news aggregation pipeline. Error: ${errorMessage}. Verify API credentials and model access.`
      },
      keyQuestions: [
        'Is the OpenAI API key properly configured?',
        'Does the API key have access to the Responses API?',
        'Is the web_search_preview tool available for this model?'
      ],
      sources: [],
      missingSources: request.targetOutlets?.map(outlet => outlet.name) || []
    };

    return fallbackResponse;
  }
}

// Helper function to test the synthesis with a current topic
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