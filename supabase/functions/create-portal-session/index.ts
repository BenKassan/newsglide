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
    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user?.email) {
      throw new Error('User not authenticated');
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Find customer with better error handling
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId;

    if (customers.data.length === 0) {
      console.error('[PORTAL] No Stripe customer found for email:', user.email);
      
      // Try to find in user_preferences
      const { data: prefs } = await supabaseClient
        .from('user_preferences')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .single();
      
      if (prefs?.stripe_customer_id) {
        customerId = prefs.stripe_customer_id;
      } else {
        throw new Error('No Stripe customer found. Please contact support.');
      }
    } else {
      customerId = customers.data[0].id;
    }

    // Create portal session with configuration
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.get('origin')}/subscription`,
      configuration: {
        business_profile: {
          headline: 'Manage your NewsGlide Pro subscription',
        },
        features: {
          invoice_history: {
            enabled: true,
          },
          customer_update: {
            enabled: true,
            allowed_updates: ['email', 'tax_id'],
          },
          subscription_cancel: {
            enabled: true,
            mode: 'at_period_end', // Cancel at end of billing period
            cancellation_reason: {
              enabled: true,
              options: ['too_expensive', 'missing_features', 'other'],
            },
          },
          subscription_pause: {
            enabled: false, // Disable pause for simplicity
          },
          payment_method_update: {
            enabled: true,
          },
        },
      },
    });

    console.log('[PORTAL] Session created successfully');
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});