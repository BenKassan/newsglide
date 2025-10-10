import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitExceededResponse, RateLimits, getIdentifier } from '../_shared/ratelimit.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
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

    const url = new URL(req.url);
    const conversationId = url.searchParams.get('id');

    if (req.method === 'GET') {
      if (conversationId) {
        // Get specific conversation with messages
        const { data: conversation, error: convError } = await supabaseAdmin
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .eq('user_id', user.id)
          .single();

        if (convError) {
          console.error('Error getting conversation:', convError);
          throw convError;
        }

        const { data: messages, error: messagesError } = await supabaseAdmin
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (messagesError) {
          console.error('Error getting messages:', messagesError);
          throw messagesError;
        }

        return new Response(
          JSON.stringify({ conversation, messages }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // List all conversations
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        const { data: conversations, error: listError, count } = await supabaseAdmin
          .from('conversations')
          .select('*, messages(id, role, content, created_at)', { count: 'exact' })
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (listError) {
          console.error('Error listing conversations:', listError);
          throw listError;
        }

        // Get first message for each conversation as preview
        const conversationsWithPreview = conversations.map(conv => ({
          ...conv,
          preview: conv.messages?.[0]?.content?.substring(0, 100) || 'New conversation',
          messageCount: conv.messages?.length || 0,
          messages: undefined // Remove messages from list view
        }));

        return new Response(
          JSON.stringify({
            conversations: conversationsWithPreview,
            total: count,
            hasMore: (offset + limit) < (count || 0)
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (req.method === 'PATCH' && conversationId) {
      // Rate limit PATCH operations (100 per minute)
      const identifier = getIdentifier(req, user.id);
      const rateLimit = checkRateLimit(identifier, 'conversations:update', RateLimits.STANDARD);

      if (!rateLimit.allowed) {
        return rateLimitExceededResponse(rateLimit, RateLimits.STANDARD, corsHeaders);
      }

      // Update conversation (e.g., rename)
      const { title } = await req.json();

      const { data, error } = await supabaseAdmin
        .from('conversations')
        .update({ title })
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating conversation:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ conversation: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (req.method === 'DELETE' && conversationId) {
      // Rate limit DELETE operations (100 per minute - generous but prevents abuse)
      const identifier = getIdentifier(req, user.id);
      const rateLimit = checkRateLimit(identifier, 'conversations:delete', RateLimits.STANDARD);

      if (!rateLimit.allowed) {
        return rateLimitExceededResponse(rateLimit, RateLimits.STANDARD, corsHeaders);
      }

      // Delete conversation
      const { error } = await supabaseAdmin
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting conversation:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      throw new Error('Method not allowed');
    }

  } catch (error) {
    console.error('Conversations error:', error);
    return new Response(
      JSON.stringify({ error: true, message: error.message }),
      {
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
