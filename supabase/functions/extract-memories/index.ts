import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitExceededResponse, RateLimits, getIdentifier } from '../_shared/ratelimit.ts';

interface ExtractMemoriesRequest {
  conversation_id: string;
  message_id?: string;
  user_message?: string;
  assistant_response?: string;
}

interface ExtractedMemory {
  memory_type: 'personal_info' | 'preference' | 'goal' | 'context' | 'relationship' | 'experience' | 'interest' | 'constraint';
  memory_key: string;
  memory_content: string;
  confidence_score: number;
  importance_score: number;
  expires_at?: string;
  source_text?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    console.log('=== Extract Memories Function Started ===');

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current user from the token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    // Rate limit (10 per minute - extraction is expensive)
    const identifier = getIdentifier(req, user.id);
    const rateLimit = checkRateLimit(identifier, 'memories:extract', {
      requests_per_minute: 10,
      requests_per_hour: 100
    });

    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit, RateLimits.STANDARD, corsHeaders);
    }

    // Parse request
    const body: ExtractMemoriesRequest = await req.json();
    console.log('Extracting memories for conversation:', body.conversation_id);

    // Get conversation messages if not provided
    let userMessage = body.user_message;
    let assistantResponse = body.assistant_response;

    if (!userMessage || !assistantResponse) {
      // Fetch from database
      const { data: messages, error: messagesError } = await supabaseAdmin
        .from('messages')
        .select('role, content')
        .eq('conversation_id', body.conversation_id)
        .order('created_at', { ascending: false })
        .limit(2);

      if (messagesError || !messages || messages.length === 0) {
        throw new Error('Could not find conversation messages');
      }

      // Find the most recent user and assistant messages
      const recentUser = messages.find(m => m.role === 'user');
      const recentAssistant = messages.find(m => m.role === 'assistant');

      userMessage = recentUser?.content || '';
      assistantResponse = recentAssistant?.content || '';
    }

    if (!userMessage) {
      console.log('No user message to extract from');
      return new Response(
        JSON.stringify({ memories: [], message: 'No content to extract from' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Claude API to extract memories
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('AI service not configured');
    }

    const extractionPrompt = `You are a memory extraction system. Analyze the following conversation and extract important personal facts about the user that should be remembered for future conversations.

USER MESSAGE:
${userMessage}

ASSISTANT RESPONSE:
${assistantResponse || 'N/A'}

Extract memories in the following categories:
- personal_info: Name, occupation, location, age, etc.
- preference: Likes, dislikes, opinions, favorites
- goal: Aspirations, plans, objectives, things they want to achieve
- context: Current situation, circumstances, what's happening in their life
- relationship: Family, friends, colleagues mentioned
- experience: Past events, stories shared, things they've done
- interest: Topics they're interested in or curious about
- constraint: Limitations, restrictions (time, budget, health, etc)

For each memory, provide:
1. A brief key (max 200 chars) summarizing what it's about
2. The full memory content (max 2000 chars)
3. Confidence score (0.0-1.0) - how certain you are this is accurate
4. Importance score (0.0-1.0) - how important this is to remember
5. Expiry date (if temporal) - when this fact might no longer be relevant

IMPORTANT:
- Only extract facts explicitly stated or clearly implied
- Don't make assumptions or inferences beyond what's directly stated
- Focus on facts that would be useful to remember in future conversations
- If the user corrects something, mark the old fact as obsolete
- Be conservative with confidence scores

Return as JSON array of memories. If no significant memories found, return empty array.

Example response:
[
  {
    "memory_type": "personal_info",
    "memory_key": "Works as software engineer at Google",
    "memory_content": "The user works as a software engineer at Google, mentioned when discussing their interest in AI technology",
    "confidence_score": 0.95,
    "importance_score": 0.9,
    "source_text": "I work as a software engineer at Google"
  },
  {
    "memory_type": "goal",
    "memory_key": "Planning to move to Austin",
    "memory_content": "User is planning to move to Austin, Texas next month for a new job opportunity",
    "confidence_score": 0.9,
    "importance_score": 0.8,
    "expires_at": "2025-02-15",
    "source_text": "I'm planning to move to Austin next month"
  }
]`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307', // Use Haiku for cost efficiency
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: extractionPrompt
        }],
        system: 'You are a precise memory extraction system. Return only valid JSON array of extracted memories, or empty array if none found.'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      throw new Error('Failed to extract memories');
    }

    const claudeResponse = await response.json();
    let extractedMemories: ExtractedMemory[] = [];

    try {
      // Parse the response to get memories
      const content = claudeResponse.content[0].text;

      // Try to extract JSON from the response (it might have extra text)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        extractedMemories = JSON.parse(jsonMatch[0]);
      } else {
        console.log('No memories found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse extracted memories:', parseError);
      // Continue with empty memories rather than failing
    }

    console.log(`Extracted ${extractedMemories.length} memories`);

    // Store extracted memories in database
    const storedMemories = [];
    for (const memory of extractedMemories) {
      // Validate memory
      if (!memory.memory_key || !memory.memory_content || !memory.memory_type) {
        console.log('Skipping invalid memory:', memory);
        continue;
      }

      // Ensure confidence score is reasonable
      if (memory.confidence_score < 0.5) {
        console.log('Skipping low confidence memory:', memory.memory_key);
        continue;
      }

      try {
        const { data, error } = await supabaseAdmin
          .from('extracted_memories')
          .insert({
            user_id: user.id,
            conversation_id: body.conversation_id,
            message_id: body.message_id || null,
            memory_type: memory.memory_type,
            memory_key: memory.memory_key.substring(0, 200),
            memory_content: memory.memory_content.substring(0, 2000),
            confidence_score: Math.min(1, Math.max(0, memory.confidence_score)),
            importance_score: Math.min(1, Math.max(0, memory.importance_score || 0.5)),
            expires_at: memory.expires_at || null,
            source_text: memory.source_text?.substring(0, 500) || null,
            auto_extracted: true,
            verification_status: 'unverified',
            metadata: {
              extraction_model: 'claude-3-haiku',
              extraction_date: new Date().toISOString()
            }
          })
          .select()
          .single();

        if (error) {
          console.error('Error storing memory:', error);
        } else {
          storedMemories.push(data);
          console.log('Stored memory:', memory.memory_key);
        }
      } catch (storeError) {
        console.error('Failed to store memory:', storeError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        memories_extracted: storedMemories.length,
        memories: storedMemories,
        message: `Extracted and stored ${storedMemories.length} memories`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201
      }
    );

  } catch (error) {
    console.error('Extract memories error:', error);
    return new Response(
      JSON.stringify({
        error: true,
        message: error.message || 'Failed to extract memories'
      }),
      {
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});