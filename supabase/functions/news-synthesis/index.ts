
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, targetOutlets, freshnessHorizonHours } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Build the system prompt with more concise requirements to avoid truncation
    const systemPrompt = `You are a news analyst. Today is ${new Date().toISOString().split('T')[0]}.

Use web search to find the 4 most recent articles about the topic from the last ${freshnessHorizonHours || 48} hours.

IMPORTANT: Keep all responses concise to prevent truncation.

CONFIDENCE LEVEL:
- High: Multiple consistent sources, verified information
- Medium: Some sources agree, some uncertainty  
- Low: Limited sources, unverified claims

TOPIC HOTNESS:
- High: Breaking news, trending topics, major impact
- Medium: Regular coverage, moderate attention
- Low: Niche topics, limited coverage

Return ONLY valid JSON matching this structure. Keep text fields SHORT:

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
    "base": "200-250 words",
    "eli5": "40-60 words",
    "middleSchool": "60-80 words", 
    "highSchool": "80-120 words",
    "undergrad": "300-400 words",
    "phd": "500-700 words"
  },
  "keyQuestions": ["3 short questions"],
  "sources": [
    {
      "id": "s1",
      "outlet": "name",
      "type": "type",
      "url": "url",
      "headline": "headline (max 80 chars)",
      "publishedAt": "ISO timestamp",
      "analysisNote": "1 sentence about source"
    }
  ],
  "missingSources": ["outlet names"]
}

CRITICAL: Keep ALL text concise. Return ONLY the JSON.`;

    const userPrompt = `Find current news about: ${topic}
Target outlets: ${targetOutlets.slice(0, 4).map(o => o.name).join(', ')}`;

    console.log('Making OpenAI API call for topic:', topic);

    // Call OpenAI with reduced max_tokens to prevent truncation
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 3000 // Reduced to prevent truncation
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI API response received');

    // Extract the content from the response
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse the JSON content with improved error handling
    let newsData;
    try {
      newsData = safeJsonParse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw content:', content.substring(0, 500));
      throw new Error(`Failed to parse OpenAI JSON response: ${parseError.message}`);
    }

    return new Response(JSON.stringify({
      output: [{
        type: 'message',
        content: [{ text: JSON.stringify(newsData) }]
      }]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in news-synthesis function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to synthesize news. Please try again.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
