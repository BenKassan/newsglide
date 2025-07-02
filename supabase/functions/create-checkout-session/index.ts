import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Validate environment variables
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripePriceId = Deno.env.get('STRIPE_PRICE_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    logStep("Environment variables check", {
      hasStripeKey: !!stripeSecretKey,
      hasPriceId: !!stripePriceId,
      priceId: stripePriceId,
      hasSupabaseUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey
    });

    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    if (!stripePriceId) {
      throw new Error('STRIPE_PRICE_ID not configured');
    }

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }
    logStep("Authorization header found");

    const supabaseClient = createClient(
      supabaseUrl ?? '',
      supabaseAnonKey ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    logStep("Authenticating user");
    
    const { data, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logStep("User authentication failed", { error: userError.message });
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    const user = data.user;
    if (!user?.email) {
      throw new Error('User not authenticated or email not available');
    }
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Initialize Stripe
    logStep("Initializing Stripe client");
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Check if customer exists
    logStep("Checking for existing customer", { email: user.email });
    let customers;
    try {
      customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });
      logStep("Customer lookup successful", { found: customers.data.length });
    } catch (stripeError: any) {
      logStep("Customer lookup failed", { error: stripeError.message, code: stripeError.code });
      throw new Error(`Failed to lookup customer: ${stripeError.message}`);
    }

    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Using existing customer", { customerId });
    } else {
      // Create new customer
      logStep("Creating new customer");
      try {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id }
        });
        customerId = customer.id;
        logStep("New customer created", { customerId });
      } catch (stripeError: any) {
        logStep("Customer creation failed", { error: stripeError.message, code: stripeError.code });
        throw new Error(`Failed to create customer: ${stripeError.message}`);
      }
    }

    // Validate price ID exists
    logStep("Validating price ID", { priceId: stripePriceId });
    try {
      const price = await stripe.prices.retrieve(stripePriceId);
      logStep("Price validation successful", { 
        priceId: price.id, 
        amount: price.unit_amount, 
        currency: price.currency,
        recurring: price.recurring
      });
    } catch (stripeError: any) {
      logStep("Price validation failed", { error: stripeError.message, code: stripeError.code });
      throw new Error(`Invalid price ID: ${stripeError.message}`);
    }

    // Create checkout session
    const checkoutData = {
      customer: customerId,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.get('origin')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/subscription/cancel`,
      metadata: {
        userId: user.id,
      },
    };
    
    logStep("Creating checkout session", { 
      customerId, 
      priceId: stripePriceId,
      origin: req.headers.get('origin')
    });
    
    let session;
    try {
      session = await stripe.checkout.sessions.create(checkoutData);
      logStep("Checkout session created successfully", { 
        sessionId: session.id, 
        url: session.url?.substring(0, 50) + '...' 
      });
    } catch (stripeError: any) {
      logStep("Checkout session creation failed", { 
        error: stripeError.message, 
        code: stripeError.code,
        type: stripeError.type
      });
      throw new Error(`Failed to create checkout session: ${stripeError.message}`);
    }

    logStep("Returning checkout URL", { success: true });
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout-session", { 
      message: errorMessage,
      stack: error.stack,
      name: error.name
    });
    
    // Return detailed error information
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error.name || 'Unknown error type',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});