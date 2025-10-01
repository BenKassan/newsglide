import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'x-error-code, x-news-count, x-openai-tokens',
};

// Initialize Supabase client for caching
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Cache helper functions
function generateCacheKey(topic: string, includePhdAnalysis: boolean = false): string {
  const normalizedTopic = topic
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')  // Normalize spaces
    .replace(/[''`]/g, '')  // Remove quotes
    .replace(/[^\w\s-]/g, '')  // Keep letters, numbers, spaces, hyphens
    .replace(/\s+/g, '_');  // Finally replace spaces with underscores
  
  // Append PhD suffix if requested
  return includePhdAnalysis ? `${normalizedTopic}_phd` : normalizedTopic;
}

async function getCachedResult(topic: string, includePhdAnalysis: boolean = false): Promise<any | null> {
  try {
    const cacheKey = generateCacheKey(topic, includePhdAnalysis);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    console.log(`[CACHE] Looking for key: "${cacheKey}" (topic: "${topic}", PhD: ${includePhdAnalysis})`);
    
    const { data, error } = await supabase
      .from('news_cache')
      .select('id, news_data, hit_count')
      .eq('cache_key', cacheKey)
      .gte('created_at', twoHoursAgo)
      .single();
    
    if (error || !data) {
      console.log(`[CACHE] MISS for topic: "${topic}"`);
      return null;
    }
    
    // Increment hit count asynchronously - don't wait
    supabase
      .from('news_cache')
      .update({ hit_count: (data.hit_count || 0) + 1 })
      .eq('id', data.id)
      .then(() => console.log(`[CACHE] Hit count incremented for: "${topic}"`))
      .catch(e => console.error('[CACHE] Failed to increment hit count:', e));
    
    console.log(`[CACHE] HIT for topic: "${topic}" (hit #${(data.hit_count || 0) + 1})`);
    return data.news_data;
  } catch (e) {
    console.error('[CACHE] Read error:', e);
    return null;
  }
}

async function cacheResult(topic: string, newsData: any, includePhdAnalysis: boolean = false): Promise<void> {
  try {
    const cacheKey = generateCacheKey(topic, includePhdAnalysis);
    
    console.log(`[CACHE] Storing with key: "${cacheKey}" (topic: "${topic}", PhD: ${includePhdAnalysis})`);
    
    await supabase
      .from('news_cache')
      .upsert({
        cache_key: cacheKey,
        topic: topic,
        news_data: newsData,
        created_at: new Date().toISOString(),
        hit_count: 0
      }, {
        onConflict: 'cache_key'
      });
      
    console.log(`[CACHE] Successfully cached: "${topic}"`);
  } catch (e) {
    console.error('[CACHE] Write error:', e);
  }
}

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
      count: '5',
      freshness: 'pw1', // Past week instead of 2 days
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
    
    // Return up to 5 results for reliability buffer
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
        num: 5, // Fetch 5 for reliability buffer
        tbs: 'qdr:w1' // Last week instead of 2 days
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

// Post-process text to remove common AI phrases
function cleanAIPhrasings(text: string): string {
  if (!text) return text;
  
  // Replace common AI phrases with more natural alternatives
  const replacements = [
    // Opening phrases
    [/^It's important to note that/gi, ''],
    [/^It is worth noting that/gi, ''],
    [/^Certainly[!,] /gi, ''],
    [/^Indeed[,] /gi, ''],
    [/^In today's rapidly evolving/gi, "In today's"],
    
    // Transitional phrases
    [/Moreover[,] /gi, 'Also, '],
    [/Furthermore[,] /gi, 'Plus, '],
    [/In conclusion[,] /gi, ''],
    [/To summarize[,] /gi, ''],
    
    // Overused descriptors
    [/delve into/gi, 'explore'],
    [/dive into/gi, 'look at'],
    [/landscape of/gi, ''],
    [/tapestry of/gi, ''],
    [/crucial/gi, 'important'],
    [/utilize/gi, 'use'],
    
    // Clean up double spaces
    [/  +/g, ' '],
    [/^\s+|\s+$/g, ''] // Trim
  ];
  
  let cleaned = text;
  replacements.forEach(([pattern, replacement]) => {
    cleaned = cleaned.replace(pattern, replacement);
  });
  
  // Fix sentence starts that might be lowercase after removal
  cleaned = cleaned.replace(/\. ([a-z])/g, (match, letter) => `. ${letter.toUpperCase()}`);
  cleaned = cleaned.replace(/^([a-z])/, (match, letter) => letter.toUpperCase());
  
  return cleaned;
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
      code: error.code || 'INTERNAL',
      env_check: {
        has_openai: !!Deno.env.get('OPENAI_API_KEY'),
        has_brave: !!Deno.env.get('BRAVE_SEARCH_API_KEY'),
        has_serper: !!Deno.env.get('SERPER_API_KEY'),
        has_supabase_url: !!Deno.env.get('SUPABASE_URL'),
        has_supabase_key: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      }
    });

    // Determine appropriate status code based on error type
    let statusCode = 500;
    if (error.code === 'CONFIG_ERROR' || error.code === 'MISSING_ENV') {
      statusCode = 503; // Service Unavailable for config issues
    } else if (error.code === 'NO_SOURCES' || error.code === 'INSUFFICIENT_SOURCES') {
      statusCode = 404; // Not Found for no content
    } else if (error.code === 'RATE_LIMIT') {
      statusCode = 429; // Too Many Requests
    } else if (error.code === 'TIMEOUT') {
      statusCode = 504; // Gateway Timeout
    }

    // Return structured error response
    return new Response(JSON.stringify({
      error: true,
      code: error.code || 'INTERNAL',
      message: error.message || 'Internal server error',
      details: error.details || null
    }), {
      status: statusCode,
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

  // Add performance timing
  const startTime = Date.now();

  // Check for required environment variables upfront
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');
  const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');

  // Log environment status for debugging
  console.log('Environment check:', {
    has_openai: !!OPENAI_API_KEY,
    has_brave: !!BRAVE_API_KEY,
    has_serper: !!SERPER_API_KEY,
    has_any_search: !!(BRAVE_API_KEY || SERPER_API_KEY)
  });

  if (!OPENAI_API_KEY) {
    const error = new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable in Supabase dashboard.');
    error.code = 'CONFIG_ERROR';
    throw error;
  }

  if (!BRAVE_API_KEY && !SERPER_API_KEY) {
    const error = new Error('No search API configured. Please set either BRAVE_SEARCH_API_KEY or SERPER_API_KEY environment variable in Supabase dashboard.');
    error.code = 'CONFIG_ERROR';
    throw error;
  }

  const { topic, targetOutlets, freshnessHorizonHours, includePhdAnalysis } = await req.json();

  // Check cache first - now with PhD preference
  const cachedData = await getCachedResult(topic, includePhdAnalysis || false);
  if (cachedData) {
    const cacheTime = Date.now() - startTime;
    console.log(`[CACHE] Served in ${cacheTime}ms`);

    // Return cached result in exact same format as fresh result
    return new Response(JSON.stringify({
      output: [{
        type: 'message',
        content: [{ text: JSON.stringify(cachedData) }]
      }]
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'x-cache-status': 'hit',
        'x-cache-variant': includePhdAnalysis ? 'phd' : 'standard',
        'x-cache-time': String(cacheTime)
      },
    });
  }

  console.log('Searching for real news about:', topic);

  // Enhance search query for better news results
  const searchQuery = (() => {
    const lowerTopic = topic.toLowerCase();
    // If already contains news-related terms, use as-is
    if (lowerTopic.includes('news') || lowerTopic.includes('latest') || lowerTopic.includes('update')) {
      return topic;
    }
    // Otherwise, add context for better news results
    return `${topic} latest news updates 2025`;
  })();

  // Step 1: Quick search (5s max) - fetch 5 for reliability
  let searchResults: SearchResult[] = [];
  
  try {
    // Try Brave Search first - fetch 5 for buffer
    searchResults = await searchBraveNews(searchQuery, 5);
    console.log(`Brave Search found ${searchResults.length} articles`);
  } catch (braveError) {
    console.error('Brave Search failed, trying Serper:', braveError);
    // Fallback to Serper if Brave fails
    try {
      searchResults = await searchSerperNews(searchQuery);
      console.log(`Serper Search found ${searchResults.length} articles`);
    } catch (serperError) {
      console.error('Both search APIs failed:', serperError);
    }
  }

  if (searchResults.length === 0) {
    // Try one more time with broader search
    console.log('No results found, trying broader search...');
    const broaderQuery = `${topic} news`;
    try {
      searchResults = await searchBraveNews(broaderQuery, 5);
    } catch (e) {
      console.error('Broader search also failed');
    }
    
    if (searchResults.length === 0) {
      const error = new Error(`No news articles found about "${topic}". Try:\n- More specific terms (e.g., "OpenAI GPT" instead of "AI")\n- Adding a company or location\n- Current events or trending topics`);
      error.code = 'NO_SOURCES';
      throw error;
    }
  }

  console.log(`Found ${searchResults.length} articles`);

  // Step 2: Work with whatever sources we have (1-5)
  const articlesContext = searchResults.slice(0, Math.min(searchResults.length, 5)).map((article, index) => 
    `[${index + 1}] ${article.title.substring(0, 80)} - ${article.source}`
  ).join('\n');

  // Add note if few sources
  const sourceLimitationNote = searchResults.length < 3 
    ? `\n\nNote: Limited to ${searchResults.length} recent source(s) for this topic.`
    : '';

  // Step 3: Enhanced system prompt with conditional PhD analysis
  const systemPrompt = `You are a skilled journalist writing for a modern digital publication. Your writing should be engaging, clear, and conversational - like The Verge, Axios, or Morning Brew.

Avoid these overused AI phrases:
- "It's important to note"
- "In conclusion" or "To summarize"
- "Dive into" or "Delve into"
- "Tapestry" or "Landscape"
- "Moreover" or "Furthermore"
- Starting every paragraph with transitional phrases

Instead, write with:
- Varied sentence structures (mix short punchy sentences with longer ones)
- Active voice and strong verbs
- Specific examples rather than vague statements
- Natural transitions that don't feel forced
- A conversational tone that feels human

Good example opening: "Apple just dropped a bombshell. The company announced..."
Bad example opening: "In a significant development in the technology sector, it has been reported that..."

Good transition: "But here's where it gets interesting."
Bad transition: "Furthermore, it is worth noting that..."

Good conclusion: "The real test will be whether users actually want this."
Bad conclusion: "In conclusion, this development represents a significant shift in..."

Synthesize these articles about "${topic}":

${articlesContext}${sourceLimitationNote}

Return this JSON structure (word counts are approximate targets, not rigid requirements):

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
    "base": "Around 300-400 words. Natural paragraph breaks where they make sense (typically 3-5 paragraphs). Don't force exact paragraph lengths - let the content flow naturally. Write like a human journalist would: start with a hook, provide context, explain why it matters, and end with implications. Vary your paragraph and sentence lengths. Some paragraphs might be just two sentences. Others might be five. Include citations [^1], [^2] where they support key claims, but don't overdo it. Make it feel like something you'd actually want to read, not a homework assignment.",
    
    "eli5": "About 60-100 words. Explain it simply, like you're talking to a curious kid. Use everyday language and relatable examples. Break it into bite-sized chunks if needed. Make it engaging without being condescending. Example style: 'You know how your phone needs charging? Well, this new battery is like having a super charger that...' Avoid: 'Let me explain this complex topic in simple terms...'",
    
    "phd": ${includePhdAnalysis 
      ? '"Approximately 500-700 words of scholarly analysis. Structure it naturally around key themes rather than forcing specific paragraph topics. Include: theoretical context, critical evaluation of sources, interdisciplinary connections, historical precedents, and implications. Write in an academic style but keep it readable - not unnecessarily dense. Mix complex analysis with clear explanations. Use citations throughout to support arguments."'
      : 'null'
    }
  },
  "keyQuestions": ["3 thought-provoking questions"],
  "sources": [],
  "missingSources": []
}

FORMAT GUIDELINES:
- Use natural paragraph breaks (\\n\\n) where the content flows best
- Don't force specific paragraph counts - let the structure emerge from the content
- Vary paragraph lengths for better readability

LENGTH GUIDELINES (approximate, prioritize quality over exact counts):
- Base: Standard news article length (300-400 words)
- ELI5: Brief and simple (60-100 words)
${includePhdAnalysis ? '- PhD: In-depth academic analysis (500-700 words)' : '- PhD: Not requested'}

STYLE REMINDERS:
- Write naturally, not robotically
- Vary sentence structures and lengths
- Use specific examples and concrete details
- Avoid overused transitional phrases
- Sound like a human wrote this, not an AI`;

  const userPrompt = `Create the JSON synthesis. Remember:
${includePhdAnalysis 
  ? '- Include a thorough PhD-level analysis that explores the topic deeply' 
  : '- Skip PhD analysis for faster processing'
}
- Use natural paragraph breaks where they make sense
- Write like a human journalist, not an AI assistant
- Vary your writing style and sentence structures
- Focus on engaging, informative content over rigid formatting`;

  console.log('Calling OpenAI to synthesize real articles...');

  // Fast OpenAI call with adjusted timeout and tokens based on PhD inclusion
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
        model: 'gpt-4o-mini', // Current model - fast & cost-effective
        // For better quality (but higher cost), you can test:
        // model: 'gpt-4-turbo',  // ~10x more expensive, better reasoning
        // model: 'gpt-4o',       // ~30x more expensive, best quality
        // model: 'claude-3-5-sonnet-20241022',  // Via Anthropic API (requires different setup)
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7, // Higher temperature for more natural variation
        max_tokens: includePhdAnalysis ? 4500 : 2500 // Reduce tokens when PhD is excluded
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

    // Use the REAL search results as sources - work with any number
    const validatedSources = searchResults.map((article, index) => ({
      id: `s${index + 1}`,
      outlet: article.source || new URL(article.url).hostname,
      type: determineOutletType(article.source || ''),
      url: article.url,
      headline: article.title,
      publishedAt: article.published || new Date().toISOString(),
      analysisNote: 'Real source included in synthesis'
    }));

    // Don't throw error for low source count - work with what we have
    console.log(`Successfully synthesized news with ${validatedSources.length} real sources`);

    // Post-process the articles to remove AI phrasings
    if (newsData.article) {
      if (newsData.article.base) {
        newsData.article.base = cleanAIPhrasings(newsData.article.base);
      }
      if (newsData.article.eli5) {
        newsData.article.eli5 = cleanAIPhrasings(newsData.article.eli5);
      }
      if (newsData.article.phd) {
        newsData.article.phd = cleanAIPhrasings(newsData.article.phd);
      }
    }
    
    // Clean headline too
    if (newsData.headline) {
      newsData.headline = cleanAIPhrasings(newsData.headline);
    }
    
    // Update newsData with real sources
    newsData.sources = validatedSources;
    newsData.generatedAtUTC = new Date().toISOString();

    // Cache result asynchronously - now with PhD preference
    cacheResult(topic, newsData, includePhdAnalysis || false).catch(console.error);

    return new Response(JSON.stringify({
      output: [{
        type: 'message',
        content: [{ text: JSON.stringify(newsData) }]
      }]
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'x-cache-status': 'miss',
        'x-cache-variant': includePhdAnalysis ? 'phd' : 'standard',
        'x-generation-time': String(Date.now() - startTime),
        'x-cache-key': generateCacheKey(topic, includePhdAnalysis || false),
        'x-news-count': String(validatedSources.length),
        'x-openai-tokens': String(data.usage?.total_tokens || 0),
        'x-model-used': 'gpt-4o-mini',
        'x-real-sources': 'true',
        'x-phd-included': String(includePhdAnalysis)
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
