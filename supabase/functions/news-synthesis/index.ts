import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'x-error-code, x-news-count, x-claude-tokens-input, x-claude-tokens-output',
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

async function handleStreamingRequest(
  req: Request,
  params: {
    topic: string;
    targetOutlets: any;
    freshnessHorizonHours?: number;
    includePhdAnalysis?: boolean;
    ANTHROPIC_API_KEY: string;
    BRAVE_API_KEY?: string;
    SERPER_API_KEY?: string;
    startTime: number;
  }
): Promise<Response> {
  const { topic, includePhdAnalysis, ANTHROPIC_API_KEY, BRAVE_API_KEY, SERPER_API_KEY } = params;

  console.log('Starting streaming synthesis for:', topic);

  // Enhance search query
  const searchQuery = (() => {
    const lowerTopic = topic.toLowerCase();
    if (lowerTopic.includes('news') || lowerTopic.includes('latest') || lowerTopic.includes('update')) {
      return topic;
    }
    return `${topic} latest news updates 2025`;
  })();

  // Search for articles
  let searchResults: SearchResult[] = [];
  try {
    searchResults = await searchBraveNews(searchQuery, 5);
    console.log(`Brave Search found ${searchResults.length} articles`);
  } catch (braveError) {
    console.error('Brave Search failed, trying Serper:', braveError);
    try {
      searchResults = await searchSerperNews(searchQuery);
      console.log(`Serper Search found ${searchResults.length} articles`);
    } catch (serperError) {
      console.error('Both search APIs failed:', serperError);
    }
  }

  if (searchResults.length === 0) {
    const error = new Error(`No news articles found about "${topic}"`);
    error.code = 'NO_SOURCES';
    throw error;
  }

  console.log(`Found ${searchResults.length} articles for streaming`);

  const articlesContext = searchResults.slice(0, 5).map((article, index) =>
    `[${index + 1}] ${article.title.substring(0, 80)} - ${article.source}`
  ).join('\n');

  const sourceLimitationNote = searchResults.length < 3
    ? `\n\nNote: Limited to ${searchResults.length} recent source(s) for this topic.`
    : '';

  const systemPrompt = `You are a skilled journalist writing for a modern digital publication. Your writing should be engaging, clear, and sophisticated - like The Atlantic, Reuters, or The Economist.

Synthesize these articles about "${topic}":

${articlesContext}${sourceLimitationNote}

Return this JSON structure:

{
  "topic": "${topic}",
  "headline": "compelling headline max 80 chars",
  "generatedAtUTC": "${new Date().toISOString()}",
  "confidenceLevel": "High|Medium|Low",
  "topicHottness": "High|Medium|Low",
  "summaryPoints": [
    // Generate 3-5 SUBSTANTIAL bullet points (150-280 chars each)
    // Each bullet MUST pack multiple interconnected facts, context, and significance
    // Structure: [Bold topic label]: [Primary fact with specifics] + [contextual background/details] + [secondary related fact] + [implications or contrasting element]—[additional nuance or connection]
    //
    // ❌ ABSOLUTELY FORBIDDEN - NEVER DO THESE:
    // - "The investment carries particular strategic weight." (VAGUE - no specifics!)
    // - "Meanwhile, the interconnections are becoming more pronounced." (GENERIC - what interconnections? how?)
    // - "This development has significant implications." (MEANINGLESS - what implications? for whom?)
    // - "The announcement represents a major shift." (EMPTY - what shift? from what to what?)
    // - "Industry observers are closely watching." (FILLER - who? watching what specifically?)
    // - "The situation continues to evolve." (USELESS - how is it evolving? what changed?)
    // - "2 million concurrent viewers." (INCOMPLETE FRAGMENT - viewers of what? when? why does it matter?)
    // - "The copper golem represents a significant mechanical addition." (VAGUE - what does it DO? what mechanics? why significant?)
    // - "This update arrives through a fragmented release strategy that highlights Minecraft's ongoing platform challenges." (JARGON WITHOUT EXPLANATION - what IS the fragmented strategy? which platforms? what challenges specifically?)
    // These are vague article-style topic/transition sentences with ZERO concrete information. They would be followed by details in an article, but in bullets YOU MUST INCLUDE THE DETAILS IMMEDIATELY.
    //
    // ✅ CORRECT EXAMPLES (dense, multi-layered with SPECIFIC details):
    // - "**Hardware partnership**: Nvidia's equity stake includes major GPU supply agreement securing xAI's access to H100 chips—the industry's scarcest resource trading at $30K+ per unit—mirroring Nvidia's strategy of investing in its own customers to create a self-reinforcing ecosystem profiting from both $40B+ hardware sales and equity appreciation in AI startups valued at $200B+ collectively[1][2]"
    // - "**Cross-company synergies**: SpaceX and xAI jointly purchasing 500+ unsold Tesla Cybertrucks (inventory valued at $45M[3]) to simultaneously solve Tesla's Q4 delivery targets while providing xAI transport infrastructure—raising shareholder concerns about whether such financial entanglements between Musk's $800B combined corporate empire ultimately benefit or disadvantage investors across the portfolio given Tesla's 15% stock decline[1][4]"
    // - "**Workforce restructuring**: xAI laid off 300-400 employees[2] specifically tasked with training Dino (the ChatGPT competitor) despite completing $20B funding round[1]—suggesting pivot toward automated training methods or outsourced data annotation to reduce $50M+ annual labor costs while scaling operations 10x faster than manual approaches allow"
    //
    // 🎯 MANDATORY REQUIREMENTS (FAILURE = REJECTION):
    // 1. Start with **bold label** in double asterisks (e.g., **Policy shift**, **Technical breakthrough**)
    // 2. EVERY bullet MUST contain AT LEAST 3 specific pieces of concrete data:
    //    - Numbers (dollars, percentages, quantities, dates, timeframes)
    //    - Names (people, companies, products, locations)
    //    - Concrete actions (what specifically happened, not "things are changing")
    // 3. Connect 3-4 related facts using em dashes (—), semicolons, or parenthetical details
    // 4. Show WHY it matters with specific consequences/implications
    // 5. Use information-dense phrasing: "securing $20B funding—4x their previous round" NOT "they secured significant funding"
    // 6. NEVER write vague statements that could apply to any story
    // 7. NEVER write topic/transition sentences without immediate supporting details
    // 8. Pack context + implications together: "policy shift from voluntary to mandatory compliance—driven by EU's $50M fine threat"
    // 9. CITATIONS - CRITICAL: After EVERY specific fact, statistic, or claim, add [N] where N is the source number (1, 2, 3, etc.)
    //    - Place citation IMMEDIATELY after the fact, before any punctuation
    //    - Example: "Tesla's revenue reached $100B[2] in Q4—representing 40% growth[2]"
    //    - Use multiple sources if applicable: "Revenue increased 40%[1][3] despite market challenges[2]"
    //    - EVERY bullet MUST have multiple citations since each contains multiple facts
    //    - Citations make facts verifiable and professional—NEVER skip them
    //
    // 💡 QUALITY TEST: Read each bullet and ask "If I removed the topic label, would someone know EXACTLY what happened?" If not, ADD MORE SPECIFICS.
  ],
  "sourceAnalysis": {
    "narrativeConsistency": {"score": 7, "label": "Consistent|Mixed|Conflicting"},
    "publicInterest": {"score": 7, "label": "Viral|Popular|Moderate|Niche"}
  },
  "disagreements": [],
  "article": {
    "base": "Around 300-400 words with natural paragraph breaks. IMPORTANT: Include citations [1], [2], etc. after every specific fact or statistic to indicate which source provided that information. Place citations before periods: 'The company reported $50B revenue[2].' Multiple sources: 'Growth exceeded 40%[1][3].'",
    "eli5": "About 60-100 words in simple language. Include citations [1], [2] after key facts.",
    "phd": ${includePhdAnalysis ? '"500-700 words of scholarly analysis. Use extensive citations [1], [2], [3] throughout to support all claims and arguments."' : 'null'}
  },
  "keyQuestions": [
    {"question": "Thought-provoking question", "category": "Critical Thinking|Future Impact|Ethical Implications|Historical Context|Systemic Analysis|Personal Reflection"}
  ],
  "sources": [],
  "missingSources": []
}`;

  const userPrompt = `Create the JSON synthesis. Write naturally and engagingly.${includePhdAnalysis ? ' Include PhD analysis.' : ''}`;

  // Create streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Call Claude's streaming API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: includePhdAnalysis ? 5000 : 4500,
            temperature: 0.7,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
            stream: true  // Enable streaming
          })
        });

        if (!response.ok) {
          throw new Error(`Claude API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedJSON = ''; // Accumulate complete JSON response
        let lastSentLength = 0; // Track how much article content we've already sent

        // Send metadata first (sources)
        const validatedSources = searchResults.map((article, index) => ({
          id: `s${index + 1}`,
          outlet: article.source || new URL(article.url).hostname,
          type: determineOutletType(article.source || ''),
          url: article.url,
          headline: article.title,
          publishedAt: article.published || new Date().toISOString(),
          analysisNote: 'Real source included in synthesis'
        }));

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'sources',
          data: validatedSources
        })}\n\n`));

        // Helper function to extract article text from partial JSON
        // This version works with INCOMPLETE JSON strings for progressive streaming
        const extractArticleText = (jsonText: string): string => {
          try {
            // Find "base" field
            const baseIdx = jsonText.indexOf('"base"');
            if (baseIdx === -1) return '';

            // Find the opening quote of the value
            const colonIdx = jsonText.indexOf(':', baseIdx);
            if (colonIdx === -1) return '';

            const quoteIdx = jsonText.indexOf('"', colonIdx);
            if (quoteIdx === -1) return '';

            // Extract character-by-character from after opening quote
            let result = '';
            let i = quoteIdx + 1;

            while (i < jsonText.length) {
              if (jsonText[i] === '\\' && i + 1 < jsonText.length) {
                // Handle escape sequences
                const nextChar = jsonText[i + 1];
                if (nextChar === 'n') result += '\n';
                else if (nextChar === '"') result += '"';
                else if (nextChar === '\\') result += '\\';
                else if (nextChar === 't') result += '\t';
                else result += nextChar;
                i += 2; // Skip both backslash and escaped character
              } else if (jsonText[i] === '"') {
                // Reached closing quote - field is complete
                break;
              } else {
                // Regular character - add it
                result += jsonText[i];
                i++;
              }
            }

            return result;
          } catch (e) {
            // Parsing failed, return empty
            return '';
          }
        };

        // Process the streaming response
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);

                // Handle different event types from Claude
                if (parsed.type === 'content_block_delta') {
                  const text = parsed.delta?.text;
                  if (text) {
                    // Accumulate JSON for extraction
                    accumulatedJSON += text;

                    // Try to extract readable article content
                    const currentArticleText = extractArticleText(accumulatedJSON);

                    // Send only NEW content (what we haven't sent yet)
                    if (currentArticleText.length > lastSentLength) {
                      const newContent = currentArticleText.substring(lastSentLength);
                      lastSentLength = currentArticleText.length;

                      // Forward readable text chunks to client
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        type: 'article_text',
                        data: newContent
                      })}\n\n`));
                    }
                  }
                }
              } catch (e) {
                console.error('Failed to parse streaming data:', e);
              }
            }
          }
        }

        // Parse the accumulated JSON and send complete NewsData structure
        console.log('[STREAMING] Parsing accumulated JSON, length:', accumulatedJSON.length);

        try {
          const newsData = safeJsonParse(accumulatedJSON);

          // Add real sources to the parsed data
          newsData.sources = validatedSources;
          newsData.generatedAtUTC = new Date().toISOString();

          // Optional: Clean AI phrasings for consistency
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
          if (newsData.headline) {
            newsData.headline = cleanAIPhrasings(newsData.headline);
          }

          // Send completion event with complete NewsData
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            data: newsData
          })}\n\n`));

          console.log('[STREAMING] Successfully sent complete NewsData');
        } catch (parseError) {
          console.error('[STREAMING] Failed to parse accumulated JSON:', parseError);
          // Send error instead of incomplete done event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: 'Failed to parse complete article data'
          })}\n\n`));
        }

        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          error: error.message
        })}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
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
        has_anthropic: !!Deno.env.get('ANTHROPIC_API_KEY'),
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

  // Check if streaming is requested via URL parameter
  const url = new URL(req.url);
  const enableStreaming = url.searchParams.get('stream') === 'true';

  // Add performance timing
  const startTime = Date.now();

  // Check for required environment variables upfront
  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
  const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');
  const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');

  // Log environment status for debugging
  console.log('Environment check:', {
    has_anthropic: !!ANTHROPIC_API_KEY,
    has_brave: !!BRAVE_API_KEY,
    has_serper: !!SERPER_API_KEY,
    has_any_search: !!(BRAVE_API_KEY || SERPER_API_KEY),
    streaming_enabled: enableStreaming
  });

  if (!ANTHROPIC_API_KEY) {
    const error = new Error('Anthropic API key not configured. Please set ANTHROPIC_API_KEY environment variable in Supabase dashboard.');
    error.code = 'CONFIG_ERROR';
    throw error;
  }

  if (!BRAVE_API_KEY && !SERPER_API_KEY) {
    const error = new Error('No search API configured. Please set either BRAVE_SEARCH_API_KEY or SERPER_API_KEY environment variable in Supabase dashboard.');
    error.code = 'CONFIG_ERROR';
    throw error;
  }

  const { topic, targetOutlets, freshnessHorizonHours, includePhdAnalysis } = await req.json();

  // If streaming is enabled, use streaming handler
  if (enableStreaming) {
    return handleStreamingRequest(req, {
      topic,
      targetOutlets,
      freshnessHorizonHours,
      includePhdAnalysis,
      ANTHROPIC_API_KEY,
      BRAVE_API_KEY,
      SERPER_API_KEY,
      startTime
    });
  }

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
  const systemPrompt = `You are a skilled journalist writing for a modern digital publication. Your writing should be engaging, clear, and sophisticated - like The Atlantic, Reuters, or The Economist.

