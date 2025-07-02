-- Add subscription fields to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS daily_search_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_search_reset DATE DEFAULT CURRENT_DATE;

-- Create subscription_events table for tracking
CREATE TABLE public.subscription_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscription_events
CREATE POLICY "Users can view own subscription events" ON public.subscription_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert subscription events" ON public.subscription_events FOR INSERT WITH CHECK (true);

-- Function to reset daily search counts
CREATE OR REPLACE FUNCTION reset_daily_search_counts() 
RETURNS void AS $$
BEGIN
  UPDATE public.user_preferences 
  SET daily_search_count = 0, last_search_reset = CURRENT_DATE
  WHERE last_search_reset < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to increment search count
CREATE OR REPLACE FUNCTION increment_search_count(user_id UUID) 
RETURNS void AS $$
BEGIN
  -- Reset if new day
  UPDATE public.user_preferences 
  SET daily_search_count = 0, last_search_reset = CURRENT_DATE
  WHERE user_id = increment_search_count.user_id AND last_search_reset < CURRENT_DATE;
  
  -- Increment count
  UPDATE public.user_preferences 
  SET daily_search_count = daily_search_count + 1
  WHERE user_id = increment_search_count.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_stripe_customer ON public.user_preferences(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user ON public.subscription_events(user_id);

-- Add policies for subscription management
CREATE POLICY "Users can insert own preferences" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);