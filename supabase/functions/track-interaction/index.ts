import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitExceededResponse, RateLimits, getIdentifier } from '../_shared/ratelimit.ts';

interface InteractionRequest {
  topic: string;
  action_type: 'view' | 'read' | 'abandon' | 'save' | 'share' | 'reading_level_change' | 'source_click' | 'copy' | 'debate_view';
  reading_level?: 'base' | 'eli5' | 'phd';
  duration_seconds?: number;
  scroll_depth?: number;
  source_outlet?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    console.log('=== Track Interaction Function Started ===');

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
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

    // Rate limiting (generous - 500 per minute)
    const identifier = getIdentifier(req, user.id);
    const rateLimit = checkRateLimit(identifier, 'interactions:track', {
      requests_per_minute: 500,
      requests_per_hour: 10000
    });

    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit, RateLimits.STANDARD, corsHeaders);
    }

    // Parse request body
    const body: InteractionRequest = await req.json();
    console.log('Tracking interaction:', body.action_type, 'for topic:', body.topic);

    // Validate required fields
    if (!body.topic || !body.action_type) {
      throw new Error('Missing required fields: topic and action_type');
    }

    // Prepare interaction data
    const interactionData = {
      user_id: user.id,
      topic: body.topic,
      action_type: body.action_type,
      reading_level: body.reading_level || null,
      duration_seconds: body.duration_seconds || null,
      scroll_depth: body.scroll_depth || null,
      source_outlet: body.source_outlet || null,
      metadata: body.metadata || {}
    };

    // Store the interaction
    const { data, error } = await supabaseAdmin
      .from('article_interactions')
      .insert(interactionData)
      .select()
      .single();

    if (error) {
      console.error('Error storing interaction:', error);
      throw error;
    }

    console.log('Interaction stored successfully:', data.id);

    // Update user's interest profile based on interaction
    if (body.action_type === 'read' || body.action_type === 'save') {
      console.log('Updating interest profile for engagement...');

      // Get current user preferences
      const { data: userData } = await supabaseAdmin
        .from('user_preferences')
        .select('interest_profile')
        .eq('user_id', user.id)
        .maybeSingle();

      const currentProfile = userData?.interest_profile || { topics: {}, categories: {} };

      // Extract topic keywords (simplified - in production would use NLP)
      const topicKeywords = body.topic.toLowerCase().split(' ')
        .filter(word => word.length > 3);

      // Increase weight for engaged topics
      const weightIncrease = body.action_type === 'save' ? 0.2 : 0.1;

      for (const keyword of topicKeywords) {
        if (currentProfile.topics[keyword]) {
          currentProfile.topics[keyword] = Math.min(1.0, currentProfile.topics[keyword] + weightIncrease);
        } else {
          currentProfile.topics[keyword] = weightIncrease;
        }
      }

      // Update engagement metrics
      currentProfile.engagement = currentProfile.engagement || { clicks: 0, reads: 0, saves: 0 };
      if (body.action_type === 'read') currentProfile.engagement.reads++;
      if (body.action_type === 'save') currentProfile.engagement.saves++;

      // Save updated profile
      if (userData) {
        await supabaseAdmin
          .from('user_preferences')
          .update({ interest_profile: currentProfile })
          .eq('user_id', user.id);
      } else {
        // Create preferences if they don't exist
        await supabaseAdmin
          .from('user_preferences')
          .insert({
            user_id: user.id,
            interest_profile: currentProfile
          });
      }

      console.log('Interest profile updated');
    }

    // Track negative signals (abandonment)
    if (body.action_type === 'abandon' && body.duration_seconds && body.duration_seconds < 10) {
      console.log('Tracking negative signal for quick abandon');

      // Store negative preference (could be expanded to a separate table)
      const metadata = {
        ...body.metadata,
        negative_signal: true,
        abandon_time: body.duration_seconds
      };

      await supabaseAdmin
        .from('article_interactions')
        .update({ metadata })
        .eq('id', data.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        interaction_id: data.id,
        message: 'Interaction tracked successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201
      }
    );

  } catch (error) {
    console.error('Track interaction error:', error);
    return new Response(
      JSON.stringify({
        error: true,
        message: error.message || 'Failed to track interaction'
      }),
      {
        status: error.message === 'Unauthorized' ? 401 :
                error.message?.includes('required') ? 400 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});