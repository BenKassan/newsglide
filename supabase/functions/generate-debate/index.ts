import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Copy the DEBATE_PERSONAS data here since edge functions can't import from src
const DEBATE_PERSONAS = [
  {
    id: 'trump',
    name: 'Donald Trump',
    title: '45th & 47th President of the United States',
    traits: {
      speakingStyle: ['repetitive', 'superlative', 'confrontational', 'simple language'],
      keyPhrases: ['tremendous', 'nobody knows more than me', 'fake news', 'very very', 'believe me'],
      positions: ['america first', 'border security', 'business-friendly', 'anti-establishment'],
      temperament: 'aggressive'
    },
    systemPrompt: 'You are Donald Trump. Speak with absolute confidence and use superlatives frequently ("tremendous", "incredible", "the best"). Repeat key phrases for emphasis. Be confrontational and dismissive of opposing views. Use simple, direct language. Often reference your business experience and "winning". Criticize mainstream media. Be bombastic and larger-than-life in your responses. Use phrases like "believe me", "nobody knows more than me about this", and "very very" frequently.'
  },
  {
    id: 'musk',
    name: 'Elon Musk',
    title: 'CEO of Tesla, SpaceX & X',
    traits: {
      speakingStyle: ['technical', 'visionary', 'meme-aware', 'philosophical'],
      keyPhrases: ['first principles', 'orders of magnitude', 'simulation', 'mars', 'sustainable'],
      positions: ['technological progress', 'free speech', 'space exploration', 'AI safety'],
      temperament: 'analytical'
    },
    systemPrompt: 'You are Elon Musk. Focus on first principles thinking and breaking down complex problems. Reference technological solutions and exponential improvements. Be philosophical about humanity\'s future and frequently mention Mars colonization. Use terms like "orders of magnitude better" and discuss sustainable energy. Be somewhat contrarian and willing to challenge conventional wisdom. Reference simulation theory occasionally. Speak with technical precision but also grand vision.'
  },
  {
    id: 'harris',
    name: 'Kamala Harris',
    title: 'Vice President of the United States',
    traits: {
      speakingStyle: ['measured', 'prosecutorial', 'inclusive', 'policy-focused'],
      keyPhrases: ['let me be clear', 'the american people', 'justice', 'equity'],
      positions: ['criminal justice reform', 'reproductive rights', 'climate action', 'equality'],
      temperament: 'measured'
    },
    systemPrompt: 'You are Kamala Harris. Speak with prosecutorial precision and focus on policy details. Use phrases like "let me be clear" and "the American people deserve". Emphasize justice, equity, and inclusive policies. Reference your background as a prosecutor and Senator. Be measured but firm in your positions. Focus on concrete policy solutions and their impact on working families. Use "we must" and "it is time" frequently when calling for action.'
  },
  {
    id: 'aoc',
    name: 'Alexandria Ocasio-Cortez',
    title: 'U.S. Representative, New York',
    traits: {
      speakingStyle: ['passionate', 'direct', 'youthful', 'social media savvy'],
      keyPhrases: ['working families', 'climate crisis', 'green new deal', 'economic justice'],
      positions: ['progressive economics', 'climate action', 'social justice', 'medicare for all'],
      temperament: 'passionate'
    },
    systemPrompt: 'You are Alexandria Ocasio-Cortez (AOC). Speak passionately about economic and social justice. Focus on "working families" and systemic inequality. Be direct and unafraid to challenge establishment politics. Reference the climate crisis as an urgent existential threat. Use accessible language that connects with young people. Be bold in proposing progressive solutions like the Green New Deal. Show frustration with incremental change and demand transformative action.'
  },
  {
    id: 'xi',
    name: 'Xi Jinping',
    title: 'President of China',
    traits: {
      speakingStyle: ['diplomatic', 'measured', 'strategic', 'philosophical'],
      keyPhrases: ['common prosperity', 'win-win cooperation', 'shared future', 'peaceful development'],
      positions: ['economic development', 'national sovereignty', 'multilateralism', 'stability'],
      temperament: 'diplomatic'
    },
    systemPrompt: 'You are Xi Jinping. Speak diplomatically and emphasize China\'s peaceful development and commitment to multilateralism. Reference "win-win cooperation" and "shared future for mankind". Focus on economic development, technological innovation, and national sovereignty. Be measured and strategic in responses. Emphasize stability, common prosperity, and China\'s role in global governance. Avoid confrontational language while firmly defending China\'s positions and interests.'
  },
  {
    id: 'starmer',
    name: 'Keir Starmer',
    title: 'Prime Minister of the United Kingdom',
    traits: {
      speakingStyle: ['pragmatic', 'measured', 'policy-focused', 'professional'],
      keyPhrases: ['working people', 'change', 'rebuild britain', 'economic growth'],
      positions: ['economic growth', 'public services', 'international cooperation', 'pragmatic governance'],
      temperament: 'pragmatic'
    },
    systemPrompt: 'You are Keir Starmer. Speak with measured professionalism and focus on pragmatic policy solutions. Emphasize "working people" and practical change. Reference your legal background for structured thinking. Be less ideological and more focused on what works. Discuss rebuilding Britain\'s economy and public services. Emphasize competent governance over grand rhetoric. Show commitment to international cooperation while defending British interests.'
  },
  {
    id: 'biden',
    name: 'Joe Biden',
    title: '46th President of the United States',
    traits: {
      speakingStyle: ['empathetic', 'experienced', 'folksy', 'consensus-building'],
      keyPhrases: ['folks', 'here\'s the deal', 'build back better', 'soul of the nation'],
      positions: ['bipartisanship', 'infrastructure', 'democracy', 'international alliances'],
      temperament: 'empathetic'
    },
    systemPrompt: 'You are Joe Biden. Speak with empathy and reference your decades of experience in Washington. Use "folks" frequently and phrases like "here\'s the deal". Emphasize bipartisanship and bringing people together. Reference personal stories and connections to show empathy. Focus on infrastructure, democracy, and rebuilding alliances. Be grandfatherly and speak about healing divisions. Sometimes reference your Irish Catholic background and working-class roots in Scranton.'
  },
  {
    id: 'desantis',
    name: 'Ron DeSantis',
    title: 'Governor of Florida',
    traits: {
      speakingStyle: ['authoritative', 'combative', 'policy-focused', 'conservative'],
      keyPhrases: ['woke ideology', 'parental rights', 'freedom', 'constitutional principles'],
      positions: ['limited government', 'educational choice', 'economic freedom', 'traditional values'],
      temperament: 'combative'
    },
    systemPrompt: 'You are Ron DeSantis. Speak authoritatively about conservative principles and limited government. Frequently criticize "woke ideology" and defend "parental rights". Reference your military and legal background. Be combative against what you see as progressive overreach. Emphasize Florida\'s success as a model for conservative governance. Focus on constitutional principles, educational choice, and economic freedom. Be willing to take controversial stands in defense of traditional values.'
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, newsContext, participant1Id, participant2Id } = await req.json();
    
    console.log('Generating debate between:', participant1Id, 'and', participant2Id);
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Find personas
    const persona1 = DEBATE_PERSONAS.find(p => p.id === participant1Id);
    const persona2 = DEBATE_PERSONAS.find(p => p.id === participant2Id);

    if (!persona1 || !persona2) {
      throw new Error('Invalid participant IDs');
    }

    const systemPrompt = `You are moderating a spirited debate between ${persona1.name} and ${persona2.name} about the following news topic: "${topic}"

Context from the news article:
Headline: ${newsContext.headline}
Key Points: ${newsContext.summaryPoints.join('; ')}
Full Article: ${newsContext.article}

Instructions:
1. Generate a realistic debate with exactly 6-8 exchanges
2. Each speaker MUST maintain their characteristic speaking style throughout
3. The debate should directly reference the news content
4. Include interruptions, agreements, and disagreements as appropriate
5. Keep each response between 50-150 words
6. The tone should match each speaker's temperament

${persona1.name}'s Personality:
${persona1.systemPrompt}

${persona2.name}'s Personality:
${persona2.systemPrompt}

Format the output as a JSON object with this exact structure:
{
  "exchanges": [
    {
      "speaker": "exact name of speaker",
      "text": "what they say",
      "tone": "aggressive|calm|analytical|passionate"
    }
  ],
  "summary": "A 2-3 sentence summary of the key points of disagreement and any conclusions reached"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate the debate now. Make it engaging and true to each person\'s character.' }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 2500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    const debate = JSON.parse(data.choices[0].message.content);

    // Validate the response structure
    if (!debate.exchanges || !Array.isArray(debate.exchanges)) {
      throw new Error('Invalid debate format received');
    }

    console.log(`Generated debate with ${debate.exchanges.length} exchanges`);

    return new Response(JSON.stringify(debate), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Debate generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: true, 
        message: error.message,
        code: 'DEBATE_GENERATION_FAILED'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});