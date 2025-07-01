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
async function getCachedResult(topic: string): Promise<any | null> {
  try {
    const cacheKey = topic.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('news_cache')
      .select('news_data')
      .eq('cache_key', cacheKey)
      .gte('created_at', twoHoursAgo)
      .single();
    
    if (error || !data) return null;
    
    console.log(`Cache HIT for: ${topic}`);
    return data.news_data;
  } catch (e) {
    console.error('Cache read error:', e);
    return null;
  }
}

async function cacheResult(topic: string, newsData: any): Promise<void> {
  try {
    const cacheKey = topic.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');
    
    await supabase
      .from('news_cache')
      .upsert({
        cache_key: cacheKey,
        topic: topic,
        news_data: newsData
      }, {
        onConflict: 'cache_key'
      });
      
    console.log(`Cached result for: ${topic}`);
  } catch (e) {
    console.error('Cache write error:', e);
    // Don't throw - caching is optional
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

// Add helper function for source diversity checking
function checkSourceDiversity(articles: SearchResult[]): string {
  // Simple check - if all sources are from similar domains or titles are very similar
  const domains = articles.map(a => new URL(a.url).hostname);
  const uniqueDomains = new Set(domains);
  
  if (uniqueDomains.size < 3) {
    return "Limited source diversity - consider alternative viewpoints";
  }
  return "";
}

async function handleRequest(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { topic, targetOutlets, freshnessHorizonHours, includePhdAnalysis } = await req.json();
  
  // Check cache first
  const cachedData = await getCachedResult(topic);
  if (cachedData) {
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
        'x-cache-status': 'hit' // Optional header for monitoring
      },
    });
  }
  
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  if (!OPENAI_API_KEY) {
    const error = new Error('OpenAI API key not configured');
    error.code = 'CONFIG_ERROR';
    throw error;
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

  // Use the diversity checker when building context
  const diversityNote = checkSourceDiversity(searchResults);
  const articlesContext = searchResults.slice(0, Math.min(searchResults.length, 5)).map((article, index) => 
    `[${index + 1}] ${article.title.substring(0, 80)} - ${article.source}`
  ).join('\n') + (diversityNote ? `\n\nNote: ${diversityNote}` : '');

  // Add note if few sources
  const sourceLimitationNote = searchResults.length < 3 
    ? `\n\nNote: Limited to ${searchResults.length} recent source(s) for this topic.`
    : '';

  // Enhanced system prompt with comprehensive bias reduction
  const systemPrompt = `You are an expert news analyst trained to detect bias and extract facts. Your job is to create a substantive, bias-aware synthesis of real news articles.

SOURCES PROVIDED:
${articlesContext}${sourceLimitationNote}

CORE PRINCIPLES:
1. FACTS FIRST: Prioritize verifiable facts over interpretations
2. ATTRIBUTE EVERYTHING: Always say which source reported what
3. EXPOSE BIAS: When sources agree too much, that's suspicious - note it
4. NO FLUFF: Every sentence must convey specific information
5. ACKNOWLEDGE GAPS: What perspectives or facts are missing?

BIAS REDUCTION REQUIREMENTS:
- Use neutral attribution: "X reports", "According to Y", "Z claims" (never state disputed facts as absolute truth)
- If all sources lean one political direction, explicitly note this in summaryPoints
- When sources use emotional language, translate to neutral factual language
- Identify at least 2 disagreements (even subtle ones like emphasis or missing context)
- Include what questions a skeptical reader would ask

Return this EXACT JSON structure:

{
  "topic": "${topic}",
  "headline": "Factual headline max 80 chars - focus on WHAT HAPPENED, not opinions about it. Avoid adjectives like 'controversial', 'stunning', 'slammed'",
  "generatedAtUTC": "${new Date().toISOString()}",
  "confidenceLevel": "High (4+ diverse sources) | Medium (2-3 sources or limited diversity) | Low (1-2 sources or all similar perspectives)",
  "topicHottness": "High (major breaking news) | Medium (ongoing story) | Low (routine update)",
  "summaryPoints": [
    "FACT with source: 'Reuters reports X happened on [date]' (80-100 chars)",
    "DIFFERENT FACT: 'CNN and Fox disagree on Y: CNN says A, Fox says B' (80-100 chars)", 
    "CONTEXT or MISSING INFO: 'No sources addressed Z aspect' or 'All sources are US-based' (80-100 chars)"
  ],
  "sourceAnalysis": {
    "narrativeConsistency": {
      "score": "1-10 where 10 = suspicious uniformity, 5 = healthy disagreement, 1 = total contradiction",
      "label": "Uniform (concerning) | Mixed (healthy) | Conflicting (confusing)"
    },
    "publicInterest": {
      "score": "1-10 based on actual impact, not media hype",
      "label": "Viral|Popular|Moderate|Niche"
    }
  },
  "disagreements": [
    {
      "pointOfContention": "Be specific - numbers, dates, cause, impact, or framing",
      "details": "Source A says X happened because Y. Source B says X happened because Z. Source C doesn't mention Y or Z at all.",
      "likelyReason": "Political bias | Information gap | Timing of report | Editorial focus"
    }
  ],
  "article": {
    "base": "300-350 words in 3-4 paragraphs (\\n\\n between each). 
    
    PARAGRAPH 1 (75-100 words): Core facts - WHO did WHAT, WHEN, WHERE. Use 'According to [source]' for any disputed facts. No adjectives or editorializing.
    
    PARAGRAPH 2 (75-100 words): Key details and context. 'Reuters reports [specific detail].' 'However, CNN notes [conflicting detail].' Include numbers, dates, quotes.
    
    PARAGRAPH 3 (75-100 words): Different perspectives. 'Conservative outlets emphasize X while progressive outlets focus on Y.' What each side highlights or ignores.
    
    PARAGRAPH 4 (50-75 words): What's unclear or missing. 'None of the sources addressed [important question].' Future implications based on facts, not speculation.
    
    Use [^1], [^2] citations. Every claim needs a source.",
    
    "eli5": "60-80 words in 2-3 short paragraphs (\\n\\n between).
    
    PARAGRAPH 1: What happened in simplest terms. 'Something happened today. Different news channels disagree about why.'
    
    PARAGRAPH 2: Why it matters to a 5-year-old. Use concrete comparisons.
    
    PARAGRAPH 3 (optional): What we don't know yet.",
    
    "phd": ${includePhdAnalysis 
      ? '"600-700 words in 6-8 paragraphs (\\n\\n between). PARAGRAPH 1: Epistemological challenges in synthesizing conflicting narratives. PARAGRAPH 2: Media ecology analysis - source selection biases and their implications. PARAGRAPH 3: Discursive frameworks employed by different ideological positions. PARAGRAPH 4: Quantitative claims analysis and methodological critique. PARAGRAPH 5: Historical contextualization and path dependencies. PARAGRAPH 6: Systemic factors and institutional influences. PARAGRAPH 7: Information gaps and research limitations. PARAGRAPH 8: Theoretical implications and future research directions. Heavy use of field-specific terminology and citations [^1][^2][^3]."'
      : 'null'
    }
  },
  "keyQuestions": [
    "Specific factual question that sources disagree on",
    "Question about missing context or perspective",
    "Forward-looking question based on the facts presented"
  ],
  "sources": [],
  "missingSources": ["Major outlets or perspectives not represented"]
}

QUALITY CHECKS before returning:
1. Did I attribute every non-obvious claim to a specific source?
2. Did I identify real disagreements (not just create fake ones)?
3. Is my headline purely factual without emotional language?
4. Did I note if all sources share similar political lean?
5. Did I avoid fluff words like "significant", "controversial", "notable" without specifics?
6. Would a skeptical reader find this substantive or vague?

COMMON MISTAKES TO AVOID:
- "Sources say" → WHO specifically said it?
- "Recently" → WHEN exactly?
- "Many people" → HOW MANY according to which source?
- "Controversial" → Says WHO? Just report what happened
- Missing disagreements → Look harder - they disagree on emphasis even if not facts
- Accepting frame of reference → If all sources assume X, question X`;

  const userPrompt = `Create the JSON synthesis. CRITICAL: 
${includePhdAnalysis 
  ? '- The PhD analysis MUST be at least 600 words with 6-8 clear paragraphs' 
  : '- Skip PhD analysis for faster processing'
}
- ALL articles must have proper paragraph breaks using \\n\\n between paragraphs
- Never return articles as single blocks of text
- Each paragraph should cover a distinct aspect or idea
- Attribute every claim to specific sources
- Identify real disagreements between sources
- Use factual headlines without emotional language`;

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
        model: 'gpt-4o-mini', // Fast, cheap, and capable
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5, // Keep optimized temperature
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

    // Update newsData with real sources
    newsData.sources = validatedSources;
    newsData.generatedAtUTC = new Date().toISOString();

    // Cache result asynchronously - don't await
    cacheResult(topic, newsData).catch(console.error);

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
        'x-real-sources': 'true',
        'x-phd-included': String(includePhdAnalysis),
        'x-cache-status': 'miss'
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
