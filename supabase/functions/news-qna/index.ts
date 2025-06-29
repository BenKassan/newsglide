
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'x-error-code, x-openai-tokens, x-model-qna',
};

const QNA_MODEL = Deno.env.get('MODEL_FOLLOWUP') || 'gpt-4o';

async function errorGuard(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error: any) {
    console.error('QNA_ERROR', { 
      message: error.message, 
      stack: error.stack,
      code: error.code || 'INTERNAL'
    });
    
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { question, context } = await req.json();
  
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  if (!OPENAI_API_KEY) {
    const error = new Error('OpenAI API key not configured');
    error.code = 'CONFIG_ERROR';
    throw error;
  }

  if (!question || !context) {
    const error = new Error('Question and context are required');
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  console.log('Processing Q&A with model:', QNA_MODEL);

  const systemPrompt = `You are a news analysis assistant. Answer questions based on the provided news context.

Guidelines:
- Answer briefly and accurately based on the provided context
- Use citations [^1], [^2] when referencing specific sources
- If the context doesn't contain enough information, say so clearly
- Maintain journalistic objectivity
- Return your response as JSON: {"answer": "your answer here"}`;

  const userPrompt = `Context:\n${JSON.stringify(context, null, 2)}\n\nQuestion: ${question}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: QNA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 600
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
      
      console.error('OPENAI_QNA_ERROR', response.status, errorData);
      
      const error = new Error(errorData?.error?.message || `OpenAI API error: ${response.status}`);
      error.code = response.status === 429 ? 'RATE_LIMIT' : 'OPENAI';
      error.details = errorData;
      throw error;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      const error = new Error('No content in OpenAI response');
      error.code = 'OPENAI';
      throw error;
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      const error = new Error(`Failed to parse response: ${parseError.message}`);
      error.code = 'PARSE_ERROR';
      throw error;
    }

    console.log('Q&A response generated successfully');

    return new Response(JSON.stringify({
      answer: parsedResponse.answer || 'Unable to generate response',
      tokens_used: data.usage?.total_tokens || 0
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'x-openai-tokens': String(data.usage?.total_tokens || 0),
        'x-model-qna': QNA_MODEL
      },
    });

  } catch (error: any) {
    throw error; // Let errorGuard handle it
  }
}

serve((req: Request) => errorGuard(() => handleRequest(req)));
