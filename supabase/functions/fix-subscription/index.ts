import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    
    if (!email) {
      throw new Error('Email is required');
    }

    console.log('[FIX-SUBSCRIPTION] Checking for user:', email);

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Find user by email
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      throw new Error('User not found');
    }

    const userId = profile.id;
    console.log('[FIX-SUBSCRIPTION] Found user ID:', userId);

    // Check for Stripe customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({ 
        upgraded: false, 
        message: 'No Stripe customer found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const customerId = customers.data[0].id;
    console.log('[FIX-SUBSCRIPTION] Found customer:', customerId);

    // Check for recent successful checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 10
    });

    const recentSession = sessions.data.find(session => 
      session.payment_status === 'paid' && 
      session.mode === 'subscription' &&
      (Date.now() - session.created * 1000) < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    if (!recentSession) {
      return new Response(JSON.stringify({ 
        upgraded: false, 
        message: 'No recent successful payment found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[FIX-SUBSCRIPTION] Found recent payment:', recentSession.id);

    // Update user to Pro
    const { error: updateError } = await supabaseClient
      .from('user_preferences')
      .upsert({
        user_id: userId,
        subscription_tier: 'pro',
        subscription_status: 'active',
        stripe_customer_id: customerId,
        daily_search_count: 0,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      throw new Error(`Failed to update subscription: ${updateError.message}`);
    }

    console.log('[FIX-SUBSCRIPTION] ✅ Successfully upgraded user to Pro');

    return new Response(JSON.stringify({ 
      upgraded: true, 
      message: 'Subscription activated successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[FIX-SUBSCRIPTION] Error:', error);
    return new Response(JSON.stringify({ 
      upgraded: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});