Avoid these overused AI phrases:
- "It's important to note"
- "In conclusion" or "To summarize"
- "Dive into" or "Delve into"
- "Tapestry" or "Landscape"
- "Moreover" or "Furthermore"
- Starting every paragraph with transitional phrases

Instead, write with:
- Varied sentence structures (mix concise statements with longer, analytical sentences)
- Active voice and strong verbs
- Specific examples rather than vague statements
- Natural transitions that don't feel forced
- Sophisticated yet accessible language - use precise vocabulary without being pretentious
- A tone that respects the reader's intelligence

Good example opening: "Apple announced a significant shift in its approach to AI. The company revealed..."
Bad example opening: "In a significant development in the technology sector, it has been reported that..."

Good transition: "The implications extend beyond the immediate announcement."
Bad transition: "Furthermore, it is worth noting that..."

Good conclusion: "The real test will be whether this approach addresses the underlying concerns about data privacy and user control."
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
  "summaryPoints": [
    // Generate 3-5 SUBSTANTIAL bullet points (150-280 chars each)
    // Each bullet MUST pack multiple interconnected facts, context, and significance
    // Structure: [Bold topic label]: [Primary fact with specifics] + [contextual background/details] + [secondary related fact] + [implications or contrasting element]—[additional nuance or connection]
    //
    // ❌ ABSOLUTELY FORBIDDEN - NEVER DO THESE:
    // - "The investment carries particular strategic weight." (VAGUE - no specifics!)
    // - "Meanwhile, the interconnections are becoming more pronounced." (GENERIC - what interconnections? how?)
    // - "This development has significant implications." (MEANINGLESS - what implications? for whom?)
    // - "The announcement represents a major shift." (EMPTY - what shift? from what to what?)
    // - "Industry observers are closely watching." (FILLER - who? watching what specifically?)
    // - "The situation continues to evolve." (USELESS - how is it evolving? what changed?)
    // - "2 million concurrent viewers." (INCOMPLETE FRAGMENT - viewers of what? when? why does it matter?)
    // - "The copper golem represents a significant mechanical addition." (VAGUE - what does it DO? what mechanics? why significant?)
    // - "This update arrives through a fragmented release strategy that highlights Minecraft's ongoing platform challenges." (JARGON WITHOUT EXPLANATION - what IS the fragmented strategy? which platforms? what challenges specifically?)
    // These are vague article-style topic/transition sentences with ZERO concrete information. They would be followed by details in an article, but in bullets YOU MUST INCLUDE THE DETAILS IMMEDIATELY.
    //
    // ✅ CORRECT EXAMPLES (dense, multi-layered with SPECIFIC details):
    // - "**Hardware partnership**: Nvidia's equity stake includes major GPU supply agreement securing xAI's access to H100 chips—the industry's scarcest resource trading at $30K+ per unit—mirroring Nvidia's strategy of investing in its own customers to create a self-reinforcing ecosystem profiting from both $40B+ hardware sales and equity appreciation in AI startups valued at $200B+ collectively[1][2]"
    // - "**Cross-company synergies**: SpaceX and xAI jointly purchasing 500+ unsold Tesla Cybertrucks (inventory valued at $45M[3]) to simultaneously solve Tesla's Q4 delivery targets while providing xAI transport infrastructure—raising shareholder concerns about whether such financial entanglements between Musk's $800B combined corporate empire ultimately benefit or disadvantage investors across the portfolio given Tesla's 15% stock decline[1][4]"
    // - "**Workforce restructuring**: xAI laid off 300-400 employees[2] specifically tasked with training Dino (the ChatGPT competitor) despite completing $20B funding round[1]—suggesting pivot toward automated training methods or outsourced data annotation to reduce $50M+ annual labor costs while scaling operations 10x faster than manual approaches allow"
    //
    // 🎯 MANDATORY REQUIREMENTS (FAILURE = REJECTION):
    // 1. Start with **bold label** in double asterisks (e.g., **Policy shift**, **Technical breakthrough**)
    // 2. EVERY bullet MUST contain AT LEAST 3 specific pieces of concrete data:
    //    - Numbers (dollars, percentages, quantities, dates, timeframes)
    //    - Names (people, companies, products, locations)
    //    - Concrete actions (what specifically happened, not "things are changing")
    // 3. Connect 3-4 related facts using em dashes (—), semicolons, or parenthetical details
    // 4. Show WHY it matters with specific consequences/implications
    // 5. Use information-dense phrasing: "securing $20B funding—4x their previous round" NOT "they secured significant funding"
    // 6. NEVER write vague statements that could apply to any story
    // 7. NEVER write topic/transition sentences without immediate supporting details
    // 8. Pack context + implications together: "policy shift from voluntary to mandatory compliance—driven by EU's $50M fine threat"
    // 9. CITATIONS - CRITICAL: After EVERY specific fact, statistic, or claim, add [N] where N is the source number (1, 2, 3, etc.)
    //    - Place citation IMMEDIATELY after the fact, before any punctuation
    //    - Example: "Tesla's revenue reached $100B[2] in Q4—representing 40% growth[2]"
    //    - Use multiple sources if applicable: "Revenue increased 40%[1][3] despite market challenges[2]"
    //    - EVERY bullet MUST have multiple citations since each contains multiple facts
    //    - Citations make facts verifiable and professional—NEVER skip them
    //
    // 💡 QUALITY TEST: Read each bullet and ask "If I removed the topic label, would someone know EXACTLY what happened?" If not, ADD MORE SPECIFICS.
  ],
  "sourceAnalysis": {
    "narrativeConsistency": {"score": 7, "label": "Consistent|Mixed|Conflicting"},
    "publicInterest": {"score": 7, "label": "Viral|Popular|Moderate|Niche"}
  },
  "disagreements": [],
  "article": {
    "base": "Around 300-400 words. Natural paragraph breaks where they make sense (typically 3-5 paragraphs). Don't force exact paragraph lengths - let the content flow naturally. Write like a human journalist would: start with a hook, provide context, explain why it matters, and end with implications. Vary your paragraph and sentence lengths. Some paragraphs might be just two sentences. Others might be five. CRITICAL: Include citations [1], [2], [3] after EVERY specific fact, statistic, or claim. Place citations before periods: 'Revenue reached $50B[2].' Use multiple sources when applicable: 'Growth exceeded 40%[1][3].' Make it feel like something you'd actually want to read, not a homework assignment.",

    "eli5": "About 60-100 words. Explain it clearly for intelligent readers without technical background. Use accessible language and relatable examples. Break complex concepts into digestible chunks. Make it engaging and informative without oversimplifying. Example style: 'Think of this as similar to how your phone manages battery life. The new system optimizes...' Include citations [1], [2] after key facts. Avoid: 'Let me explain this complex topic in simple terms...'",

    "phd": ${includePhdAnalysis
      ? '"Approximately 500-700 words of scholarly analysis. Structure it naturally around key themes rather than forcing specific paragraph topics. Include: theoretical context, critical evaluation of sources, interdisciplinary connections, historical precedents, and implications. Write in an academic style but keep it readable - not unnecessarily dense. Mix complex analysis with clear explanations. CRITICAL: Use extensive citations [1], [2], [3], [4], [5] throughout to support ALL claims and arguments - this is essential for academic rigor."'
      : 'null'
    }
  },
  "keyQuestions": [
    // Generate 5-7 sophisticated, thought-provoking questions that encourage deep thinking
    // Each question should be intellectually stimulating and go beyond surface-level understanding
    // Categories:
    // - Critical Thinking: Questions that challenge assumptions or explore contradictions
    // - Future Impact: Questions about long-term consequences and potential outcomes
    // - Ethical Implications: Questions about moral dimensions and societal values
    // - Historical Context: Questions connecting to past events or patterns
    // - Systemic Analysis: Questions about underlying systems and structures
    // - Personal Reflection: Questions that connect to individual experience and values
    {
      "question": "A sophisticated question that challenges readers to think deeply",
      "category": "One of: Critical Thinking, Future Impact, Ethical Implications, Historical Context, Systemic Analysis, Personal Reflection"
    }
    // Generate 5-7 questions total, varied across different categories
  ],
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
- Focus on engaging, informative content over rigid formatting

