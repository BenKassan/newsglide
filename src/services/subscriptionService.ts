import { supabase } from '@/integrations/supabase/client';

export interface UserSubscription {
  subscription_tier: 'free' | 'pro';
  subscription_status: 'active' | 'inactive' | 'cancelled' | 'past_due';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_expires_at?: string;
  daily_search_count: number;
  last_search_reset: string;
}

export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('subscription_tier, subscription_status, stripe_customer_id, stripe_subscription_id, subscription_expires_at, daily_search_count, last_search_reset')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data as UserSubscription;
  } catch (error) {
    console.error('Failed to get user subscription:', error);
    return null;
  }
}

export async function incrementSearchCount(userId: string): Promise<boolean> {
  try {
    // First reset count if it's a new day
    await supabase.rpc('reset_daily_search_counts');
    
    const { error } = await supabase.rpc('increment_search_count', { user_id: userId });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to increment search count:', error);
    return false;
  }
}

export async function createCheckoutSession(userId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('stripe-checkout', {
    body: { userId }
  });

  if (error) throw error;
  return data.sessionUrl;
}

export async function getStripePublishableKey(): Promise<string> {
  const { data, error } = await supabase.functions.invoke('stripe-config');
  if (error) throw error;
  return data.publishableKey;
}

export function canUseFeature(subscription: UserSubscription | null, feature: 'search' | 'phd' | 'voice'): boolean {
  if (!subscription) return false;
  
  // Pro users can use everything
  if (subscription.subscription_tier === 'pro' && subscription.subscription_status === 'active') {
    return true;
  }
  
  // Free users have restrictions
  if (feature === 'phd' || feature === 'voice') {
    return false;
  }
  
  if (feature === 'search') {
    return subscription.daily_search_count < 5;
  }
  
  return false;
}