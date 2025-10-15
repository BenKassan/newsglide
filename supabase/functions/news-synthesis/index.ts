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
type ArticleFormat = 'paragraphs' | 'bullets'
type ReadingLevel = 'eli5' | 'high_school' | 'college' | 'phd'

interface CacheOptions {
  includePhdAnalysis?: boolean
  targetWordCount?: number
  articleFormat?: ArticleFormat
  readingLevel?: ReadingLevel
}

function generateCacheKey(topic: string, options: CacheOptions = {}): string {
  const normalizedTopic = topic
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')  // Normalize spaces
    .replace(/[''`]/g, '')  // Remove quotes
    .replace(/[^\w\s-]/g, '')  // Keep letters, numbers, spaces, hyphens
    .replace(/\s+/g, '_');  // Finally replace spaces with underscores

  const suffixes = [
    options.includePhdAnalysis ? 'phd' : 'std',
    options.targetWordCount ? `wc${options.targetWordCount}` : 'wc400',
    options.articleFormat ? `fmt_${options.articleFormat}` : 'fmt_paragraphs',
    options.readingLevel ? `lvl_${options.readingLevel}` : 'lvl_college'
  ]

  return `${normalizedTopic}_${suffixes.join('_')}`
}

async function getCachedResult(topic: string, options: CacheOptions = {}): Promise<any | null> {
  try {
    const cacheKey = generateCacheKey(topic, options);
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

async function cacheResult(topic: string, newsData: any, options: CacheOptions = {}): Promise<void> {
  try {
    const cacheKey = generateCacheKey(topic, options);
    
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
    const resultCount = Math.min(Math.max(count, 1), 20);
    const params = new URLSearchParams({
      q: query,
      count: resultCount.toString(),
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
    return data.results?.slice(0, resultCount).map((result: any) => ({
      title: result.title.substring(0, 100), // Limit title length
      url: result.url,
      description: (result.description || '').substring(0, 200), // Limit description
      published: result.published_at ?? undefined,
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
async function searchSerperNews(query: string, count: number = 5): Promise<SearchResult[]> {
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
        num: Math.min(Math.max(count, 1), 20), // Fetch up to requested count
        tbs: 'qdr:d3' // Last 3 days
      })
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json();
    
    const resultCount = Math.min(Math.max(count, 1), 20);
    return data.news?.slice(0, resultCount).map((item: any) => ({
      title: item.title,
      url: item.link,
      description: item.snippet,
      published: item.date ?? undefined,
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

const MAX_SOURCE_AGE_HOURS = 72;
const MAX_SOURCE_AGE_MS = MAX_SOURCE_AGE_HOURS * 60 * 60 * 1000;

function parsePublishedDate(published?: string): number | null {
  if (!published) {
    return null;
  }

  const parsed = Date.parse(published);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  const normalized = published.toLowerCase().trim();
  const relativeMatch = normalized.match(/^(?:about\s+)?(an?|[\d.]+)\s+(minute|hour|day)s?\s+ago$/);
  if (relativeMatch) {
    const rawAmount = relativeMatch[1];
    const unit = relativeMatch[2];
    const amount = rawAmount === 'a' || rawAmount === 'an' ? 1 : parseFloat(rawAmount);

    if (Number.isNaN(amount)) {
      return null;
    }

    const multiplier: Record<string, number> = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
    };

    const unitMs = multiplier[unit];
    if (!unitMs) {
      return null;
    }

    return Date.now() - amount * unitMs;
  }

  return null;
}

function filterRecentArticles(articles: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const now = Date.now();

  return articles.filter((article) => {
    const timestamp = parsePublishedDate(article.published);
    if (timestamp === null) {
      return false;
    }

    if (now - timestamp > MAX_SOURCE_AGE_MS) {
      return false;
    }

    const key = article.url || `${article.title}-${timestamp}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

interface RecentSearchOptions {
  fallbackQuery?: string;
  resultCount?: number;
  useBrave?: boolean;
  useSerper?: boolean;
}

async function getRecentSearchResults(
  query: string,
  options: RecentSearchOptions = {}
): Promise<SearchResult[]> {
  const {
    fallbackQuery,
    resultCount = 10,
    useBrave = true,
    useSerper = true,
  } = options;

  const queries = [query];
  if (fallbackQuery && fallbackQuery !== query) {
    queries.push(fallbackQuery);
  }

  for (const currentQuery of queries) {
    const providers: Array<() => Promise<SearchResult[]>> = [];

    if (useBrave) {
      providers.push(async () => {
        const results = await searchBraveNews(currentQuery, resultCount);
        const recent = filterRecentArticles(results);
        if (recent.length === 0 && results.length > 0) {
          console.log(`[SEARCH] Brave found ${results.length} articles but none within ${MAX_SOURCE_AGE_HOURS} hours for "${currentQuery}"`);
        }
        return recent;
      });
    }

    if (useSerper) {
      providers.push(async () => {
        const results = await searchSerperNews(currentQuery, resultCount);
        const recent = filterRecentArticles(results);
        if (recent.length === 0 && results.length > 0) {
          console.log(`[SEARCH] Serper found ${results.length} articles but none within ${MAX_SOURCE_AGE_HOURS} hours for "${currentQuery}"`);
        }
        return recent;
      });
    }

    for (const provider of providers) {
      try {
        const recent = await provider();
        if (recent.length > 0) {
          console.log(`[SEARCH] Using ${recent.length} recent article(s) for query "${currentQuery}"`);
          return recent;
        }
      } catch (error) {
        console.error('[SEARCH] Provider error:', error);
      }
    }
  }

  return [];
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
    targetWordCount: number;
    articleFormat: ArticleFormat;
    primaryReadingLevel: ReadingLevel;
    ANTHROPIC_API_KEY: string;
    BRAVE_API_KEY?: string;
    SERPER_API_KEY?: string;
    startTime: number;
  }
): Promise<Response> {
  const {
    topic,
    includePhdAnalysis,
    targetWordCount,
    articleFormat,
    primaryReadingLevel,
    ANTHROPIC_API_KEY,
    BRAVE_API_KEY,
    SERPER_API_KEY
  } = params;

  const resolvedTargetWordCount = targetWordCount;
  const resolvedArticleFormat = articleFormat;

  console.log('Starting streaming synthesis for:', topic);

  // Enhance search query
  const searchQuery = (() => {
    const lowerTopic = topic.toLowerCase();
    if (lowerTopic.includes('news') || lowerTopic.includes('latest') || lowerTopic.includes('update')) {
      return topic;
    }
    return `${topic} latest news updates 2025`;
  })();

  const searchResults = await getRecentSearchResults(searchQuery, {
    fallbackQuery: `${topic} news`,
    resultCount: 10,
    useBrave: !!BRAVE_API_KEY,
    useSerper: !!SERPER_API_KEY,
  });

  if (searchResults.length === 0) {
    const error = new Error(`No news articles from the last 3 days found about "${topic}"`);
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
  const recencyRequirementNote = '\n\nAll sources were published within the last 3 days.';

  const paragraphPrimaryInstruction = `Approximately ${resolvedTargetWordCount} words written in polished paragraphs tailored for ${primaryReadingLevel.replace('_', ' ')} readers. Use tightly focused paragraphs (4-6) with purposeful transitions, embed citations like [1] directly after specific facts, and keep every sentence grounded in verifiable details from multiple sources.`
  const bulletPrimaryInstruction = `Approximately ${resolvedTargetWordCount} words delivered as high-impact bullet points for ${primaryReadingLevel.replace('_', ' ')} readers. Provide 6-10 bullets; bold the leading descriptor, follow with 2-3 sentences packed with concrete numbers, names, and implications, and attach citations like [1] after each fact. Avoid numbering or fluff.`

  const defaultArticleInstructions: Record<ReadingLevel, string> = {
    eli5: "80-120 words in friendly, plain language. Use short sentences, relatable analogies, and define tricky terms. Keep structure to 2-3 brief paragraphs and include citations like [1] right after specific facts.",
    high_school: "220-320 words with clear transitions and approachable vocabulary. Organize into 3-4 concise paragraphs, connect causes and effects explicitly, and cite facts with [1], [2] style references.",
    college: "360-480 words with professional tone and layered context. Craft 4-5 paragraphs that synthesize sources, compare viewpoints, and highlight implications using precise statistics with [1][2] citations.",
    phd: "500-700 words of rigorous analysis. Present scholarly framing, theoretical context, and methodological nuances while cross-referencing sources extensively with [1][2][3]."
  }

  const primaryInstruction = resolvedArticleFormat === 'bullets'
    ? bulletPrimaryInstruction
    : paragraphPrimaryInstruction

  const articleInstructions: Record<ReadingLevel, string> = {
    eli5: primaryReadingLevel === 'eli5' ? primaryInstruction : defaultArticleInstructions.eli5,
    high_school: primaryReadingLevel === 'high_school' ? primaryInstruction : defaultArticleInstructions.high_school,
    college: primaryReadingLevel === 'college' ? primaryInstruction : defaultArticleInstructions.college,
    phd: primaryReadingLevel === 'phd' ? primaryInstruction : defaultArticleInstructions.phd,
  }

  const systemPrompt = `You are a skilled journalist writing for a modern digital publication. Your writing should be engaging, clear, and sophisticated - like The Atlantic, Reuters, or The Economist.

Synthesize these articles about "${topic}":

${articlesContext}${sourceLimitationNote}${recencyRequirementNote}

Return this JSON structure:

{
  "topic": "${topic}",
  "headline": "compelling headline max 80 chars",
  "generatedAtUTC": "${new Date().toISOString()}",
  "confidenceLevel": "High|Medium|Low",
  "topicHottness": "High|Medium|Low",
  "summaryPoints": [
    // ⚡ CRITICAL: You are writing COMPLETE, SELF-CONTAINED INFORMATION UNITS
    // NOT article outlines, NOT topic sentences, NOT section headers
    // Each bullet must convey important information even if read completely alone
    //
    // 📋 MANDATORY FORMAT TEMPLATE (follow EXACTLY):
    // **[Bold Label]**: [Fact 1 with numbers/names][citation]—[Fact 2 with specifics][citation]—[Fact 3 with implications][citation]; [additional context with more data][citation]
    //
    // ✅ VALIDATION CHECKLIST - EVERY bullet must pass ALL of these:
    // ☑ Starts with **bold label** in double asterisks
    // ☑ Contains AT LEAST 3 specific data points (numbers, names, concrete actions)
    // ☑ Length: 150-280 characters minimum
    // ☑ Multiple [N] citations throughout (after every fact)
    // ☑ Facts connected with em dashes (—) or semicolons
    // ☑ Understandable if read alone without any context
    // ☑ Answers: What happened? Who? When? How much? Why does it matter?
    //
    // ❌ INSTANT REJECTION - These patterns are FORBIDDEN:
    // ❌ "No brake caliper supplier announcements." → Fragment with no context, no bold label, no explanation
    // ❌ "Consider what's missing from the technical conversation." → Meta-commentary, no facts, no value
    // ❌ "The investment carries particular strategic weight." → Vague, no specifics
    // ❌ "2 million concurrent viewers." → Incomplete fragment, no context
    // ❌ "Industry observers are closely watching." → Filler, no specifics
    // ❌ "This development has significant implications." → Meaningless without specifics
    // ❌ Any sentence under 100 characters → Too short, lacks density
    // ❌ Any bullet without **bold label** → Instant rejection
    // ❌ Any bullet with fewer than 3 concrete facts → Too vague
    //
    // ✅ CORRECT - How to turn fragments into dense bullets:
    // BAD: "No brake caliper supplier announcements."
    // GOOD: "**Supplier partnerships**: Tesla has announced zero brake component supplier relationships for the Roadster after 8 years of development[1][2]—unlike Porsche's 18-24 month Taycan development cycle with Continental and Pirelli partnerships publicly announced[3]—suggesting either in-house manufacturing (requiring $100M+ tooling investment) or incomplete specifications preventing supplier commitments"
    //
    // BAD: "Consider what's missing from the technical conversation."
    // GOOD: "**Specification gaps**: Despite 8 years since the 2017 announcement[1], Tesla has released no public specifications for critical performance systems including brake caliper dimensions, tire compound requirements, or cooling system capacity[2][3]—specifications that Porsche published 24 months before Taycan production[4]—raising questions about whether engineering is complete or if the company is avoiding scrutiny of ambitious performance claims"
    //
    // ✅ PROVEN EXAMPLES (copy this style):
    // - "**Hardware partnership**: Nvidia's equity stake includes major GPU supply agreement securing xAI's access to H100 chips—the industry's scarcest resource trading at $30K+ per unit[1]—mirroring Nvidia's strategy of investing in its own customers to create a self-reinforcing ecosystem profiting from both $40B+ hardware sales and equity appreciation in AI startups valued at $200B+ collectively[2][3]"
    // - "**Workforce restructuring**: xAI laid off 300-400 employees[2] specifically tasked with training Dino (the ChatGPT competitor) despite completing $20B funding round—4x their previous raise[1]—suggesting pivot toward automated training methods or outsourced data annotation to reduce $50M+ annual labor costs while scaling operations 10x faster than manual approaches allow[3]"
    //
    // 🎯 BEFORE WRITING: Mentally collect for each bullet:
    // 1. Topic/theme → becomes **bold label**
    // 2. 3+ specific facts → numbers, names, concrete actions
    // 3. Why it matters → implications, context, comparisons
    // Then combine ALL into ONE information-dense bullet
    //
    // 💡 FINAL QUALITY TEST: "If someone read ONLY this bullet with zero context, would they know exactly what happened and why it matters?" If NO → Rewrite with more specifics
    //
    // Generate 3-5 bullets following this exact format.
  ],
  "sourceAnalysis": {
    "narrativeConsistency": {"score": 7, "label": "Consistent|Mixed|Conflicting"},
    "publicInterest": {"score": 7, "label": "Viral|Popular|Moderate|Niche"}
  },
  "disagreements": [],
  "article": {
    "eli5": ${JSON.stringify(articleInstructions.eli5)},
    "high_school": ${JSON.stringify(articleInstructions.high_school)},
    "college": ${JSON.stringify(articleInstructions.college)},
    "phd": ${includePhdAnalysis ? JSON.stringify(articleInstructions.phd) : 'null'}
  },
  "primaryReadingLevel": "${primaryReadingLevel}",
  "articleFormat": "${resolvedArticleFormat}",
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
        let textBuffer = ''; // Buffer for smooth streaming (accumulate small chunks)

        // Send metadata first (sources)
        const validatedSources = searchResults.map((article, index) => {
          const publishedTimestamp = parsePublishedDate(article.published);
          const publishedAt = publishedTimestamp
            ? new Date(publishedTimestamp).toISOString()
            : new Date().toISOString();

          return {
            id: `s${index + 1}`,
            outlet: article.source || new URL(article.url).hostname,
            type: determineOutletType(article.source || ''),
            url: article.url,
            headline: article.title,
            publishedAt,
            analysisNote: 'Real source included in synthesis'
          };
        });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'sources',
          data: validatedSources
        })}\n\n`));

        // Helper function to check if buffer should be flushed
        const shouldFlushBuffer = (buf: string): boolean => {
          // Flush if buffer is large enough (20+ chars for smooth streaming)
          if (buf.length >= 20) return true;

          // OR flush if buffer ends with word boundary (space, punctuation)
          if (/[\s.,!?;:]$/.test(buf)) return true;

          return false;
        };

        // Helper function to extract article text from partial JSON
        // This version works with INCOMPLETE JSON strings for progressive streaming
        const extractArticleText = (jsonText: string): string => {
          try {
            const candidateKeys = [
              `"${primaryReadingLevel}"`,
              '"college"',
              '"base"',
            ];
            let fieldIdx = -1;
            for (const key of candidateKeys) {
              fieldIdx = jsonText.indexOf(key);
              if (fieldIdx !== -1) {
                break;
              }
            }
            if (fieldIdx === -1) return '';

            // Find the opening quote of the value
            const colonIdx = jsonText.indexOf(':', fieldIdx);
            if (colonIdx === -1) return '';

            const quoteIdx = jsonText.indexOf('"', colonIdx);
            if (quoteIdx === -1) return '';

            // Extract character-by-character from after opening quote
            let result = '';
            let i = quoteIdx + 1;

            while (i < jsonText.length) {
              if (jsonText[i] === '\\') {
                // If escape sequence is incomplete, wait for more data
                if (i + 1 >= jsonText.length) {
                  break;
                }

                const nextChar = jsonText[i + 1];

                // Handle unicode escapes (e.g. \u2014). If incomplete, wait for more data.
                if (nextChar === 'u') {
                  if (i + 5 >= jsonText.length) {
                    break;
                  }

                  const hex = jsonText.slice(i + 2, i + 6);
                  if (/^[0-9a-fA-F]{4}$/.test(hex)) {
                    result += String.fromCharCode(parseInt(hex, 16));
                    i += 6;
                    continue;
                  }
                }

                // Handle common escape sequences
                if (nextChar === 'n') result += '\n';
                else if (nextChar === '"') result += '"';
                else if (nextChar === '\\') result += '\\';
                else if (nextChar === 't') result += '\t';
                else if (nextChar === '/') result += '/';
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

                      // Buffer the new content instead of sending immediately
                      textBuffer += newContent;

                      // Only send when buffer reaches meaningful size or word boundary
                      if (shouldFlushBuffer(textBuffer)) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                          type: 'article_text',
                          data: textBuffer
                        })}\n\n`));
                        textBuffer = ''; // Clear buffer after sending
                      }
                    }
                  }
                }
              } catch (e) {
                console.error('Failed to parse streaming data:', e);
              }
            }
          }
        }

        // Flush any remaining buffered text before finalizing
        if (textBuffer.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'article_text',
            data: textBuffer
          })}\n\n`));
          textBuffer = '';
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
            if (newsData.article.college) {
              newsData.article.college = cleanAIPhrasings(newsData.article.college);
            }
            if (newsData.article.high_school) {
              newsData.article.high_school = cleanAIPhrasings(newsData.article.high_school);
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
          if (!newsData.primaryReadingLevel) {
            newsData.primaryReadingLevel = primaryReadingLevel;
          }
          if (!newsData.articleFormat) {
            newsData.articleFormat = resolvedArticleFormat;
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

  const {
    topic,
    targetOutlets,
    freshnessHorizonHours,
    includePhdAnalysis: includePhdRequested,
    targetWordCount,
    articleFormat,
    readingLevel,
  } = await req.json();

  const resolvedTargetWordCount = typeof targetWordCount === 'number' && targetWordCount > 0
    ? Math.min(Math.max(targetWordCount, 150), 1600)
    : 400;
  const resolvedArticleFormat: ArticleFormat = articleFormat === 'bullets' ? 'bullets' : 'paragraphs';
  const primaryReadingLevel: ReadingLevel = ['eli5', 'high_school', 'college', 'phd'].includes(readingLevel)
    ? readingLevel as ReadingLevel
    : 'college';
  const shouldIncludePhd = includePhdRequested || primaryReadingLevel === 'phd';
  const includePhdAnalysis = shouldIncludePhd;

  // If streaming is enabled, use streaming handler
  if (enableStreaming) {
    return handleStreamingRequest(req, {
      topic,
      targetOutlets,
      freshnessHorizonHours,
      includePhdAnalysis,
      targetWordCount: resolvedTargetWordCount,
      articleFormat: resolvedArticleFormat,
      primaryReadingLevel,
      ANTHROPIC_API_KEY,
      BRAVE_API_KEY,
      SERPER_API_KEY,
      startTime
    });
  }

  // Check cache first - now with PhD preference
  const cacheOptions: CacheOptions = {
    includePhdAnalysis: shouldIncludePhd,
    targetWordCount: resolvedTargetWordCount,
    articleFormat: resolvedArticleFormat,
    readingLevel: primaryReadingLevel,
  };

  const cachedData = await getCachedResult(topic, cacheOptions);
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

  const searchResults = await getRecentSearchResults(searchQuery, {
    fallbackQuery: `${topic} news`,
    resultCount: 10,
    useBrave: !!BRAVE_API_KEY,
    useSerper: !!SERPER_API_KEY,
  });

  if (searchResults.length === 0) {
    const error = new Error(`No news articles from the last 3 days found about "${topic}". Try:\n- More specific terms (e.g., "OpenAI GPT" instead of "AI")\n- Adding a company or location\n- Topics currently in the news cycle`);
    error.code = 'NO_SOURCES';
    throw error;
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
  const recencyRequirementNote = '\n\nAll sources were published within the last 3 days.';

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

${articlesContext}${sourceLimitationNote}${recencyRequirementNote}

Return this JSON structure (word counts are approximate targets, not rigid requirements):

{
  "topic": "${topic}",
  "headline": "compelling headline max 80 chars",
  "generatedAtUTC": "${new Date().toISOString()}",
  "confidenceLevel": "High|Medium|Low",
  "topicHottness": "High|Medium|Low",
  "summaryPoints": [
    // ⚡ CRITICAL: You are writing COMPLETE, SELF-CONTAINED INFORMATION UNITS
    // NOT article outlines, NOT topic sentences, NOT section headers
    // Each bullet must convey important information even if read completely alone
    //
    // 📋 MANDATORY FORMAT TEMPLATE (follow EXACTLY):
    // **[Bold Label]**: [Fact 1 with numbers/names][citation]—[Fact 2 with specifics][citation]—[Fact 3 with implications][citation]; [additional context with more data][citation]
    //
    // ✅ VALIDATION CHECKLIST - EVERY bullet must pass ALL of these:
    // ☑ Starts with **bold label** in double asterisks
    // ☑ Contains AT LEAST 3 specific data points (numbers, names, concrete actions)
    // ☑ Length: 150-280 characters minimum
    // ☑ Multiple [N] citations throughout (after every fact)
    // ☑ Facts connected with em dashes (—) or semicolons
    // ☑ Understandable if read alone without any context
    // ☑ Answers: What happened? Who? When? How much? Why does it matter?
    //
    // ❌ INSTANT REJECTION - These patterns are FORBIDDEN:
    // ❌ "No brake caliper supplier announcements." → Fragment with no context, no bold label, no explanation
    // ❌ "Consider what's missing from the technical conversation." → Meta-commentary, no facts, no value
    // ❌ "The investment carries particular strategic weight." → Vague, no specifics
    // ❌ "2 million concurrent viewers." → Incomplete fragment, no context
    // ❌ "Industry observers are closely watching." → Filler, no specifics
    // ❌ "This development has significant implications." → Meaningless without specifics
    // ❌ Any sentence under 100 characters → Too short, lacks density
    // ❌ Any bullet without **bold label** → Instant rejection
    // ❌ Any bullet with fewer than 3 concrete facts → Too vague
    //
    // ✅ CORRECT - How to turn fragments into dense bullets:
    // BAD: "No brake caliper supplier announcements."
    // GOOD: "**Supplier partnerships**: Tesla has announced zero brake component supplier relationships for the Roadster after 8 years of development[1][2]—unlike Porsche's 18-24 month Taycan development cycle with Continental and Pirelli partnerships publicly announced[3]—suggesting either in-house manufacturing (requiring $100M+ tooling investment) or incomplete specifications preventing supplier commitments"
    //
    // BAD: "Consider what's missing from the technical conversation."
    // GOOD: "**Specification gaps**: Despite 8 years since the 2017 announcement[1], Tesla has released no public specifications for critical performance systems including brake caliper dimensions, tire compound requirements, or cooling system capacity[2][3]—specifications that Porsche published 24 months before Taycan production[4]—raising questions about whether engineering is complete or if the company is avoiding scrutiny of ambitious performance claims"
    //
    // ✅ PROVEN EXAMPLES (copy this style):
    // - "**Hardware partnership**: Nvidia's equity stake includes major GPU supply agreement securing xAI's access to H100 chips—the industry's scarcest resource trading at $30K+ per unit[1]—mirroring Nvidia's strategy of investing in its own customers to create a self-reinforcing ecosystem profiting from both $40B+ hardware sales and equity appreciation in AI startups valued at $200B+ collectively[2][3]"
    // - "**Workforce restructuring**: xAI laid off 300-400 employees[2] specifically tasked with training Dino (the ChatGPT competitor) despite completing $20B funding round—4x their previous raise[1]—suggesting pivot toward automated training methods or outsourced data annotation to reduce $50M+ annual labor costs while scaling operations 10x faster than manual approaches allow[3]"
    //
    // 🎯 BEFORE WRITING: Mentally collect for each bullet:
    // 1. Topic/theme → becomes **bold label**
    // 2. 3+ specific facts → numbers, names, concrete actions
    // 3. Why it matters → implications, context, comparisons
    // Then combine ALL into ONE information-dense bullet
    //
    // 💡 FINAL QUALITY TEST: "If someone read ONLY this bullet with zero context, would they know exactly what happened and why it matters?" If NO → Rewrite with more specifics
    //
    // Generate 3-5 bullets following this exact format.
  ],
  "sourceAnalysis": {
    "narrativeConsistency": {"score": 7, "label": "Consistent|Mixed|Conflicting"},
    "publicInterest": {"score": 7, "label": "Viral|Popular|Moderate|Niche"}
  },
  "disagreements": [],
  "article": {
    "eli5": ${JSON.stringify(articleInstructions.eli5)},
    "high_school": ${JSON.stringify(articleInstructions.high_school)},
    "college": ${JSON.stringify(articleInstructions.college)},
    "phd": ${includePhdAnalysis
      ? JSON.stringify(articleInstructions.phd)
      : 'null'
    }
  },
  "primaryReadingLevel": "${primaryReadingLevel}",
  "articleFormat": "${resolvedArticleFormat}",
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
    const validatedSources = searchResults.map((article, index) => {
      const publishedTimestamp = parsePublishedDate(article.published);
      const publishedAt = publishedTimestamp
        ? new Date(publishedTimestamp).toISOString()
        : new Date().toISOString();

      return {
        id: `s${index + 1}`,
        outlet: article.source || new URL(article.url).hostname,
        type: determineOutletType(article.source || ''),
        url: article.url,
        headline: article.title,
        publishedAt,
        analysisNote: 'Real source included in synthesis'
      };
    });

    // Don't throw error for low source count - work with what we have
    console.log(`Successfully synthesized news with ${validatedSources.length} real sources`);

    // Post-process the articles to remove AI phrasings
    if (newsData.article) {
      if (newsData.article.college) {
        newsData.article.college = cleanAIPhrasings(newsData.article.college);
      }
      if (newsData.article.high_school) {
        newsData.article.high_school = cleanAIPhrasings(newsData.article.high_school);
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

    if (!newsData.primaryReadingLevel) {
      newsData.primaryReadingLevel = primaryReadingLevel;
    }
    if (!newsData.articleFormat) {
      newsData.articleFormat = resolvedArticleFormat;
    }
    
    // Update newsData with real sources
    newsData.sources = validatedSources;
    newsData.generatedAtUTC = new Date().toISOString();

    // Cache result asynchronously - now with PhD preference
    cacheResult(topic, newsData, cacheOptions).catch(console.error);

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
        'x-cache-key': generateCacheKey(topic, cacheOptions),
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
