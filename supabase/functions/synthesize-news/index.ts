
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
    const { topic, targetOutlets, freshnessHorizonHours, targetWordCount } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Synthesizing news for topic:', topic);

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

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        instructions: systemPrompt,
        input: userPrompt,
        tools: [{ 
          type: 'web_search_preview',
          search_context_size: 'medium'
        }],
        tool_choice: { type: 'web_search_preview' }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    // Parse response with proper type checking
    let outputText = '';
    
    if (data.output && Array.isArray(data.output)) {
      // Find the message output item
      const messageOutput = data.output.find(item => 
        item.type === 'message' && item.content && item.content[0] && item.content[0].text
      );
      
      if (messageOutput && messageOutput.content && messageOutput.content[0] && messageOutput.content[0].text) {
        outputText = messageOutput.content[0].text;
      }
    }
    
    // Fallback to legacy structure if new structure not found
    if (!outputText && data.output_text) {
      outputText = data.output_text;
    }

    if (!outputText) {
      console.error('No output text found in response:', data);
      throw new Error('No output text in response');
    }

    console.log('Output text length:', outputText.length);

    let newsData;
    let parseSuccess = false;

    // Try direct JSON parse first
    try {
      newsData = JSON.parse(outputText.trim());
      parseSuccess = true;
      console.log('Direct JSON parse successful');
    } catch (e1) {
      console.log('Direct parse failed, trying cleanup strategies...');
      
      // Clean up common formatting issues
      try {
        let cleaned = outputText
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();
        
        const jsonStart = cleaned.indexOf('{');
        const jsonEnd = cleaned.lastIndexOf('}');
        
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
          newsData = JSON.parse(cleaned);
          parseSuccess = true;
          console.log('Cleanup parse successful');
        }
      } catch (e2) {
        console.log('Cleanup parse failed, attempting repair...');
        
        // Try to repair truncated JSON
        try {
          let repaired = outputText.trim();
          
          repaired = repaired.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
          
          const jsonStart = repaired.indexOf('{');
          if (jsonStart >= 0) {
            repaired = repaired.slice(jsonStart);
            
            // Count braces and brackets to fix truncation
            let braceCount = 0;
            let bracketCount = 0;
            let inString = false;
            let escapeNext = false;
            
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
                continue;
              }
              
              if (!inString) {
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
                if (char === '[') bracketCount++;
                if (char === ']') bracketCount--;
              }
            }
            
            // Add missing closing brackets/braces
            while (bracketCount > 0) {
              repaired += ']';
              bracketCount--;
            }
            while (braceCount > 0) {
              repaired += '}';
              braceCount--;
            }
            
            // Remove trailing commas
            repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
            
            newsData = JSON.parse(repaired);
            parseSuccess = true;
            console.log('Successfully repaired truncated JSON');
          }
        } catch (e3) {
          console.error('All parsing strategies failed:', e3);
          throw new Error(`JSON parsing failed after all attempts: ${e1}`);
        }
      }
    }

    if (!parseSuccess || !newsData) {
      throw new Error('Failed to parse response into valid NewsData structure');
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

    console.log(`Successfully synthesized news with ${validated.sources.length} sources`);

    return new Response(JSON.stringify(validated), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in synthesize-news function:', error);
    
    const errorResponse = {
      topic: 'Error',
      headline: 'Unable to fetch current news',
      generatedAtUTC: new Date().toISOString(),
      confidenceLevel: 'Low',
      topicHottness: 'Low',
      summaryPoints: [
        'Failed to retrieve news articles',
        error instanceof Error ? error.message : 'Unknown error',
        'Please try again or contact support'
      ],
      sourceAnalysis: {
        narrativeConsistency: { score: 0, label: 'Error' },
        publicInterest: { score: 0, label: 'Error' }
      },
      disagreements: [],
      article: {
        base: 'Unable to generate article due to error.',
        eli5: 'Something went wrong.',
        middleSchool: 'An error occurred.',
        highSchool: 'The system encountered an error.',
        undergrad: 'System error during processing.',
        phd: 'Critical system failure.'
      },
      keyQuestions: [
        'Is the API key valid?',
        'Is the topic too complex?',
        'Should we retry with simpler parameters?'
      ],
      sources: [],
      missingSources: []
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
