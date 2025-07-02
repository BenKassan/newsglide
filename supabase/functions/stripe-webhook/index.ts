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
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!endpointSecret) {
      throw new Error('Missing STRIPE_WEBHOOK_SECRET');
    }

    // Initialize Supabase client with service role for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);

    console.log('Processing webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout completed:', session.id);

        if (session.customer && session.metadata?.userId) {
          // Update user preferences to Pro
          const { error } = await supabaseClient
            .from('user_preferences')
            .update({
              subscription_tier: 'pro',
              subscription_status: 'active',
              stripe_customer_id: session.customer as string,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', session.metadata.userId);

          if (error) {
            console.error('Error updating user preferences:', error);
          } else {
            console.log('Successfully upgraded user to Pro:', session.metadata.userId);
          }
        }
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
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});