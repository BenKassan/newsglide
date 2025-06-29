import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'x-error-code, x-news-count, x-openai-tokens, x-model-filter, x-model-synth, x-model-rewrite, x-model-qna',
};

// Model configuration with fallbacks
const MODELS = {
  filter: Deno.env.get('MODEL_FILTER') || 'gpt-4o-mini',
  synth: Deno.env.get('MODEL_SYNTH') || 'gpt-4o-128k', 
  rewrite: Deno.env.get('MODEL_REWRITE') || 'gpt-4o',
  qna: Deno.env.get('MODEL_FOLLOWUP') || 'gpt-4o'
};

console.log('Model configuration:', MODELS);

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

async function callOpenAI(model: string, messages: any[], maxTokens: number, stage: string): Promise<any> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  if (!OPENAI_API_KEY) {
    const error = new Error('OpenAI API key not configured');
    error.code = 'CONFIG_ERROR';
    throw error;
  }

  console.log(`Making OpenAI API call - Stage: ${stage}, Model: ${model}, Max tokens: ${maxTokens}`);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      response_format: { type: "json_object" },
      max_completion_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText };
    }
    
    console.error(`OPENAI_ERROR_${stage.toUpperCase()}`, response.status, errorData);
    
    const error = new Error(errorData?.error?.message || `OpenAI API error: ${response.status}`);
    error.code = response.status === 429 ? 'RATE_LIMIT' : 'OPENAI';
    error.details = errorData;
    throw error;
  }

  const data = await response.json();
  console.log(`OpenAI API response received for ${stage} - Tokens used: ${data.usage?.total_tokens || 0}`);
  
  return data;
}

