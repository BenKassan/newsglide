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

  console.log('[WEBHOOK] ========== NEW REQUEST ==========');
  console.log('[WEBHOOK] Headers:', Object.fromEntries(req.headers.entries()));

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('[WEBHOOK] No stripe-signature header');
      return new Response('No signature', { status: 400 });
    }

    const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    console.log('[WEBHOOK] Using webhook secret:', STRIPE_WEBHOOK_SECRET?.substring(0, 10) + '...');

    if (!STRIPE_WEBHOOK_SECRET) {
      console.error('[WEBHOOK] STRIPE_WEBHOOK_SECRET not set!');
      return new Response('Webhook secret not configured', { status: 500 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    });

    const body = await req.text();
    console.log('[WEBHOOK] Body length:', body.length);

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
      console.log('[WEBHOOK] ✅ Signature verified! Event:', event.type);
    } catch (err: any) {
      console.error('[WEBHOOK] ❌ Signature verification failed:', err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Initialize Supabase with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    console.log('[WEBHOOK] Supabase URL:', supabaseUrl);
    console.log('[WEBHOOK] Service key exists:', !!supabaseServiceKey);

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('[WEBHOOK] Checkout session completed:', {
          id: session.id,
          customer: session.customer,
          customerEmail: session.customer_details?.email,
          metadata: session.metadata,
          mode: session.mode,
          paymentStatus: session.payment_status
        });

        // Find user ID
        let userId = session.metadata?.userId;
        const customerEmail = session.customer_details?.email;

        if (!userId && customerEmail) {
          console.log('[WEBHOOK] No userId in metadata, searching by email:', customerEmail);
          
          // Direct query to profiles table
          const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id')
            .eq('email', customerEmail)
            .single();

          if (profile) {
            userId = profile.id;
            console.log('[WEBHOOK] Found user by email:', userId);
          } else {
            console.error('[WEBHOOK] Could not find user by email:', profileError);
          }
        }

        if (!userId) {
          console.error('[WEBHOOK] No user ID found!');
          return new Response('User not found', { status: 400 });
        }

        // Update user to Pro - use upsert to handle missing records
        console.log('[WEBHOOK] Upgrading user to Pro:', userId);
        
        const { data, error } = await supabaseClient
          .from('user_preferences')
          .upsert({
            user_id: userId,
            subscription_tier: 'pro',
            subscription_status: 'active',
            stripe_customer_id: session.customer as string,
            daily_search_count: 0,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })
          .select();

        if (error) {
          console.error('[WEBHOOK] Database error:', error);
          return new Response(`Database error: ${error.message}`, { status: 500 });
        }

        console.log('[WEBHOOK] ✅ Successfully upgraded user:', data);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription updated:', subscription.id);

        // Find user by stripe customer ID
        const { data: userPref, error: findError } = await supabaseClient
          .from('user_preferences')
          .select('user_id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single();

        if (findError || !userPref) {
          console.error('User not found for customer:', subscription.customer);
          break;
        }

        // Update subscription status
        const status = subscription.status === 'active' ? 'active' : 'inactive';
        const tier = subscription.status === 'active' ? 'pro' : 'free';

        const { error } = await supabaseClient
          .from('user_preferences')
          .update({
            subscription_tier: tier,
            subscription_status: status,
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userPref.user_id);

        if (error) {
          console.error('Error updating subscription:', error);
        } else {
          console.log('Successfully updated subscription for user:', userPref.user_id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription deleted:', subscription.id);

        // Find user by stripe customer ID and downgrade to free
        const { data: userPref, error: findError } = await supabaseClient
          .from('user_preferences')
          .select('user_id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single();

        if (findError || !userPref) {
          console.error('User not found for customer:', subscription.customer);
          break;
        }

        const { error } = await supabaseClient
          .from('user_preferences')
          .update({
            subscription_tier: 'free',
            subscription_status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userPref.user_id);

        if (error) {
          console.error('Error downgrading subscription:', error);
        } else {
          console.log('Successfully downgraded user to free:', userPref.user_id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment failed for invoice:', invoice.id);

        // Find user by stripe customer ID
        const { data: userPref, error: findError } = await supabaseClient
          .from('user_preferences')
          .select('user_id')
          .eq('stripe_customer_id', invoice.customer as string)
          .single();

        if (findError || !userPref) {
          console.error('User not found for customer:', invoice.customer);
          break;
        }

        // Mark subscription as past due but don't downgrade immediately
        const { error } = await supabaseClient
          .from('user_preferences')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userPref.user_id);

        if (error) {
          console.error('Error updating payment failed status:', error);
        } else {
          console.log('Marked subscription as past due for user:', userPref.user_id);
        }
        break;
      }

      default:
        console.log('[WEBHOOK] Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('[WEBHOOK] Unexpected error:', error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
});