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
    const memoryId = url.searchParams.get('id');

    if (req.method === 'GET') {
      // Get all memories for the user
      const { data: memories, error: listError } = await supabaseAdmin
        .from('user_memories')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (listError) {
        console.error('Error listing memories:', listError);
        throw listError;
      }

      return new Response(
        JSON.stringify({ memories: memories || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (req.method === 'POST') {
      // Rate limit POST operations (100 per minute)
      const identifier = getIdentifier(req, user.id);
      const rateLimit = checkRateLimit(identifier, 'memories:create', RateLimits.STANDARD);

      if (!rateLimit.allowed) {
        return rateLimitExceededResponse(rateLimit, RateLimits.STANDARD, corsHeaders);
      }

      // Create new memory
      const { memory_key, memory_value, category } = await req.json();

      // Validate input
      if (!memory_key || memory_key.trim().length === 0) {
        throw new Error('Memory key is required');
      }
      if (!memory_value || memory_value.trim().length === 0) {
        throw new Error('Memory value is required');
      }
      if (memory_key.length > 200) {
        throw new Error('Memory key must be 200 characters or less');
      }
      if (memory_value.length > 2000) {
        throw new Error('Memory value must be 2000 characters or less');
      }

      const { data, error } = await supabaseAdmin
        .from('user_memories')
        .insert({
          user_id: user.id,
          memory_key: memory_key.trim(),
          memory_value: memory_value.trim(),
          category: category?.trim() || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating memory:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ memory: data }),
        {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else if (req.method === 'PUT' && memoryId) {
      // Rate limit PUT operations (100 per minute)
      const identifier = getIdentifier(req, user.id);
      const rateLimit = checkRateLimit(identifier, 'memories:update', RateLimits.STANDARD);

      if (!rateLimit.allowed) {
        return rateLimitExceededResponse(rateLimit, RateLimits.STANDARD, corsHeaders);
      }

      // Update memory
      const updates = await req.json();
      const { memory_key, memory_value, category } = updates;

      // Validate input if provided
      if (memory_key !== undefined) {
        if (memory_key.trim().length === 0) {
          throw new Error('Memory key cannot be empty');
        }
        if (memory_key.length > 200) {
          throw new Error('Memory key must be 200 characters or less');
        }
      }
      if (memory_value !== undefined) {
        if (memory_value.trim().length === 0) {
          throw new Error('Memory value cannot be empty');
        }
        if (memory_value.length > 2000) {
          throw new Error('Memory value must be 2000 characters or less');
        }
      }

      const updateData: any = {};
      if (memory_key !== undefined) updateData.memory_key = memory_key.trim();
      if (memory_value !== undefined) updateData.memory_value = memory_value.trim();
      if (category !== undefined) updateData.category = category?.trim() || null;

      const { data, error } = await supabaseAdmin
        .from('user_memories')
        .update(updateData)
        .eq('id', memoryId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating memory:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ memory: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (req.method === 'DELETE' && memoryId) {
      // Rate limit DELETE operations (100 per minute)
      const identifier = getIdentifier(req, user.id);
      const rateLimit = checkRateLimit(identifier, 'memories:delete', RateLimits.STANDARD);

      if (!rateLimit.allowed) {
        return rateLimitExceededResponse(rateLimit, RateLimits.STANDARD, corsHeaders);
      }

      // Delete memory
      const { error } = await supabaseAdmin
        .from('user_memories')
        .delete()
        .eq('id', memoryId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting memory:', error);
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
    console.error('User memories error:', error);
    return new Response(
      JSON.stringify({ error: true, message: error.message }),
      {
        status: error.message === 'Unauthorized' ? 401 :
                error.message.includes('required') || error.message.includes('cannot be empty') || error.message.includes('must be') ? 400 :
                500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
