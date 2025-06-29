
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
async function searchBraveNews(query: string, count: number = 6): Promise<SearchResult[]> {
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
      count: count.toString(), // Reduced from 10-15 to 6
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
    
    // Only return first 6 results for speed
    return data.results?.slice(0, 6).map((result: any) => ({
      title: result.title,
      url: result.url,
      description: result.description || '',
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
        num: 6, // Reduced from 10
        tbs: 'qdr:d2' // Last 2 days
      })
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.news?.slice(0, 6).map((item: any) => ({
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
    searchResults = await searchBraveNews(topic, 6);
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
  const articlesContext = searchResults.map((article, index) => 
    `[${index + 1}] ${article.title} - ${article.source} (${article.published?.split('T')[0]})`
  ).join('\n');

  // Step 3: Enhanced system prompt for properly scaled content
  const systemPrompt = `You are an expert news analyst. Synthesize these real articles about "${topic}":

${articlesContext}

Return this EXACT JSON structure with PROPERLY SCALED content for each reading level:

{
  "topic": "${topic}",
  "headline": "compelling headline max 80 chars",
  "generatedAtUTC": "${new Date().toISOString()}",
  "confidenceLevel": "High|Medium|Low",
  "topicHottness": "High|Medium|Low",
  "summaryPoints": ["3 detailed points, each 100-120 chars"],
  "sourceAnalysis": {
    "narrativeConsistency": {"score": 7, "label": "Consistent|Mixed|Conflicting"},
    "publicInterest": {"score": 7, "label": "Viral|Popular|Moderate|Niche"}
  },
  "disagreements": [],
  "article": {
    "base": "Write 400-500 words. Professional journalism style. Include context, key facts, implications, and multiple perspectives. Use [^1], [^2] citations throughout. Structure with clear paragraphs covering: what happened, why it matters, different viewpoints, and what's next.",
    
    "eli5": "Write 80-100 words. Explain like the reader is 5 years old. Use very simple words a child would understand. Short sentences. Make it fun and easy to grasp. No complex terms at all.",
    
    "middleSchool": "Write 150-200 words. 6th-8th grade reading level. Explain basic concepts clearly. Use everyday vocabulary. Include the main facts and why this matters. Simple paragraph structure.",
    
    "highSchool": "Write 250-300 words. 9th-12th grade level. Include more context and background. Explain any technical terms simply. Discuss cause and effect. Multiple paragraphs with clear topic sentences.",
    
    "undergrad": "Write 600-800 words. College-level analysis. Discuss theoretical frameworks, historical context, stakeholder perspectives, and policy implications. Use academic vocabulary appropriately. Include [^1], [^2] citations. Structure: introduction, background, analysis, implications, conclusion.",
    
    "phd": "Write 1200-1500 words. Graduate-level critical analysis. Deep dive into methodological considerations, theoretical underpinnings, competing paradigms, epistemic frameworks, and second-order effects. Synthesize interdisciplinary perspectives. Extensive use of [^1], [^2] citations. Structure: abstract, introduction, literature context, multi-faceted analysis, critical evaluation, theoretical implications, methodological considerations, future research directions, conclusion."
  },
  "keyQuestions": ["3 thought-provoking questions based on the analysis"],
  "sources": [],
  "missingSources": []
}

CRITICAL REQUIREMENTS:
1. Each reading level MUST be distinctly different in length, vocabulary, and complexity
2. PhD must be 15-20x longer than ELI5
3. Use appropriate vocabulary for each level:
   - ELI5: Only simple words (cat, run, big, happy)
   - Middle School: Common vocabulary, no jargon
   - High School: Some advanced vocabulary with explanations
   - Undergrad: Academic vocabulary, discipline-specific terms
   - PhD: Highly technical, theoretical frameworks, scholarly discourse
4. Adjust sentence structure:
   - ELI5: Very short sentences. 5-8 words.
   - Middle School: Simple sentences, 10-15 words
   - High School: Some complex sentences, 15-20 words
   - Undergrad: Complex sentences with subordinate clauses
   - PhD: Sophisticated syntax, dense academic prose
5. Scale the analytical depth exponentially

EXAMPLE OF PROPER SCALING:
- ELI5 (80-100 words): "Something big happened with a company. A big bank said the company isn't growing fast anymore..."
- Middle School (150-200 words): "Goldman Sachs, one of the largest investment banks, recently downgraded AllianceBernstein stock..."
- High School (250-300 words): "In a significant move that reflects changing market dynamics, Goldman Sachs has downgraded..."
- Undergrad (600-800 words): "The recent downgrade of AllianceBernstein by Goldman Sachs represents a crucial inflection point in institutional analysis of asset management firms..."
- PhD (1200-1500 words): "The epistemological implications of Goldman Sachs' analytical framework in downgrading AllianceBernstein necessitate a critical examination of the hermeneutics of financial evaluation..."`;

  const userPrompt = `Create the comprehensive JSON synthesis with properly scaled content for each reading level. Ensure PhD is at least 1200 words and ELI5 is exactly 80-100 words.`;

  console.log('Calling OpenAI to synthesize real articles...');

  // Fast OpenAI call with increased timeout for longer content
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased from 10s to 15s
  
  try {
    // Call OpenAI with GPT-4 for better quality long-form content
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview', // Use GPT-4 for better quality long-form content
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7, // Slightly higher for more natural writing
        max_tokens: 4000 // Increased from 1500 to accommodate longer content
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
        'x-model-used': 'gpt-4-turbo-preview',
        'x-real-sources': 'true'
      },
    });

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Request took too long. Try a simpler search term.');
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
