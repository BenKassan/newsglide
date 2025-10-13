import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitExceededResponse, RateLimits, getIdentifier } from '../_shared/ratelimit.ts';

interface ExpandArticleRequest {
  topic: string;
  headline: string;
  originalContent: string;
  allPreviousContent: string[];
  readingLevel: 'base' | 'eli5' | 'phd';
  sources: Array<{
    id: string;
    outlet: string;
    headline: string;
    url?: string;
  }>;
  partNumber: number;
}

interface ExpandArticleResponse {
  expandedContent: string;
  partTitle: string;
  wordCount: number;
  partNumber: number;
}

// Post-process text to remove common AI phrases (reused from news-synthesis)
function cleanAIPhrasings(text: string): string {
  if (!text) return text;

  const replacements = [
    [/^It's important to note that/gi, ''],
    [/^It is worth noting that/gi, ''],
    [/^Certainly[!,] /gi, ''],
    [/^Indeed[,] /gi, ''],
    [/^In today's rapidly evolving/gi, "In today's"],
    [/Moreover[,] /gi, 'Also, '],
    [/Furthermore[,] /gi, 'Plus, '],
    [/In conclusion[,] /gi, ''],
    [/To summarize[,] /gi, ''],
    [/delve into/gi, 'explore'],
    [/dive into/gi, 'look at'],
    [/landscape of/gi, ''],
    [/tapestry of/gi, ''],
    [/crucial/gi, 'important'],
    [/utilize/gi, 'use'],
    [/  +/g, ' '],
    [/^\s+|\s+$/g, '']
  ];

  let cleaned = text;
  replacements.forEach(([pattern, replacement]) => {
    cleaned = cleaned.replace(pattern, replacement);
  });

  cleaned = cleaned.replace(/\. ([a-z])/g, (match, letter) => `. ${letter.toUpperCase()}`);
  cleaned = cleaned.replace(/^([a-z])/, (match, letter) => letter.toUpperCase());

  return cleaned;
}

function getTargetWordCount(readingLevel: 'base' | 'eli5' | 'phd'): { min: number; max: number; guidance: string } {
  switch (readingLevel) {
    case 'base':
      return {
        min: 300,
        max: 400,
        guidance: 'Write a natural continuation of approximately 300-400 words. Use 3-5 paragraphs with varied lengths. Write like a human journalist - start with a hook for this new section, provide additional context or angles, and end with implications or future considerations.'
      };
    case 'eli5':
      return {
        min: 60,
        max: 100,
        guidance: 'Write about 60-100 words in simple, engaging language. Break it into 2-3 short paragraphs. Explain new aspects using everyday examples and relatable comparisons.'
      };
    case 'phd':
      return {
        min: 500,
        max: 700,
        guidance: 'Write approximately 500-700 words of scholarly analysis. Structure it naturally around key themes. Include: deeper theoretical context, critical evaluation from different perspectives, interdisciplinary connections not covered in the original, and nuanced implications. Maintain academic rigor while remaining readable.'
      };
  }
}

async function handleRequest(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Get authentication token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting - use AI_CALLS tier for article expansions
    const identifier = getIdentifier(req, user.id);
    const rateLimit = checkRateLimit(identifier, 'expand-article', RateLimits.AI_CALLS);

    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit, RateLimits.AI_CALLS, corsHeaders);
    }

    // Parse request body
    const body: ExpandArticleRequest = await req.json();
    const { topic, headline, originalContent, allPreviousContent, readingLevel, sources, partNumber } = body;

    // Validate required fields
    if (!topic || !headline || !originalContent || !readingLevel || !sources || !partNumber) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check for Anthropic API key
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get word count guidance
    const { guidance } = getTargetWordCount(readingLevel);

    // Build sources context for citations
    const sourcesContext = sources.map((s, i) =>
      `[^${i + 1}] ${s.outlet}: ${s.headline}`
    ).join('\n');

    // Build context from all previous parts
    const previousPartsContext = allPreviousContent.map((content, idx) => {
      const partLabel = idx === 0 ? 'Original Article' : `Part ${idx + 1}`;
      return `--- ${partLabel} ---\n${content}`;
    }).join('\n\n');

    // Create system prompt for continuation
    const systemPrompt = `You are continuing an article you previously wrote. Your task is to write Part ${partNumber} that builds upon what you've already written.

CRITICAL REQUIREMENTS:
1. **Maintain EXACT Writing Style**: Match the tone, voice, sentence structure, and pacing of the original
2. **No Repetition**: Cover NEW angles, details, or implications not mentioned before
3. **Natural Continuation**: This should feel like the next section of the same article, not a separate piece
4. **Same Citation Style**: Use footnotes [^1], [^2] where appropriate to reference sources
5. **Coherent Flow**: Build logically on what came before

${guidance}

Avoid these AI phrases:
- "It's important to note", "Moreover", "Furthermore", "In conclusion"
- "Dive into", "Delve into", "Landscape", "Tapestry"
- Forced transitions or repetitive paragraph structures

Write naturally with:
- Varied sentence structures (mix short punchy sentences with longer ones)
- Active voice and strong verbs
- Specific examples rather than vague statements
- Natural transitions that emerge from the content
- A conversational tone that feels human`;

    const userPrompt = `Here's what you've written so far about "${topic}":

${previousPartsContext}

Available sources for citations:
${sourcesContext}

Now write Part ${partNumber} that:
- Explores NEW aspects not covered in the previous part(s)
- Maintains the EXACT same writing style and tone
- Is approximately the same length as the original
- Uses [^n] citations where relevant
- Feels like a natural continuation

CRITICAL: Your response MUST be in this exact format:

TITLE: [A concise, descriptive title (5-10 words) that captures what THIS specific part covers]

CONTENT:
[The article text for this part]

Example format:
TITLE: The Economic Ripple Effects on Global Markets

CONTENT:
[Article paragraphs here...]`;

    console.log(`Generating Part ${partNumber} for ${readingLevel} level...`);

    // Call Claude API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: readingLevel === 'phd' ? 2000 : readingLevel === 'base' ? 1200 : 500,
          temperature: 0.7,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt }
          ]
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Claude API error:', response.status, errorText);
        return new Response(JSON.stringify({
          error: 'Failed to generate article expansion',
          details: errorText
        }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const data = await response.json();
      const rawResponse = data.content?.[0]?.text;

      if (!rawResponse) {
        return new Response(JSON.stringify({ error: 'No content generated' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Parse title and content from the response
      const titleMatch = rawResponse.match(/TITLE:\s*(.+?)(?:\n|$)/i);
      const contentMatch = rawResponse.match(/CONTENT:\s*\n?([\s\S]+)/i);

      if (!titleMatch || !contentMatch) {
        console.error('Failed to parse title/content from response:', rawResponse.substring(0, 200));
        return new Response(JSON.stringify({
          error: 'Invalid response format from AI',
          details: 'Could not parse title and content'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const partTitle = titleMatch[1].trim();
      const expandedContent = contentMatch[1].trim();

      // Clean AI phrasings from content
      const cleanedContent = cleanAIPhrasings(expandedContent);

      // Calculate word count
      const wordCount = cleanedContent.split(/\s+/).length;

      console.log(`Generated Part ${partNumber}: "${partTitle}" (${wordCount} words)`);

      const result: ExpandArticleResponse = {
        expandedContent: cleanedContent,
        partTitle,
        wordCount,
        partNumber
      };

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'x-word-count': String(wordCount),
          'x-reading-level': readingLevel,
          'x-part-number': String(partNumber),
          'x-claude-tokens-input': String(data.usage?.input_tokens || 0),
          'x-claude-tokens-output': String(data.usage?.output_tokens || 0)
        }
      });

    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        return new Response(JSON.stringify({
          error: 'Generation timeout',
          message: 'Article expansion took too long. Please try again.'
        }), {
          status: 504,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      throw error;
    }

  } catch (error: any) {
    console.error('Expand article error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

serve(handleRequest);
