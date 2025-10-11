import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitExceededResponse, RateLimits, getIdentifier } from '../_shared/ratelimit.ts';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    console.log('=== Chat Message Function Started ===');

    // Parse request body
    const { message, conversationId } = await req.json();
    console.log('Received message:', message?.substring(0, 50) + '...');
    console.log('Conversation ID:', conversationId);

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      throw new Error('Missing authorization header');
    }
    console.log('Auth header present');

    // Initialize Supabase client with service role for backend operations
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      console.error('SUPABASE_URL:', SUPABASE_URL ? 'present' : 'missing');
      console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing');
      throw new Error('Server configuration error: Missing Supabase credentials');
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log('Supabase client initialized');

    // Get current user from the token
    const token = authHeader.replace('Bearer ', '');
    console.log('Extracting user from token...');

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError) {
      console.error('Auth error:', userError);
      throw new Error(`Authentication failed: ${userError.message}`);
    }

    if (!user) {
      console.error('No user found in token');
      throw new Error('User not found');
    }

    console.log('User authenticated:', user.id);

    // Rate limit AI calls (1000 per hour - very generous, only blocks abuse)
    const identifier = getIdentifier(req, user.id);
    const rateLimit = checkRateLimit(identifier, 'ai:chat', RateLimits.AI_CALLS);

    if (!rateLimit.allowed) {
      console.log('Rate limit exceeded for user:', user.id);
      return rateLimitExceededResponse(rateLimit, RateLimits.AI_CALLS, corsHeaders);
    }

    console.log('Rate limit check passed. Remaining:', rateLimit.remaining);

    // Get or create conversation
    let activeConversationId = conversationId;

    if (!activeConversationId) {
      console.log('Creating new conversation...');
      const { data: newConversation, error: createError } = await supabaseAdmin
        .from('conversations')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        throw new Error(`Failed to create conversation: ${createError.message}`);
      }
      activeConversationId = newConversation.id;
      console.log('New conversation created:', activeConversationId);
    }

    // Save user message
    console.log('Saving user message...');
    const { error: userMessageError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: activeConversationId,
        role: 'user',
        content: message
      });

    if (userMessageError) {
      console.error('Error saving user message:', userMessageError);
      throw new Error(`Failed to save message: ${userMessageError.message}`);
    }
    console.log('User message saved');

    // Get conversation history for context
    console.log('Fetching conversation history...');
    const { data: previousMessages, error: historyError } = await supabaseAdmin
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', activeConversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    if (historyError) {
      console.error('Error getting history:', historyError);
      // Don't throw, just continue without history
      console.log('Continuing without history');
    }
    console.log('Previous messages:', previousMessages?.length || 0);

    // Get user preferences for personalization
    console.log('Fetching user preferences...');
    const { data: userData, error: prefError } = await supabaseAdmin
      .from('user_preferences')
      .select('interests, preferred_sources, interest_profile')
      .eq('user_id', user.id)
      .maybeSingle();

    if (prefError) {
      console.error('Error fetching preferences:', prefError);
      // Continue without preferences
    }
    console.log('User preferences:', userData ? 'found' : 'not found');

    // Get user memories for personalization
    console.log('Fetching user memories...');
    const { data: userMemories, error: memoriesError } = await supabaseAdmin
      .from('user_memories')
      .select('memory_key, memory_value')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (memoriesError) {
      console.error('Error fetching memories:', memoriesError);
      // Continue without memories
    }
    console.log('User memories:', userMemories?.length || 0);

    // Get current interest profile for progressive learning
    const currentInterests = userData?.interest_profile || { topics: {}, categories: {} };
    const topInterests = Object.entries(currentInterests.topics || {})
      .sort(([,a]: any, [,b]: any) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);

    // Format memories for system prompt
    const memoriesContext = userMemories && userMemories.length > 0
      ? `\n\nWHAT YOU KNOW ABOUT THIS USER:\n${userMemories.map(m => `- ${m.memory_value}`).join('\n')}\n\nUse this information to provide personalized and contextually relevant responses.`
      : '';

    // Build system prompt with user context
    const systemPrompt = `You're Glidey, NewsGlide's news assistant. Keep it concise and natural.

${topInterests.length > 0 ? `User's interests: ${topInterests.join(', ')}` : 'New user, learning their interests'}
${userData?.preferred_sources ? `Preferred sources: ${userData.preferred_sources.join(', ')}` : ''}${memoriesContext}

