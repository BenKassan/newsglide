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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId } = await req.json();

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client with service role for backend operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get or create conversation
    let activeConversationId = conversationId;

    if (!activeConversationId) {
      // Create new conversation
      const { data: newConversation, error: createError } = await supabaseClient
        .from('conversations')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (createError) throw createError;
      activeConversationId = newConversation.id;
    }

    // Save user message
    const { error: userMessageError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: activeConversationId,
        role: 'user',
        content: message
      });

    if (userMessageError) throw userMessageError;

    // Get conversation history for context
    const { data: previousMessages, error: historyError } = await supabaseClient
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', activeConversationId)
      .order('created_at', { ascending: true })
      .limit(20); // Last 20 messages for context

    if (historyError) throw historyError;

    // Get user preferences for personalization
    const { data: userData } = await supabaseClient
      .from('user_preferences')
      .select('interests, preferred_sources, interest_profile')
      .eq('user_id', user.id)
      .single();

    // Get current interest profile for progressive learning
    const currentInterests = userData?.interest_profile || { topics: {}, categories: {}, updated_at: new Date().toISOString() };
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
      { role: 'system', content: systemPrompt },
      ...previousMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }))
    ];

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not configured');
    }

    // Call Claude API with streaming
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: messages.filter(m => m.role !== 'system'),
        system: systemPrompt,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Claude API error');
    }

    // Stream response back to client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

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

          // Parse response to extract interests and recommendations
          let displayResponse = fullResponse;
          let extractedInterests = null;
          let recommendations = null;

          console.log('Full response length:', fullResponse.length);
          console.log('Full response preview:', fullResponse.substring(0, 500));

          // Extract [RESPONSE] section - if structured format is used
          const responseMatch = fullResponse.match(/\[RESPONSE\]([\s\S]*?)(?:\[INTERESTS\]|$)/);
          if (responseMatch) {
            displayResponse = responseMatch[1].trim();
            console.log('Found structured [RESPONSE] section');
          } else {
            // No structured format - use full response as-is
            console.log('No structured format found, using full response');
            displayResponse = fullResponse;
          }

          // Extract [INTERESTS] section
          const interestsMatch = fullResponse.match(/\[INTERESTS\]([\s\S]*?)(?:\[RECOMMENDATIONS\]|$)/);
          if (interestsMatch) {
            try {
              extractedInterests = JSON.parse(interestsMatch[1].trim());
              console.log('Extracted interests:', extractedInterests);
            } catch (e) {
              console.log('Failed to parse interests:', e);
            }
          }

          // Extract [RECOMMENDATIONS] section
          const recommendationsMatch = fullResponse.match(/\[RECOMMENDATIONS\]([\s\S]*?)$/);
          if (recommendationsMatch) {
            try {
              recommendations = JSON.parse(recommendationsMatch[1].trim());
              console.log('Extracted recommendations:', recommendations);
            } catch (e) {
              console.log('Failed to parse recommendations:', e);
            }
          }

          // Update user interest profile if interests were extracted
          if (extractedInterests && extractedInterests.topics && extractedInterests.topics.length > 0) {
            const updatedProfile = {
              topics: { ...currentInterests.topics },
              categories: { ...currentInterests.categories },
              updated_at: new Date().toISOString()
            };

            // Add/update topic weights
            for (const topic of extractedInterests.topics) {
              const currentWeight = updatedProfile.topics[topic] || 0;
              updatedProfile.topics[topic] = Math.min(1.0, currentWeight + 0.15);
            }

            // Add/update category weights
            if (extractedInterests.categories) {
              for (const category of extractedInterests.categories) {
                const currentWeight = updatedProfile.categories[category] || 0;
                updatedProfile.categories[category] = Math.min(1.0, currentWeight + 0.10);
              }
            }

            // Save updated profile
            await supabaseClient
              .from('user_preferences')
              .update({ interest_profile: updatedProfile })
              .eq('user_id', user.id);
          }

          // Save assistant response to database (with cleaned display response)
          await supabaseClient
            .from('messages')
            .insert({
              conversation_id: activeConversationId,
              role: 'assistant',
              content: displayResponse,
              metadata: {
                model: 'claude-3-5-sonnet-20241022',
                extractedInterests: extractedInterests,
                recommendations: recommendations
              }
            });

          // Send completion event with extracted data
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
            type: 'done',
            conversationId: activeConversationId,
            extractedInterests: extractedInterests,
            recommendations: recommendations
          })}\n\n`));

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: true, message: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
