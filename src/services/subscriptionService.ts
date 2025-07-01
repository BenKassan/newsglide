
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionLimits {
  searches: number;
  phdAnalysis: boolean;
  morganFreeman: boolean;
  customVoices: boolean;
}

export const SUBSCRIPTION_TIERS = {
  free: {
    searches: 5, // per day
    phdAnalysis: false,
    morganFreeman: false,
    customVoices: false,
  },
  pro: {
    searches: 100, // per day
    phdAnalysis: true,
    morganFreeman: true,
    customVoices: true,
  }
} as const;

export interface UserSubscription {
  id?: string;
  user_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_tier: 'free' | 'pro';
  subscription_status?: string;
  current_period_end?: string;
  created_at?: string;
  updated_at?: string;
}

export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
    
  return data || { 
    user_id: userId, 
    subscription_tier: 'free' as const,
    subscription_status: 'active'
  };
}

export async function checkFeatureAccess(userId: string, feature: 'phd' | 'morgan_freeman' | 'search'): Promise<boolean> {
  if (!userId) return false;
  
  const subscription = await getUserSubscription(userId);
  const limits = SUBSCRIPTION_TIERS[subscription.subscription_tier];
  
  if (feature === 'search') {
    // Check daily usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const { data: usageRecords } = await supabase
      .from('usage_limits')
      .select('count')
      .eq('user_id', userId)
      .eq('feature', 'search')
      .gte('period_start', today.toISOString())
      .lt('period_start', tomorrow.toISOString());
      
    const totalUsage = usageRecords?.reduce((sum, record) => sum + (record.count || 0), 0) || 0;
    return totalUsage < limits.searches;
  }
  
  if (feature === 'phd') return limits.phdAnalysis;
  if (feature === 'morgan_freeman') return limits.morganFreeman;
  
  return false;
}

export async function incrementUsage(userId: string, feature: string): Promise<void> {
  if (!userId) return;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Try to find existing usage record for today
  const { data: existingRecord } = await supabase
    .from('usage_limits')
    .select('*')
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('period_start', today.toISOString())
    .lt('period_start', tomorrow.toISOString())
    .maybeSingle();
  
  if (existingRecord) {
    // Update existing record
    await supabase
      .from('usage_limits')
      .update({ count: (existingRecord.count || 0) + 1 })
      .eq('id', existingRecord.id);
  } else {
    // Create new record
    await supabase
      .from('usage_limits')
      .insert({
        user_id: userId,
        feature,
        count: 1,
        period_start: today.toISOString(),
        period_end: tomorrow.toISOString()
      });
  }
}

export async function getDailyUsage(userId: string, feature: string): Promise<number> {
  if (!userId) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const { data: usageRecords } = await supabase
    .from('usage_limits')
    .select('count')
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('period_start', today.toISOString())
    .lt('period_start', tomorrow.toISOString());
    
  return usageRecords?.reduce((sum, record) => sum + (record.count || 0), 0) || 0;
}
