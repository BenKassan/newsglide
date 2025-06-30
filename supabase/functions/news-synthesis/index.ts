
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchResult {
  title: string;
  url: string;
  description: string;
  published?: string;
  source?: string;
}

// Optimized search function with reduced timeout and results
async function searchBraveNews(query: string, count: number = 3): Promise<SearchResult[]> {
  const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');
  
  if (!BRAVE_API_KEY) {
    throw new Error('Brave Search API key not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000); // Reduced from 5s to 3s

  try {
    const searchUrl = 'https://api.search.brave.com/res/v1/news/search';
    const params = new URLSearchParams({
      q: query,
      count: count.toString(), // Reduced to 3
      freshness: 'pd2',
      lang: 'en',
      search_lang: 'en',
      ui_lang: 'en-US'
    });

    const response = await fetch(`${searchUrl}?${params}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error('Brave Search error:', response.status);
      throw new Error(`Brave Search API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.results?.slice(0, 3).map((result: any) => ({
      title: result.title.substring(0, 80),
      url: result.url,
      description: (result.description || '').substring(0, 150),
      published: result.published_at || new Date().toISOString(),
      source: result.meta_site?.name || new URL(result.url).hostname
    })) || [];
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('Search timeout - try a simpler query');
    }
    throw error;
  }
}

// Simplified JSON parser for faster processing
function fastJsonParse(rawText: string): any {
  // Strip markdown blocks
  let cleaned = rawText.trim().replace(/```(?:json)?\s*/gi, '').replace(/```$/g, '');
  
  // Find JSON boundaries
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  
  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }
  
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    // Quick repair attempt
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(cleaned);
  }
}

async function errorGuard(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error: any) {
    console.error('ANALYZE_ERROR', { 
      message: error.message, 
      code: error.code || 'INTERNAL'
    });
    
    return new Response(JSON.stringify({
      error: true,
      code: error.code || 'INTERNAL',
      message: error.message || 'Internal server error'
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { topic } = await req.json();
  
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  if (!OPENAI_API_KEY) {
    const error = new Error('OpenAI API key not configured');
    error.code = 'CONFIG_ERROR';
    throw error;
  }

  console.log('Fast search for:', topic);
  
  // Step 1: Quick search (3s max, 3 results)
  let searchResults: SearchResult[] = [];
  
  try {
    searchResults = await searchBraveNews(topic, 3);
    console.log(`Found ${searchResults.length} articles quickly`);
  } catch (error) {
    console.error('Search failed:', error);
    const searchError = new Error('No current news articles found. Try a different search term.');
    searchError.code = 'NO_SOURCES';
    throw searchError;
  }

  if (searchResults.length === 0) {
    const error = new Error('No current news articles found for this topic.');
    error.code = 'NO_SOURCES';
    throw error;
  }

  // Step 2: Minimal context for speed
  const articlesContext = searchResults.map((article, index) => 
    `[${index + 1}] ${article.title.substring(0, 60)} - ${article.source}`
  ).join('\n');

  // Step 3: Optimized system prompt for faster generation
  const systemPrompt = `You are a fast news analyst. Synthesize these articles about "${topic}":

${articlesContext}

Return this EXACT JSON structure with OPTIMIZED lengths:

{
  "topic": "${topic}",
  "headline": "engaging headline max 70 chars",
  "generatedAtUTC": "${new Date().toISOString()}",
  "confidenceLevel": "High|Medium|Low",
  "topicHottness": "High|Medium|Low",
  "summaryPoints": ["3 key points, each 60-80 chars"],
  "sourceAnalysis": {
    "narrativeConsistency": {"score": 7, "label": "Consistent|Mixed|Conflicting"},
    "publicInterest": {"score": 7, "label": "Viral|Popular|Moderate|Niche"}
  },
  "disagreements": [],
  "article": {
    "base": "EXACTLY 250-300 words. Clear, engaging journalism with key facts and context. Use natural citations [^1], [^2].",
    
    "eli5": "EXACTLY 50-60 words. Very simple explanation like for a 5-year-old.",
    
    "phd": "EXACTLY 200-250 words maximum. Academic analysis with theoretical frameworks, methodological considerations, and implications. Dense but concise academic prose with citations [^1], [^2]."
  },
  "keyQuestions": ["3 thought-provoking questions"],
  "sources": [],
  "missingSources": []
}

CRITICAL: Keep ALL content lengths EXACTLY as specified. PhD section is LIMITED to 250 words maximum.`;

  const userPrompt = `Create the JSON synthesis. IMPORTANT: Keep all content concise for fast generation.`;

  console.log('Calling OpenAI with optimized prompt...');

  // Fast OpenAI call with reduced timeout and tokens
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // Reduced from 25s to 15s
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6, // Reduced for consistency
        max_tokens: 2500 // Reduced from 4500 for faster generation
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
      
      const error = new Error(errorData?.error?.message || `OpenAI API error: ${response.status}`);
      error.code = response.status === 429 ? 'RATE_LIMIT' : 'OPENAI';
      throw error;
    }

    const data = await response.json();
    console.log('OpenAI response received');

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      const error = new Error('No content in OpenAI response');
      error.code = 'OPENAI';
      throw error;
    }

    // Fast JSON parsing
    let newsData;
    try {
      newsData = fastJsonParse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      const error = new Error(`Failed to parse response: ${parseError.message}`);
      error.code = 'PARSE_ERROR';
      throw error;
    }

    // Use REAL search results as sources
    const validatedSources = searchResults.map((article, index) => ({
      id: `s${index + 1}`,
      outlet: article.source || new URL(article.url).hostname,
      type: determineOutletType(article.source || ''),
      url: article.url,
      headline: article.title,
      publishedAt: article.published || new Date().toISOString(),
      analysisNote: 'Real source included in synthesis'
    }));

    newsData.sources = validatedSources;
    newsData.generatedAtUTC = new Date().toISOString();

    console.log(`Fast synthesis complete with ${validatedSources.length} sources`);

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
        'x-model-used': 'gpt-4o-mini-optimized',
        'x-processing-time': 'fast'
      },
    });

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Processing timeout. Try a simpler topic.');
      timeoutError.code = 'TIMEOUT';
      throw timeoutError;
    }
    
    throw error;
  }
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
