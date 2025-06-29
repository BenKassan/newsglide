
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'x-error-code, x-news-count, x-openai-tokens',
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

  // Updated system prompt that generates plausible content based on typical news coverage patterns
  const systemPrompt = `You are a news analyst creating a synthesis based on typical news coverage patterns. Today is ${new Date().toISOString().split('T')[0]}.

IMPORTANT: You will generate a plausible news synthesis based on how major outlets typically cover such topics. The sources will be representative examples of how outlets like ${targetOutlets.map(o => o.name).join(', ')} would typically cover this topic.

CONFIDENCE LEVELS:
- High: Well-established topic with consistent coverage patterns
- Medium: Regular coverage with some variation in approach
- Low: Emerging or niche topic with limited typical coverage

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
      "outlet": "outlet name from target list",
      "type": "News Agency|National Newspaper|Broadcast Media|Online Media",
      "url": "https://example.com/article-url",
      "headline": "plausible article headline (max 80 chars)",
      "publishedAt": "ISO timestamp from last ${freshnessHorizonHours || 48} hours",
      "analysisNote": "1 sentence about this source's typical perspective"
    }
  ],
  "missingSources": []
}

Generate plausible example URLs and ensure all content reflects how this topic would typically be covered by major news outlets. Create at least 3-4 representative sources.`;

  const userPrompt = `Create a news synthesis for: ${topic}

Generate plausible coverage based on how outlets like ${targetOutlets.map(o => o.name).join(', ')} would typically cover this topic.

Show how different types of media (${targetOutlets.map(o => o.type).join(', ')}) might approach this story differently.`;

  console.log('Making OpenAI API call for topic:', topic);

  // Setup timeout and retry logic
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      // Call OpenAI with a valid model and increased token limit
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 2000
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
        
        // Handle rate limits with retry
        if (response.status === 429 && retryCount < maxRetries) {
          console.log(`Rate limited, retrying in ${retryCount + 1} seconds...`);
          await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
          retryCount++;
          continue;
        }
        
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

      // Validate basic structure - relaxed validation for generated content
      if (!newsData.sources || !Array.isArray(newsData.sources) || newsData.sources.length < 3) {
        console.error(`Insufficient sources returned: ${newsData.sources?.length || 0}`);
        const error = new Error('AI failed to generate sufficient example sources');
        error.code = 'INSUFFICIENT_CONTENT';
        throw error;
      }

      // Basic validation for sources - ensure they have required fields
      const validSources = newsData.sources.filter(source => 
        source.url && source.outlet && source.headline
      );

      if (validSources.length < 3) {
        console.error(`Not enough valid sources generated: ${validSources.length}`);
        const error = new Error('AI failed to generate valid example sources');
        error.code = 'INVALID_CONTENT';
        throw error;
      }

      // Update newsData with only valid sources
      newsData.sources = validSources;

      console.log(`Successfully generated news synthesis with ${validSources.length} example sources`);

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
          'x-openai-tokens': String(data.usage?.total_tokens || 0),
          'x-model-used': 'gpt-4-turbo-preview'
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
