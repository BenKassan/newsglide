
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'x-error-code, x-news-count, x-openai-tokens',
};

interface SearchResult {
  title: string;
  url: string;
  description: string;
  published?: string;
  source?: string;
}

// Brave Search API function
async function searchBraveNews(query: string, count: number = 10): Promise<SearchResult[]> {
  const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');
  
  if (!BRAVE_API_KEY) {
    throw new Error('Brave Search API key not configured');
  }

  const searchUrl = 'https://api.search.brave.com/res/v1/news/search';
  const params = new URLSearchParams({
    q: query,
    count: count.toString(),
    freshness: 'pd3', // Past 3 days
    lang: 'en',
    search_lang: 'en',
    ui_lang: 'en-US'
  });

  const response = await fetch(`${searchUrl}?${params}`, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_API_KEY
    }
  });

  if (!response.ok) {
    console.error('Brave Search error:', response.status, await response.text());
    throw new Error(`Brave Search API error: ${response.status}`);
  }

  const data = await response.json();
  
  return data.results?.map((result: any) => ({
    title: result.title,
    url: result.url,
    description: result.description || '',
    published: result.published_at || new Date().toISOString(),
    source: result.meta_site?.name || new URL(result.url).hostname
  })) || [];
}

// Alternative: Serper API function (specialized for news)
async function searchSerperNews(query: string): Promise<SearchResult[]> {
  const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');
  
  if (!SERPER_API_KEY) {
    throw new Error('Serper API key not configured');
  }

  const response = await fetch('https://google.serper.dev/news', {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      q: query,
      num: 10,
      tbs: 'qdr:d3' // Last 3 days
    })
  });

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status}`);
  }

  const data = await response.json();
  
  return data.news?.map((item: any) => ({
    title: item.title,
    url: item.link,
    description: item.snippet,
    published: item.date,
    source: item.source
  })) || [];
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
        } else if (char === '[') {
          bracketCount++;
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

async function errorGuard(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error: any) {
    console.error('ANALYZE_ERROR', { 
      message: error.message, 
      stack: error.stack,
      code: error.code || 'INTERNAL'
    });
    
    // Return structured error response
    return new Response(JSON.stringify({
      error: true,
      code: error.code || 'INTERNAL',
      message: error.message || 'Internal server error',
      details: error.details || null
    }), {
      status: 502,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'x-error-code': error.code || 'INTERNAL'
      },
    });
  }
}

async function handleRequest(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { topic, targetOutlets, freshnessHorizonHours } = await req.json();
  
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  if (!OPENAI_API_KEY) {
    const error = new Error('OpenAI API key not configured');
    error.code = 'CONFIG_ERROR';
    throw error;
  }

  console.log('Searching for real news about:', topic);
  
  // Step 1: Search for real news articles
  let searchResults: SearchResult[] = [];
  
  try {
    // Try Brave Search first
    searchResults = await searchBraveNews(topic, 15);
    console.log(`Brave Search found ${searchResults.length} articles`);
  } catch (braveError) {
    console.error('Brave Search failed, trying Serper:', braveError);
    // Fallback to Serper if Brave fails
    try {
      searchResults = await searchSerperNews(topic);
      console.log(`Serper Search found ${searchResults.length} articles`);
    } catch (serperError) {
      console.error('Both search APIs failed:', serperError);
    }
  }

  if (searchResults.length === 0) {
    const error = new Error('No current news articles found for this topic. Try a different search term or check if your search APIs are configured.');
    error.code = 'NO_SOURCES';
    throw error;
  }

  console.log(`Found ${searchResults.length} real articles`);

  // Step 2: Prepare articles for synthesis
  const articlesContext = searchResults.slice(0, 10).map((article, index) => 
    `Article ${index + 1}:
Title: ${article.title}
Source: ${article.source}
URL: ${article.url}
Published: ${article.published}
Summary: ${article.description}
---`
  ).join('\n');

  // Step 3: Use OpenAI to synthesize the real articles
  const systemPrompt = `You are an expert news analyst. You have been provided with REAL news articles from the past ${freshnessHorizonHours || 48} hours about a specific topic. Your task is to synthesize these articles into a comprehensive analysis.

The articles provided below are REAL and CURRENT. Use them as your sources.

${articlesContext}

Based on these real articles, create a synthesis with this EXACT JSON structure:

