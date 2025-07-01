
-- User subscription status
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
  subscription_status TEXT DEFAULT 'active',
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE IF NOT EXISTS public.usage_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  feature TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  period_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 day')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_limits_user_feature ON public.usage_limits(user_id, feature, period_end);

-- RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own usage" ON public.usage_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all subscription data for webhooks
CREATE POLICY "Service role can manage subscriptions" ON public.user_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage usage" ON public.usage_limits
  FOR ALL USING (auth.role() = 'service_role');

-- Users can insert their own usage data
CREATE POLICY "Users can insert own usage" ON public.usage_limits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
