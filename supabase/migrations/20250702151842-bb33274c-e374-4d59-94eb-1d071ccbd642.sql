-- Grant pro subscription to benjaminakassan@gmail.com
UPDATE public.user_preferences 
SET 
  subscription_tier = 'pro',
  subscription_status = 'active',
  subscription_expires_at = NOW() + INTERVAL '1 year',
  updated_at = NOW()
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'benjaminakassan@gmail.com'
);