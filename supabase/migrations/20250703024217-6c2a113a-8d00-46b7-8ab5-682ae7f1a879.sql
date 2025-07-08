
-- Make elliotgreenbaum23@gmail.com a pro user indefinitely

-- First, update the user_preferences table
UPDATE user_preferences 
SET 
  subscription_tier = 'pro',
  subscription_status = 'active',
  subscription_expires_at = '2099-12-31 23:59:59+00',
  daily_search_count = 0,
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'elliotgreenbaum23@gmail.com'
);

-- Insert a record into user_subscriptions table for consistency
INSERT INTO user_subscriptions (
  user_id,
  subscription_tier,
  subscription_status,
  current_period_end,
  stripe_customer_id,
  stripe_subscription_id,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'elliotgreenbaum23@gmail.com'),
  'pro',
  'active',
  '2099-12-31 23:59:59+00',
  'manual_override',
  'manual_override',
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  subscription_tier = 'pro',
  subscription_status = 'active',
  current_period_end = '2099-12-31 23:59:59+00',
  updated_at = NOW();

-- Verify the changes
SELECT 
  p.subscription_tier,
  p.subscription_status,
  p.subscription_expires_at,
  p.daily_search_count,
  us.subscription_tier as us_tier,
  us.subscription_status as us_status,
  us.current_period_end
FROM user_preferences p
LEFT JOIN user_subscriptions us ON p.user_id = us.user_id
WHERE p.user_id = (
  SELECT id FROM auth.users WHERE email = 'elliotgreenbaum23@gmail.com'
);
