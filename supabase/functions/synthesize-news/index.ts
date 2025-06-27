
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

interface SynthesisRequest {
  topic: string;
  targetOutlets: Array<{
    name: string;
    type: 'News Agency' | 'National Newspaper' | 'Broadcast Media' | 'Online Media';
  }>;
  freshnessHorizonHours?: number;
  targetWordCount?: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { topic, targetOutlets, freshnessHorizonHours, targetWordCount }: SynthesisRequest = await req.json()

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

    const userPrompt = `${systemPrompt}

Find current news about: ${topic}
Include temporal terms like "today", "June 2025", "latest" in searches.
Target outlets: ${targetOutlets.slice(0, 4).map(o => o.name).join(', ')}

Analyze the search results to determine:
- How many reliable sources are covering this?
- How consistent is the information across sources?
- What's the current level of public discussion/interest?
- Are there any conflicting reports or uncertainty?`;

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        input: userPrompt,
        tools: [{ 
          type: 'web_search_preview',
          search_context_size: 'medium'
        }],
        tool_choice: { type: 'web_search_preview' }
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`)
    }

    // Parse response with proper type checking
    let outputText = '';
    
    if (data.output && Array.isArray(data.output)) {
      const messageOutput = data.output.find((item: any) => 
        item.type === 'message' && item.content && Array.isArray(item.content)
      );
      
      if (messageOutput && messageOutput.content[0] && messageOutput.content[0].text) {
        outputText = messageOutput.content[0].text;
      }
    }
    
    if (!outputText && data.output_text) {
      outputText = data.output_text;
    }

    if (!outputText) {
      throw new Error('No output text in OpenAI response')
    }

    // Clean and parse JSON response
    let newsData;
    try {
      newsData = JSON.parse(outputText.trim());
    } catch (e) {
      // Try cleanup strategies
      let cleaned = outputText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      
      const jsonStart = cleaned.indexOf('{');
      const jsonEnd = cleaned.lastIndexOf('}');
      
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
        newsData = JSON.parse(cleaned);
      } else {
        throw new Error('Failed to parse OpenAI response as JSON')
      }
    }

    // Validate and clean the data
    const validated = {
      topic: newsData.topic || topic,
      headline: (newsData.headline || `News Update: ${topic}`).substring(0, 100),
      generatedAtUTC: newsData.generatedAtUTC || new Date().toISOString(),
      confidenceLevel: newsData.confidenceLevel || 'Medium',
      topicHottness: newsData.topicHottness || 'Medium',
      summaryPoints: Array.isArray(newsData.summaryPoints) 
        ? newsData.summaryPoints.slice(0, 5).map(p => p.substring(0, 150))
        : ['No summary available'],
      sourceAnalysis: {
        narrativeConsistency: {
          score: newsData.sourceAnalysis?.narrativeConsistency?.score || 5,
          label: newsData.sourceAnalysis?.narrativeConsistency?.label || 'Medium'
        },
        publicInterest: {
          score: newsData.sourceAnalysis?.publicInterest?.score || 5,
          label: newsData.sourceAnalysis?.publicInterest?.label || 'Medium'
        }
      },
      disagreements: Array.isArray(newsData.disagreements) 
        ? newsData.disagreements.slice(0, 3)
        : [],
      article: {
        base: newsData.article?.base || 'Article content unavailable.',
        eli5: newsData.article?.eli5 || 'Simple explanation unavailable.',
        middleSchool: newsData.article?.middleSchool || 'Explanation unavailable.',
        highSchool: newsData.article?.highSchool || 'Explanation unavailable.',
        undergrad: newsData.article?.undergrad || 'Analysis unavailable.',
        phd: newsData.article?.phd || 'Technical analysis unavailable.'
      },
      keyQuestions: Array.isArray(newsData.keyQuestions) 
        ? newsData.keyQuestions.slice(0, 5)
        : ['What are the latest developments?'],
      sources: Array.isArray(newsData.sources) 
        ? newsData.sources.slice(0, 4).map((s, i) => ({
            id: s.id || `source_${i + 1}`,
            outlet: s.outlet || 'Unknown',
            type: s.type || 'Unknown',
            url: s.url || '',
            headline: (s.headline || 'No headline').substring(0, 100),
            publishedAt: s.publishedAt || new Date().toISOString(),
            analysisNote: (s.analysisNote || 'No analysis').substring(0, 100)
          }))
        : [],
      missingSources: Array.isArray(newsData.missingSources) 
        ? newsData.missingSources 
        : []
    };

    return new Response(JSON.stringify(validated), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Function error:', error)
    
    const errorResponse = {
      topic: 'Error',
      headline: 'Unable to process news request',
      generatedAtUTC: new Date().toISOString(),
      confidenceLevel: 'Low',
      topicHottness: 'Low',
      summaryPoints: [
        'Service temporarily unavailable',
        error instanceof Error ? error.message : 'Unknown error',
        'Please try again in a moment'
      ],
      sourceAnalysis: {
        narrativeConsistency: { score: 0, label: 'Error' },
        publicInterest: { score: 0, label: 'Error' }
      },
      disagreements: [],
      article: {
        base: 'Unable to generate article due to service error.',
        eli5: 'Something went wrong.',
        middleSchool: 'A service error occurred.',
        highSchool: 'The system encountered a service error.',
        undergrad: 'Service error during processing.',
        phd: 'Critical service failure in backend processing.'
      },
      keyQuestions: [
        'Is the service temporarily down?',
        'Should we retry the request?',
        'Is this a known issue?'
      ],
      sources: [],
      missingSources: []
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
