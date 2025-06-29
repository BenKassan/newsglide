
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Build the system prompt
    const systemPrompt = `You are a news analyst. Today is ${new Date().toISOString().split('T')[0]}.

Use web search to find the 4 most recent articles about the topic from the last ${freshnessHorizonHours || 48} hours.

IMPORTANT: Carefully evaluate these metrics based on your analysis:

CONFIDENCE LEVEL:
- High: Multiple consistent sources, verified information, clear facts
- Medium: Some sources agree, some uncertainty or conflicting details
- Low: Limited sources, unverified claims, or highly speculative

TOPIC HOTNESS (Public Interest):
- High: Breaking news, trending topics, widespread social media discussion, major impact
- Medium: Regular news coverage, moderate public attention
- Low: Niche topics, limited coverage, specialized interest only

DISAGREEMENTS ANALYSIS:
Actively look for and identify disagreements between sources:
- Different reported facts, numbers, or outcomes
- Conflicting statements from officials or experts
- Varying interpretations of the same events
- Different emphasis or framing of the story
- Contradictory claims about causation or responsibility

Return ONLY valid JSON matching this exact structure. Keep all text fields concise to prevent truncation:

{
  "topic": "string",
  "headline": "string (max 100 chars)",
  "generatedAtUTC": "ISO timestamp",
  "confidenceLevel": "High|Medium|Low (based on source consistency and verification)",
  "topicHottness": "High|Medium|Low (based on current public interest and coverage volume)",
  "summaryPoints": ["3-4 bullet points, each max 150 chars"],
  "sourceAnalysis": {
    "narrativeConsistency": {"score": 1-10, "label": "Consistent|Mixed|Conflicting (based on how well sources agree)"},
    "publicInterest": {"score": 1-10, "label": "Viral|Popular|Moderate|Niche (based on engagement and coverage)"}
  },
  "disagreements": [
    {
      "pointOfContention": "specific disagreement topic (max 80 chars)",
      "details": "what sources disagree about specifically (max 200 chars)",
      "likelyReason": "why sources might disagree - bias, timing, access, etc (max 150 chars)"
    }
  ],
  "article": {
    "base": "200-300 words",
    "eli5": "50-75 words",
    "middleSchool": "75-100 words",
    "highSchool": "100-150 words",
    "undergrad": "400-600 words with detailed analysis, multiple perspectives, data interpretation, and contextual background",
    "phd": "800-1200 words with comprehensive analysis, methodological considerations, theoretical frameworks, interdisciplinary connections, historical context, expert opinions, statistical analysis, and potential research implications"
  },
  "keyQuestions": ["3 short questions"],
  "sources": [
    {
      "id": "s1",
      "outlet": "name",
      "type": "type",
      "url": "url",
      "headline": "headline (max 100 chars)",
      "publishedAt": "ISO timestamp",
      "analysisNote": "1 sentence about source reliability and perspective"
    }
  ],
  "missingSources": ["outlet names"]
}

CRITICAL: 
1. Base confidenceLevel on actual source verification and consistency
2. Base topicHottness on real-time search results and coverage volume
3. Provide honest assessment - not everything is "High"
4. ACTIVELY LOOK FOR DISAGREEMENTS - compare sources and identify where they conflict
5. For undergrad level: Include detailed analysis, multiple perspectives, data interpretation, and contextual background
6. For PhD level: Provide comprehensive analysis with methodological considerations, theoretical frameworks, interdisciplinary connections, historical context, expert opinions, statistical analysis, and research implications
7. Keep ALL other text concise. Return ONLY the JSON.`;

    const userPrompt = `Find current news about: ${topic}
Include temporal terms like "today", "June 2025", "latest" in searches.
Target outlets: ${targetOutlets.slice(0, 4).map(o => o.name).join(', ')}

Analyze the search results to determine:
- How many reliable sources are covering this?
- How consistent is the information across sources?
- What's the current level of public discussion/interest?
- Are there any conflicting reports or uncertainty?`;

    console.log('Making OpenAI API call for topic:', topic);

    // Call OpenAI Chat Completions API with JSON mode
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
        response_format: { type: "json_object" }, // Force valid JSON output
        temperature: 0.3,
        max_tokens: 4000
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

    // Parse the JSON content directly since we're using json_object mode
    let newsData;
    try {
      newsData = JSON.parse(content);
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