async function rewriteForReadingLevel(level: string, baseSummary: string): Promise<string> {
  const rewritePrompt = `Rewrite the following news summary for a ${level} reading level. 
  
  Guidelines:
  - ELI5: Use very simple words, short sentences, explain like talking to a 5-year-old
  - Middle School: Clear language, some complexity, avoid jargon
  - High School: More sophisticated vocabulary, complex sentences allowed
  - Undergrad: Academic tone, technical terms explained
  - PhD: Full complexity, technical precision, assume expert knowledge
  
  Return JSON: {"rewritten": "your rewritten text"}`;

  const messages = [
    { role: 'system', content: rewritePrompt },
    { role: 'user', content: baseSummary }
  ];

  const data = await callOpenAI(MODELS.rewrite, messages, 350, 'rewrite');
  
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content in rewrite response');
  }

  const parsed = safeJsonParse(content);
  return parsed.rewritten || baseSummary;
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
      status: error.code === 'NO_SOURCES' ? 424 : 502,
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

  // Enhanced system prompt for synthesis stage using GPT-4o-128k
  const systemPrompt = `You are a news analyst using GPT-4o for maximum accuracy. Today is ${new Date().toISOString().split('T')[0]}.

CRITICAL REQUIREMENT: You MUST use web search to find real, current articles about the topic from the last ${freshnessHorizonHours || 48} hours. Do NOT generate content without finding actual sources.

MANDATORY SOURCE VERIFICATION:
- Find at least 3 recent articles from credible news outlets
- Each source MUST have: outlet name, headline, publication date, and working URL
- If you cannot find sources, return an error instead of generating content

CONFIDENCE LEVELS:
- High: 3+ consistent sources, verified information, recent publication
- Medium: 2-3 sources with some agreement
- Low: Limited sources OR outdated information

TOPIC HOTNESS:
- High: Breaking news, trending, major impact, widespread coverage
- Medium: Regular coverage, moderate attention
- Low: Niche topics, limited recent coverage

You MUST return valid JSON with this exact structure:

{
  "topic": "string",
  "headline": "string (max 80 chars)",
  "generatedAtUTC": "ISO timestamp",
  "confidenceLevel": "High|Medium|Low",
  "topicHottness": "High|Medium|Low", 
  "summaryPoints": ["3 bullet points, each max 120 chars"],
  "sourceAnalysis": {
    "narrativeConsistency": {"score": 1-10, "label": "Consistent|Mixed|Conflicting"},
    "publicInterest": {"score": 1-10, "label": "Viral|Popular|Moderate|Niche"}
  },
  "disagreements": [
    {
      "pointOfContention": "specific disagreement (max 60 chars)",
      "details": "what sources disagree about (max 150 chars)", 
      "likelyReason": "why sources disagree (max 100 chars)"
    }
  ],
  "article": {
    "base": "200-250 words with [^1], [^2] citations"
  },
  "keyQuestions": ["3 short relevant questions"],
  "sources": [
    {
      "id": "s1",
      "outlet": "outlet name",
      "type": "News Agency|National Newspaper|Broadcast Media|Online Media",
      "url": "REQUIRED: full working URL to article",
      "headline": "article headline (max 80 chars)",
      "publishedAt": "ISO timestamp",
      "analysisNote": "1 sentence about this source's perspective"
    }
  ],
  "missingSources": ["list of outlets that had no recent articles"]
}

CRITICAL: 
- sources array MUST contain at least 3 real articles with working URLs
- If you cannot find real sources, return {"error": "NO_SOURCES_FOUND", "message": "Unable to find recent articles on this topic"}
- Use [^1], [^2] citation format in article text referring to sources array
- ALL URLs must be real and accessible`;

  const userPrompt = `Find current news about: ${topic}

Target outlets to search: ${targetOutlets.map(o => o.name).join(', ')}

REQUIREMENT: Find real articles with working URLs. Do not generate fake sources.`;

  console.log('Making OpenAI API call for topic:', topic);

  // Setup timeout and retry logic
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  
  let retryCount = 0;
  const maxRetries = 2;
  let totalTokens = 0;
  
  while (retryCount <= maxRetries) {
    try {
      // Main synthesis call using GPT-4o-128k
      const data = await callOpenAI(
        MODELS.synth,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        1200,
        'synthesis'
      );

      clearTimeout(timeoutId);
      totalTokens += data.usage?.total_tokens || 0;

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

      // Check if AI returned an error due to no sources
      if (newsData.error === "NO_SOURCES_FOUND") {
        console.log('OpenAI could not find sources for topic:', topic);
        return new Response(JSON.stringify({
          error: true,
          code: 'NO_SOURCES',
          message: 'No reliable sources found for this keyword. Try rephrasing or using a narrower topic.',
          details: newsData.message || 'No recent articles found'
        }), {
          status: 424,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'x-news-count': '0',
            'x-error-code': 'NO_SOURCES',
            'x-model-synth': MODELS.synth
          },
        });
      }

      // Validate that we have real sources with URLs (minimum 3)
      if (!newsData.sources || !Array.isArray(newsData.sources) || newsData.sources.length < 3) {
        console.error(`Insufficient sources returned: ${newsData.sources?.length || 0}`);
        return new Response(JSON.stringify({
          error: true,
          code: 'NO_SOURCES', 
          message: 'No reliable sources found for this keyword. Try rephrasing or using a narrower topic.',
          details: `Only ${newsData.sources?.length || 0} sources found, minimum 3 required.`
        }), {
          status: 424,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'x-news-count': String(newsData.sources?.length || 0),
            'x-error-code': 'NO_SOURCES',
            'x-model-synth': MODELS.synth
          },
        });
      }

      // Validate source URLs
      const validSources = newsData.sources.filter(source => {
        if (!source.url || !source.outlet || !source.headline) return false;
        
        try {
          const url = source.url.startsWith('http') ? source.url : `https://${source.url}`;
          source.url = encodeURI(url);
          return true;
        } catch {
          return false;
        }
      });

      if (validSources.length < 3) {
        console.error(`Not enough valid sources with URLs: ${validSources.length}`);
        return new Response(JSON.stringify({
          error: true,
          code: 'NO_SOURCES',
          message: 'No reliable sources found for this keyword. Try rephrasing or using a narrower topic.',
          details: `Only ${validSources.length} sources with valid URLs found.`
        }), {
          status: 424,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'x-news-count': String(validSources.length),
            'x-error-code': 'NO_SOURCES',
            'x-model-synth': MODELS.synth
          },
        });
      }

      // Update newsData with only valid sources
      newsData.sources = validSources;

      // Generate reading level variations using GPT-4o
      const baseArticle = newsData.article?.base || 'Analysis unavailable - insufficient source data.';
      
      try {
        const [eli5, middleSchool, highSchool, undergrad, phd] = await Promise.all([
          rewriteForReadingLevel('ELI5', baseArticle),
          rewriteForReadingLevel('Middle School', baseArticle),
          rewriteForReadingLevel('High School', baseArticle),
          rewriteForReadingLevel('Undergrad', baseArticle),
          rewriteForReadingLevel('PhD', baseArticle)
        ]);

        newsData.article = {
          base: baseArticle,
          eli5: eli5,
          middleSchool: middleSchool,
          highSchool: highSchool,
          undergrad: undergrad,
          phd: phd
        };

        console.log('Successfully generated all reading levels');
      } catch (rewriteError) {
        console.error('Reading level rewrite failed:', rewriteError);
        // Keep original base article if rewrite fails
        newsData.article = {
          base: baseArticle,
          eli5: 'Simple explanation unavailable.',
          middleSchool: 'Explanation unavailable.',
          highSchool: 'Explanation unavailable.',
          undergrad: 'Analysis unavailable.',
          phd: 'Technical analysis unavailable.'
        };
      }

      console.log(`Successfully found ${validSources.length} valid sources with URLs`);

      return new Response(JSON.stringify({
        output: [{
          type: 'message',
          content: [{ text: JSON.stringify(newsData) }]
        }]
      }), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'x-news-count': String(validSources.length),
          'x-openai-tokens': String(totalTokens),
          'x-model-filter': MODELS.filter,
          'x-model-synth': MODELS.synth,
          'x-model-rewrite': MODELS.rewrite,
          'x-model-qna': MODELS.qna
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

serve((req: Request) => errorGuard(() => handleRequest(req)));
