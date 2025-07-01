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

  // Step 2: Work with whatever sources we have (1-5)
  const articlesContext = searchResults.slice(0, Math.min(searchResults.length, 5)).map((article, index) => 
    `[${index + 1}] ${article.title.substring(0, 80)} - ${article.source}`
  ).join('\n');

  // Add note if few sources
  const sourceLimitationNote = searchResults.length < 3 
    ? `\n\nNote: Limited to ${searchResults.length} recent source(s) for this topic.`
    : '';

  // Step 3: Enhanced system prompt with conditional PhD analysis
  const systemPrompt = `You are an expert news analyst with a mandate for ABSOLUTE FACTUAL ACCURACY. Your role is to synthesize real news articles with zero hallucination, extracting and citing specific quantifiable data.

CORE PRINCIPLES:
1. NEVER invent facts, statistics, or quotes
2. ALWAYS cite the exact source [^1-5] for every claim
3. EXTRACT specific numbers, dates, percentages, and metrics from sources
4. If data conflicts between sources, explicitly note the disagreement
5. If information is missing, state "not specified in sources" rather than guessing

Synthesize these real articles about "${topic}":
${articlesContext}${sourceLimitationNote}

CRITICAL REQUIREMENTS:

1. QUANTIFIABLE DATA EXTRACTION:
   - Pull EXACT numbers, dates, statistics from sources
   - Include: percentages, dollar amounts, timeframes, rankings, scores
   - Format: "X% increase [^2]" or "$Y million deal [^3]"
   - If sources disagree on numbers, list all versions with citations

2. SOURCE VERIFICATION:
   - Every factual claim MUST have [^N] citation
   - Use [^1,3] for facts from multiple sources
   - For conflicting data: "Source 1 reports X [^1] while Source 3 claims Y [^3]"
   - Never blend sources into unsourced generalizations

3. DISAGREEMENT DETECTION:
   - Actively identify conflicting information between sources
   - Document in "disagreements" array with specific citations
   - Include: different numbers, conflicting timelines, opposing claims

Return this EXACT JSON structure:

{
  "topic": "${topic}",
  "headline": "compelling headline max 80 chars - include a key metric if available",
  "generatedAtUTC": "${new Date().toISOString()}",
  "confidenceLevel": "High|Medium|Low", // Based on source agreement and data quality
  "topicHottness": "High|Medium|Low", // Based on recency and source volume
  "summaryPoints": [
    "Key point with specific metric/number when available [^N] (80-100 chars)",
    "Second point with quantifiable detail or timeline [^N] (80-100 chars)", 
    "Third point with concrete fact from sources [^N] (80-100 chars)"
  ],
  "sourceAnalysis": {
    "narrativeConsistency": {
      "score": 1-10, // Higher = more agreement between sources
      "label": "Consistent|Mixed|Conflicting"
    },
    "publicInterest": {
      "score": 1-10, // Based on source prominence and topic spread
      "label": "Viral|Popular|Moderate|Niche"
    }
  },
  "disagreements": [
    // Include ALL factual disagreements found
    {
      "pointOfContention": "Specific metric or claim that differs",
      "details": "Source X says A [^1] while Source Y says B [^3]",
      "likelyReason": "Different reporting dates|Methodology|Perspective|Error"
    }
  ],
  "article": {
    "base": "EXACTLY 300-350 words in 3-4 paragraphs separated by \\n\\n. 
    REQUIREMENTS:
    - First paragraph: Lead with most important quantifiable finding [^N]
    - Include AT LEAST 5 specific data points with citations throughout
    - Every paragraph must contain cited facts, not general commentary
    - Format: 'According to [source], [specific fact] [^N]'
    - Final paragraph: Implications based on cited data, not speculation
    - NEVER write 'sources say' without specific citation
    - NEVER combine information without noting which source provided what",
    
    "eli5": "EXACTLY 60-80 words in 2-3 short paragraphs separated by \\n\\n.
    - Use the biggest number or most important fact from sources [^N]
    - Keep citations but explain simply
    - Example: 'The report says 100 people [^1]' not just 'Many people'",
    
    "phd": ${includePhdAnalysis 
      ? '"MINIMUM 500 words, TARGET 600-700 words in 6-8 paragraphs separated by \\n\\n.
      REQUIREMENTS FOR EACH PARAGRAPH:
      1. Theoretical Framework: Cite specific methodologies mentioned [^N]
      2. Quantitative Analysis: Extract ALL numbers, statistics, metrics with citations
      3. Source Methodology: Detail how each source gathered their data [^N]
      4. Statistical Significance: Analyze data reliability and sample sizes if mentioned
      5. Comparative Analysis: Compare specific metrics between sources [^1] vs [^3]
      6. Temporal Analysis: Track how numbers/claims evolved across sources
      7. Limitations: Note what data is missing or unverified
      8. Research Implications: Based strictly on cited evidence [^N]
      
      CRITICAL: PhD section must include:
      - Every quantifiable detail from all sources
      - Methodological notes about data collection when mentioned
      - Statistical confidence levels if provided
      - Explicit comparison of conflicting data points
      - NO speculation beyond what sources explicitly state"'
      : 'null'
    }
  },
  "keyQuestions": [
    "Question highlighting a specific data gap or contradiction in sources",
    "Question about methodology or reliability of key metrics cited",
    "Question exploring implications of the quantified findings"
  ],
  "sources": [], // Will be populated with real sources
  "missingSources": [] // Note outlets that might have additional data
}

PROHIBITED ACTIONS:
- Adding information not explicitly in sources
- Averaging or estimating between conflicting numbers
- Using phrases like "approximately" without source support
- Creating trends not explicitly stated in sources
- Inferring causation without source attribution
- Using "experts say" without specific source citation

REQUIRED ACTIONS:
- Count and cite: "All 5 sources agree [^1,2,3,4,5]" or "3 of 5 sources report [^1,3,4]"
- Highlight gaps: "None of the sources specify [metric]"
- Question reliability: Note if sources lack methodology details
- Preserve ambiguity: If sources are vague, maintain that vagueness`;

  const userPrompt = `Create the JSON synthesis. CRITICAL: 
${includePhdAnalysis 
  ? '- The PhD analysis MUST be at least 500 words with 6-8 clear paragraphs' 
  : '- Skip PhD analysis for faster processing'
}
- ALL articles must have proper paragraph breaks using \\n\\n between paragraphs
- Never return articles as single blocks of text
- Each paragraph should cover a distinct aspect or idea`;

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
