import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Get current interest profile for progressive learning
    const currentInterests = userData?.interest_profile || { topics: {}, categories: {} };
    const topInterests = Object.entries(currentInterests.topics || {})
      .sort(([,a]: any, [,b]: any) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);

    // Build system prompt with user context
    const systemPrompt = `You are a helpful news discovery assistant for NewsGlide. You help users find relevant news articles and answer questions about current events.

User Profile:
${topInterests.length > 0 ? `- Known Interests: ${topInterests.join(', ')}` : '- New user discovering interests'}
${userData?.preferred_sources ? `- Preferred Sources: ${userData.preferred_sources.join(', ')}` : ''}

Your role:
- Help users discover news they'll find interesting
- Answer questions about current events
- Recommend specific news topics based on their interests
- Explain complex news topics in an accessible way

Style:
- Be conversational and friendly
- Keep responses concise (2-3 paragraphs max)
- Avoid preambles like "Great question!" or "I'd be happy to help"
- When you detect strong interests (after 3+ exchanges), naturally suggest 2-3 specific news topics they might enjoy`;

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
      model: 'claude-3-5-sonnet-20241022',
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
                model: 'claude-3-5-sonnet-20241022',
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