{
  "topic": "string",
  "headline": "string (max 80 chars) - create a headline that captures the main story",
  "generatedAtUTC": "ISO timestamp",
  "confidenceLevel": "High|Medium|Low",
  "topicHottness": "High|Medium|Low",
  "summaryPoints": ["3 key takeaways from the articles, each max 120 chars"],
  "sourceAnalysis": {
    "narrativeConsistency": {"score": 1-10, "label": "Consistent|Mixed|Conflicting"},
    "publicInterest": {"score": 1-10, "label": "Viral|Popular|Moderate|Niche"}
  },
  "disagreements": [
    {
      "pointOfContention": "what sources disagree on (max 60 chars)",
      "details": "specific disagreement details (max 150 chars)",
      "likelyReason": "why they might disagree (max 100 chars)"
    }
  ],
  "article": {
    "base": "200-250 word synthesis with [^1], [^2] citations",
    "eli5": "40-60 words simple explanation",
    "middleSchool": "60-80 words",
    "highSchool": "80-120 words",
    "undergrad": "300-400 words with citations",
    "phd": "500-700 words with detailed analysis and citations"
  },
  "keyQuestions": ["3 important questions this news raises"],
  "sources": [
    {
      "id": "s1",
      "outlet": "actual outlet name",
      "type": "News Agency|National Newspaper|Broadcast Media|Online Media",
      "url": "the actual URL from the search results",
      "headline": "the actual headline",
      "publishedAt": "actual publish date",
      "analysisNote": "1 sentence about this source's angle"
    }
  ],
  "missingSources": ["list any major outlets that don't have recent coverage"]
}

Important: 
- Use ONLY the provided real articles as sources
- All URLs must be the actual URLs from the search results
- Create citations [^1], [^2] etc. that refer to the sources array
- Identify any disagreements between the real sources
- Base confidence level on the quality and consistency of actual sources`;

  const userPrompt = `Topic: ${topic}

Synthesize the provided real news articles into a comprehensive analysis.`;

  console.log('Calling OpenAI to synthesize real articles...');

  // Setup timeout and retry logic
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);
  
  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      // Call OpenAI with a valid model and increased token limit
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3, // Lower temperature for more factual synthesis
          max_completion_tokens: 3000
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        console.error('OPENAI_ERROR', response.status, errorData);
        
        // Handle rate limits with retry
        if (response.status === 429 && retryCount < maxRetries) {
          console.log(`Rate limited, retrying in ${retryCount + 1} seconds...`);
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
          retryCount++;
          continue;
        }
        
        const error = new Error(errorData?.error?.message || `OpenAI API error: ${response.status}`);
        error.code = response.status === 429 ? 'RATE_LIMIT' : 'OPENAI';
        error.details = errorData;
        throw error;
      }

      const data = await response.json();
      console.log('OpenAI API response received');

      // Extract the content from the response
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        const error = new Error('No content in OpenAI response');
        error.code = 'OPENAI';
        throw error;
      }

      // Parse the JSON content
      let newsData;
      try {
        newsData = safeJsonParse(content);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw content:', content.substring(0, 500));
        const error = new Error(`Failed to parse OpenAI JSON response: ${parseError.message}`);
        error.code = 'PARSE_ERROR';
        throw error;
      }

      // Use the REAL search results as sources
      const validatedSources = searchResults.slice(0, 8).map((article, index) => ({
        id: `s${index + 1}`,
        outlet: article.source || new URL(article.url).hostname,
        type: determineOutletType(article.source || ''),
        url: article.url,
        headline: article.title,
        publishedAt: article.published || new Date().toISOString(),
        analysisNote: newsData.sources?.[index]?.analysisNote || 'Real source included in synthesis'
      }));

      // Update newsData with real sources
      newsData.sources = validatedSources;
      newsData.generatedAtUTC = new Date().toISOString();

      console.log(`Successfully synthesized news with ${validatedSources.length} real sources`);

      return new Response(JSON.stringify({
        output: [{
          type: 'message',
          content: [{ text: JSON.stringify(newsData) }]
        }]
      }), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'x-news-count': String(validatedSources.length),
          'x-openai-tokens': String(data.usage?.total_tokens || 0),
          'x-model-used': 'gpt-4-turbo-preview',
          'x-real-sources': 'true'
        },
      });

      // Break out of retry loop on success
      break;

    } catch (error: any) {
      console.error(`Attempt ${retryCount + 1} failed:`, error.message);
      
      if (retryCount >= maxRetries) {
        clearTimeout(timeoutId);
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      retryCount++;
    }
  }

  // This should never be reached due to the break/throw above
  const error = new Error('Unexpected end of retry loop');
  error.code = 'INTERNAL';
  throw error;
}

function determineOutletType(source: string): string {
  const lowerSource = source.toLowerCase();
  
  if (lowerSource.includes('reuters') || lowerSource.includes('ap') || lowerSource.includes('bloomberg')) {
    return 'News Agency';
  } else if (lowerSource.includes('cnn') || lowerSource.includes('bbc') || lowerSource.includes('fox')) {
    return 'Broadcast Media';
  } else if (lowerSource.includes('times') || lowerSource.includes('post') || lowerSource.includes('journal')) {
    return 'National Newspaper';
  } else {
    return 'Online Media';
  }
}

serve((req: Request) => errorGuard(() => handleRequest(req)));