How to respond:
- Answer what they ask, nothing more
- Skip pleasantries and preambles
- 1-2 short paragraphs max
- If they seem interested in something, you can mention it briefly
- Don't push topics or over-explain`;

    // Build messages for API
    const messages: ChatMessage[] = [
      ...((previousMessages || []).filter(msg => msg.role !== 'system').map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })))
    ];

    // Check for Anthropic API key
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

    if (!ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY not found in environment');
      console.log('Available env vars:', Object.keys(Deno.env.toObject()));
      throw new Error('AI service not configured. Please contact support.');
    }

    console.log('Anthropic API key found:', ANTHROPIC_API_KEY.substring(0, 20) + '...');

    // Call Claude API with streaming
    console.log('Calling Claude API...');
    console.log('Messages to send:', messages.length);

    const anthropicRequest = {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: messages,
      system: systemPrompt,
      stream: true
    };

    console.log('Request payload ready');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(anthropicRequest)
    });

    console.log('Claude API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error response:', errorText);

      let errorMessage = 'AI service error';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorJson.message || 'AI service error';
        console.error('Parsed error:', errorMessage);
      } catch (e) {
        console.error('Could not parse error response');
      }

      throw new Error(`AI service error: ${errorMessage}`);
    }

    console.log('Claude API call successful, starting stream...');

    // Stream response back to client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        if (!reader) {
          console.error('No reader available from response');
          controller.close();
          return;
        }

        try {
          console.log('Starting to read stream...');
          let chunkCount = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('Stream reading complete');
              break;
            }

            chunkCount++;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);

                  if (parsed.type === 'content_block_delta') {
                    const text = parsed.delta?.text || '';
                    fullResponse += text;
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`));
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }

          console.log('Stream processed, chunks:', chunkCount);
          console.log('Response length:', fullResponse.length);

          // Simple interest extraction based on mentioned topics
          const interestKeywords = [
            'technology', 'AI', 'artificial intelligence', 'climate', 'healthcare',
            'finance', 'business', 'science', 'politics', 'sports', 'entertainment',
            'crypto', 'blockchain', 'sustainability', 'energy', 'space', 'medicine'
          ];

          const mentionedInterests = interestKeywords.filter(keyword =>
            fullResponse.toLowerCase().includes(keyword.toLowerCase())
          );

          let extractedInterests = null;
          if (mentionedInterests.length > 0) {
            extractedInterests = {
              topics: mentionedInterests.slice(0, 3),
              categories: [],
              confidence: 0.7
            };
            console.log('Extracted interests:', extractedInterests.topics);
          }

          // Update user interest profile if interests were extracted
          if (extractedInterests && extractedInterests.topics && extractedInterests.topics.length > 0) {
            if (userData) {
              console.log('Updating user interest profile...');
              const updatedProfile = {
                topics: { ...currentInterests.topics },
                categories: { ...currentInterests.categories },
                updated_at: new Date().toISOString()
              };

              for (const topic of extractedInterests.topics) {
                const currentWeight = updatedProfile.topics[topic] || 0;
                updatedProfile.topics[topic] = Math.min(1.0, currentWeight + 0.15);
              }

              await supabaseAdmin
                .from('user_preferences')
                .update({ interest_profile: updatedProfile })
                .eq('user_id', user.id);
            } else {
              console.log('Creating user preferences...');
              await supabaseAdmin
                .from('user_preferences')
                .insert({
                  user_id: user.id,
                  interest_profile: {
                    topics: extractedInterests.topics.reduce((acc: any, topic: string) => {
                      acc[topic] = 0.15;
                      return acc;
                    }, {}),
                    categories: {},
                    updated_at: new Date().toISOString()
                  }
                })
                .select()
                .single();
            }
          }

          // Save assistant response to database
          console.log('Saving assistant response...');
          const { error: saveError } = await supabaseAdmin
            .from('messages')
            .insert({
              conversation_id: activeConversationId,
              role: 'assistant',
              content: fullResponse,
              metadata: {
                model: 'claude-sonnet-4-5-20250929',
                extractedInterests: extractedInterests
              }
            });

          if (saveError) {
            console.error('Error saving assistant response:', saveError);
            // Don't throw, message was already sent to user
          }

          // Send completion event with extracted data
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
            type: 'done',
            conversationId: activeConversationId,
            extractedInterests: extractedInterests
          })}\n\n`));

          controller.close();
          console.log('Stream closed successfully');
        } catch (error) {
          console.error('Stream processing error:', error);
          controller.error(error);
        }
      }
    });

    console.log('Returning stream response');
    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('=== CHAT FUNCTION ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Return user-friendly error message
    const userMessage = error.message.includes('AI service')
      ? error.message
      : 'Chat service temporarily unavailable. Please try again.';

    return new Response(
      JSON.stringify({
        error: true,
        message: userMessage,
        details: error.message // Include for debugging
      }),
      {
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});