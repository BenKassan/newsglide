import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const conversationId = url.searchParams.get('id');

    if (req.method === 'GET') {
      if (conversationId) {
        // Get specific conversation with messages
        const { data: conversation, error: convError } = await supabaseClient
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .eq('user_id', user.id)
          .single();

        if (convError) throw convError;

        const { data: messages, error: messagesError } = await supabaseClient
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;

        return new Response(
          JSON.stringify({ conversation, messages }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // List all conversations
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const offset = parseInt(url.searchParams.get('offset') || '0');

        const { data: conversations, error: listError, count } = await supabaseClient
          .from('conversations')
          .select('*, messages(id, role, content, created_at)', { count: 'exact' })
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (listError) throw listError;

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
      // Update conversation (e.g., rename)
      const { title } = await req.json();

      const { data, error } = await supabaseClient
        .from('conversations')
        .update({ title })
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ conversation: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (req.method === 'DELETE' && conversationId) {
      // Delete conversation
      const { error } = await supabaseClient
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;

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