IMPORTANT: Generate 5-7 sophisticated "keyQuestions" that will engage readers intellectually:
- Make them thought-provoking and challenging, not basic or surface-level
- Vary the categories (Critical Thinking, Future Impact, Ethical Implications, Historical Context, Systemic Analysis, Personal Reflection)
- Each question should spark deeper contemplation about the topic
- Avoid yes/no questions - prefer open-ended questions that invite exploration
- Connect the questions to broader themes and implications beyond the immediate news`;

  console.log('Calling Claude to synthesize real articles...');

  // Claude API call with adjusted timeout and tokens based on PhD inclusion
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout (increased for complex keyQuestions)

  try {
    // Call Anthropic Claude Sonnet 4.5 - best coding model and excellent for complex content generation
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'claude-sonnet-4-5', // Claude Sonnet 4.5 - fast and powerful
        // Alternative Claude models:
        // model: 'claude-opus-4',      // Most powerful, but slower and more expensive
        // model: 'claude-haiku-4',     // Fastest and cheapest, good for simple tasks
        max_tokens: includePhdAnalysis ? 5000 : 4500, // Increased for complex keyQuestions generation
        temperature: 0.7, // Claude supports temperature 0.0 - 1.0
        system: systemPrompt, // Claude has system as separate parameter
        messages: [
          { role: 'user', content: userPrompt }
        ]
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

      console.error('CLAUDE_ERROR', response.status, errorData);

      const error = new Error(errorData?.error?.message || `Claude API error: ${response.status}`);
      error.code = response.status === 429 ? 'RATE_LIMIT' : 'CLAUDE';
      error.details = errorData;
      throw error;
    }

    const data = await response.json();
    console.log('Claude API response received');

    // Extract the content from the response - Claude returns content in a different format
    const content = data.content?.[0]?.text;
    if (!content) {
      const error = new Error('No content in Claude response');
      error.code = 'CLAUDE';
      throw error;
    }

    // Parse the JSON content
    let newsData;
    try {
      newsData = safeJsonParse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', content.substring(0, 500));
      const error = new Error(`Failed to parse Claude JSON response: ${parseError.message}`);
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
        'x-claude-tokens-input': String(data.usage?.input_tokens || 0),
        'x-claude-tokens-output': String(data.usage?.output_tokens || 0),
        'x-model-used': 'claude-sonnet-4-5',
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
