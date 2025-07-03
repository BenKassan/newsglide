-- Update elliotgreenbaum@gmail.com to Pro tier indefinitely
UPDATE public.user_preferences 
SET 
  subscription_tier = 'pro',
  subscription_status = 'active',
  subscription_expires_at = NULL,
  updated_at = timezone('utc'::text, now())
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'elliotgreenbaum@gmail.com'
);

-- If no user_preferences record exists, insert one
INSERT INTO public.user_preferences (
  user_id,
  subscription_tier,
  subscription_status,
  subscription_expires_at,
  daily_search_count,
  default_reading_level,
  email_notifications,
  font_size,
  preferred_news_sources,
  theme,
  last_search_reset,
  created_at,
  updated_at
)
SELECT 
  id,
  'pro',
  'active',
  NULL,
  0,
  'base',
  true,
  'medium',
  NULL,
  'light',
  CURRENT_DATE,
  timezone('utc'::text, now()),
  timezone('utc'::text, now())
FROM auth.users 
WHERE email = 'elliotgreenbaum@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_preferences 
    WHERE user_id = auth.users.id
  );