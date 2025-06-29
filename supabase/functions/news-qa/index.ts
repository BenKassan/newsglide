
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, topic, context } = await req.json();
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Build context from the news analysis
    const newsContext = `
Topic: ${topic}
Headline: ${context.headline}
Key Points: ${context.summaryPoints.join('; ')}
Sources: ${context.sources.map(s => `${s.outlet}: "${s.headline}"`).join('; ')}
`;

    // Build conversation history
    const messages = [
      {
        role: 'system',
        content: `You are a helpful news analyst assistant. You have access to a news synthesis about "${topic}". 
Answer questions based on the provided context and your knowledge. Be concise but informative.
If asked about sources, reference the actual news outlets provided.
Context: ${newsContext}`
      }
    ];

    // Add previous messages if any
    if (context.previousMessages && context.previousMessages.length > 0) {
      context.previousMessages.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
    }

    // Add current question
    messages.push({
      role: 'user',
      content: question
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500 // Keep responses concise
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    const answer = data.choices[0].message.content;

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Q&A error:', error);
    return new Response(
      JSON.stringify({ error: true, message: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
