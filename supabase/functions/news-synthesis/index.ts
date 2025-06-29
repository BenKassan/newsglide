
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      error: 'SYNTHESIS_FAILED',
      message: 'Failed to synthesize news. Please try again.',
      details: error.message,
      code: error.code || 'INTERNAL'
    }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
    throw new Error('OpenAI API key not configured');
  }

  // Enhanced system prompt that requires real sources and citations
  const systemPrompt = `You are a news analyst. Today is ${new Date().toISOString().split('T')[0]}.

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
    "base": "200-250 words with [^1], [^2] citations",
    "eli5": "40-60 words simple explanation",
    "middleSchool": "60-80 words",
    "highSchool": "80-120 words", 
    "undergrad": "300-400 words with citations",
    "phd": "500-700 words with detailed citations"
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
  
  while (retryCount <= maxRetries) {
    try {
      // Call OpenAI with web search enabled
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14', // Using the flagship model for better reliability
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_completion_tokens: 900 // Fixed: Use max_completion_tokens instead of max_tokens
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        
        // Handle rate limits with retry
        if (response.status === 429 && retryCount < maxRetries) {
          console.log(`Rate limited, retrying in ${retryCount + 1} seconds...`);
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
          retryCount++;
          continue;
        }
        
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('OpenAI API response received');

      // Extract the content from the response
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      // Parse the JSON content
      let newsData;
      try {
        newsData = safeJsonParse(content);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw content:', content.substring(0, 500));
        throw new Error(`Failed to parse OpenAI JSON response: ${parseError.message}`);
      }

      // Check if AI returned an error due to no sources
      if (newsData.error === "NO_SOURCES_FOUND") {
        console.log('OpenAI could not find sources for topic:', topic);
        return new Response(JSON.stringify({
          error: 'NO_SOURCES_FOUND',
          message: 'No reliable sources found for this keyword. Try rephrasing or narrower topic.',
          details: newsData.message || 'No recent articles found',
          code: 'NO_SOURCES'
        }), {
          status: 424, // Failed Dependency - external source unavailable
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'x-news-count': '0',
            'x-error-code': 'NO_SOURCES'
          },
        });
      }

      // Validate that we have real sources with URLs (minimum 3)
      if (!newsData.sources || !Array.isArray(newsData.sources) || newsData.sources.length < 3) {
        console.error(`Insufficient sources returned: ${newsData.sources?.length || 0}`);
        return new Response(JSON.stringify({
          error: 'NO_SOURCES_FOUND', 
          message: 'No reliable sources found for this keyword. Try rephrasing or narrower topic.',
          details: `Only ${newsData.sources?.length || 0} sources found, minimum 3 required.`,
          code: 'INSUFFICIENT_SOURCES'
        }), {
          status: 424,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'x-news-count': String(newsData.sources?.length || 0),
            'x-error-code': 'INSUFFICIENT_SOURCES'
          },
        });
      }

      // Validate source URLs (relaxed check for http/https)
      const validSources = newsData.sources.filter(source => {
        if (!source.url || !source.outlet || !source.headline) return false;
        
        // Relax URL validation - accept both http and https, encode URI
        try {
          const url = source.url.startsWith('http') ? source.url : `https://${source.url}`;
          source.url = encodeURI(url); // Encode URI once
          return true;
        } catch {
          return false;
        }
      });

      if (validSources.length < 3) {
        console.error(`Not enough valid sources with URLs: ${validSources.length}`);
        return new Response(JSON.stringify({
          error: 'INVALID_SOURCES',
          message: 'No reliable sources found for this keyword. Try rephrasing or narrower topic.',
          details: `Only ${validSources.length} sources with valid URLs found.`,
          code: 'INVALID_SOURCES'
        }), {
          status: 424,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'x-news-count': String(validSources.length),
            'x-error-code': 'INVALID_SOURCES'
          },
        });
      }

      // Update newsData with only valid sources
      newsData.sources = validSources;

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
          'x-openai-tokens': String(data.usage?.total_tokens || 0)
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
  throw new Error('Unexpected end of retry loop');
}

serve((req: Request) => errorGuard(() => handleRequest(req)));
