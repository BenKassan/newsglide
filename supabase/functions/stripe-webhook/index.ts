import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();
  
  const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
  const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  
  try {
    // Verify webhook signature (simplified - in production, use proper verification)
    const event = JSON.parse(body);
    
    console.log('Webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function handleCheckoutCompleted(session: any) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  // Get subscription details
  const subResponse = await fetch(`https://api.stripe.com/v1/subscriptions/${session.subscription}`, {
    headers: {
      'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
    }
  });
  const subscription = await subResponse.json();

  await supabase
    .from('user_preferences')
    .update({
      subscription_tier: 'pro',
      subscription_status: 'active',
      stripe_subscription_id: subscription.id,
      subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString()
    })
    .eq('user_id', userId);

  await supabase
    .from('subscription_events')
    .insert({
      user_id: userId,
      event_type: 'subscription_activated',
      data: { subscription_id: subscription.id }
    });
}

async function handleSubscriptionChange(subscription: any) {
  const { data: userPrefs } = await supabase
    .from('user_preferences')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!userPrefs) return;

  const status = subscription.status === 'active' ? 'active' : 'inactive';
  const tier = status === 'active' ? 'pro' : 'free';

  await supabase
    .from('user_preferences')
    .update({
      subscription_tier: tier,
      subscription_status: status,
      subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString()
    })
    .eq('user_id', userPrefs.user_id);
}

async function handlePaymentSucceeded(invoice: any) {
  // Update subscription expiry date
  const { data: userPrefs } = await supabase
    .from('user_preferences')
    .select('user_id')
    .eq('stripe_subscription_id', invoice.subscription)
    .single();

  if (userPrefs) {
    await supabase
      .from('subscription_events')
      .insert({
        user_id: userPrefs.user_id,
        event_type: 'payment_succeeded',
        data: { amount: invoice.amount_paid }
      });
  }
}

async function handlePaymentFailed(invoice: any) {
  const { data: userPrefs } = await supabase
    .from('user_preferences')
    .select('user_id')
    .eq('stripe_subscription_id', invoice.subscription)
    .single();

  if (userPrefs) {
    await supabase
      .from('user_preferences')
      .update({ subscription_status: 'past_due' })
      .eq('user_id', userPrefs.user_id);

    await supabase
      .from('subscription_events')
      .insert({
        user_id: userPrefs.user_id,
        event_type: 'payment_failed',
        data: { amount: invoice.amount_due }
      });
  }
}