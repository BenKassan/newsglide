
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

// Optimized search function with timeout and reduced results
async function searchBraveNews(query: string, count: number = 5): Promise<SearchResult[]> {
  const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');
  
  if (!BRAVE_API_KEY) {
    throw new Error('Brave Search API key not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

  try {
    const searchUrl = 'https://api.search.brave.com/res/v1/news/search';
    const params = new URLSearchParams({
      q: query,
      count: count.toString(), // Reduced to 5
      freshness: 'pd2', // Past 2 days instead of 3
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
      console.error('Brave Search error:', response.status, await response.text());
      throw new Error(`Brave Search API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Only return first 5 results for speed
    return data.results?.slice(0, 5).map((result: any) => ({
      title: result.title.substring(0, 100), // Limit title length
      url: result.url,
      description: (result.description || '').substring(0, 200), // Limit description
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

// Alternative: Serper API function (specialized for news)
async function searchSerperNews(query: string): Promise<SearchResult[]> {
  const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');
  
  if (!SERPER_API_KEY) {
    throw new Error('Serper API key not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch('https://google.serper.dev/news', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        q: query,
        num: 5, // Reduced from 6
        tbs: 'qdr:d2' // Last 2 days
      })
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.news?.slice(0, 5).map((item: any) => ({
      title: item.title,
      url: item.link,
      description: item.snippet,
      published: item.date,
      source: item.source
    })) || [];
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('Search timeout - try a simpler query');
    }
    throw error;
  }
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
  
  // Step 1: Quick search (5s max)
  let searchResults: SearchResult[] = [];
  
  try {
    // Try Brave Search first
    searchResults = await searchBraveNews(topic, 5);
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

  // Step 2: Prepare minimal context for speed
  const articlesContext = searchResults.slice(0, 5).map((article, index) => 
    `[${index + 1}] ${article.title.substring(0, 80)} - ${article.source}`
  ).join('\n');

  // Step 3: Enhanced system prompt with explicit length requirements
  const systemPrompt = `You are an expert news analyst. Synthesize these real articles about "${topic}":

${articlesContext}

Return this EXACT JSON structure. CRITICAL: You MUST generate the EXACT word counts specified:

{
  "topic": "${topic}",
  "headline": "compelling headline max 80 chars",
  "generatedAtUTC": "${new Date().toISOString()}",
  "confidenceLevel": "High|Medium|Low",
  "topicHottness": "High|Medium|Low",
  "summaryPoints": ["3 key points, each 80-100 chars"],
  "sourceAnalysis": {
    "narrativeConsistency": {"score": 7, "label": "Consistent|Mixed|Conflicting"},
    "publicInterest": {"score": 7, "label": "Viral|Popular|Moderate|Niche"}
  },
  "disagreements": [],
  "article": {
    "base": "EXACTLY 300-350 words. Engaging, clear journalism that competes with traditional media. Make it interesting and accessible to all audiences. Include key facts, context, and why it matters. Use [^1], [^2] citations naturally throughout.",
    
    "eli5": "EXACTLY 60-80 words. Explain like the reader is 5 years old. Use very simple words and short sentences. Make it fun and easy to understand.",
    
    "phd": "MINIMUM 500 words, TARGET 600-700 words. This MUST be a comprehensive graduate-level academic analysis. Include ALL of these elements: (1) Theoretical frameworks and academic context, (2) Methodological considerations of the news coverage, (3) Interdisciplinary perspectives connecting to economics, politics, sociology, etc., (4) Critical evaluation of source biases and narratives, (5) Implications for current academic debates, (6) Historical precedents and comparisons, (7) Second-order effects and systemic implications, (8) Future research directions. Use sophisticated academic language with field-specific terminology. Include extensive citations [^1], [^2], [^3]. Write in dense academic prose with complex sentence structures."
  },
  "keyQuestions": ["3 thought-provoking questions"],
  "sources": [],
  "missingSources": []
}

CRITICAL LENGTH REQUIREMENTS:
- Base: 300-350 words (standard news article)
- ELI5: 60-80 words (very short and simple)
- PhD: MINIMUM 500 words, ideally 600-700 words (comprehensive academic paper)

The PhD section MUST be substantially longer than the base article. Do NOT limit its length. Generate a full academic analysis.

PhD ANALYSIS STRUCTURE GUIDE (500+ words):
Paragraph 1 (100-120 words): Theoretical framework and academic positioning
Paragraph 2 (80-100 words): Methodological analysis of news coverage
Paragraph 3 (80-100 words): Interdisciplinary perspectives
Paragraph 4 (80-100 words): Critical evaluation of sources and biases
Paragraph 5 (80-100 words): Historical context and precedents
Paragraph 6 (80-100 words): Systemic implications and second-order effects
Paragraph 7 (60-80 words): Future research directions and conclusions`;

  const userPrompt = `Create the JSON synthesis. CRITICAL: The PhD analysis MUST be at least 500 words - this is non-negotiable. Make it a comprehensive academic paper with all required elements. Do NOT truncate or shorten the PhD section.`;

  console.log('Calling OpenAI to synthesize real articles...');

  // Fast OpenAI call with increased timeout and tokens
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout
  
  try {
    // Call OpenAI with GPT-4o-mini for speed and cost efficiency
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast, cheap, and capable
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4500 // Increased from 4000 to ensure PhD content isn't cut off
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
    const validatedSources = searchResults.map((article, index) => ({
      id: `s${index + 1}`,
      outlet: article.source || new URL(article.url).hostname,
      type: determineOutletType(article.source || ''),
      url: article.url,
      headline: article.title,
      publishedAt: article.published || new Date().toISOString(),
      analysisNote: 'Real source included in synthesis'
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
        'x-model-used': 'gpt-4o-mini',
        'x-real-sources': 'true'
      },
    });

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Analysis took too long. The topic might be too complex or try again in a moment.');
      timeoutError.code = 'TIMEOUT';
      throw timeoutError;
    }
    
    // Add specific handling for token limit errors
    if (error.message?.includes('maximum context length')) {
      const tokenError = new Error('Content request too large. Please try a simpler topic.');
      tokenError.code = 'TOKEN_LIMIT';
      throw tokenError;
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
