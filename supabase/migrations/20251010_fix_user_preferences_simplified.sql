-- First, add missing columns if they don't exist
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS survey_responses JSONB DEFAULT '{}';

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS interest_profile JSONB DEFAULT '{}';

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS content_preferences JSONB DEFAULT '{}';

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS liked_recommendations TEXT[] DEFAULT '{}';

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS recommendation_history JSONB DEFAULT '[]';

-- Add preferred_sources column (rename from preferred_news_sources if needed)
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS preferred_sources TEXT[] DEFAULT '{}';

-- Create function to automatically create user_preferences row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new row in user_preferences for the new user
  INSERT INTO public.user_preferences (
    user_id,
    default_reading_level,
    email_notifications,
    preferred_news_sources,
    interests,
    preferred_sources,
    interest_profile,
    survey_responses,
    content_preferences,
    onboarding_completed,
    liked_recommendations,
    recommendation_history
  )
  VALUES (
    NEW.id,
    'base',
    true,
    ARRAY[]::text[],
    ARRAY[]::text[],
    ARRAY[]::text[],
    jsonb_build_object(
      'topics', jsonb_object('{}'),
      'categories', jsonb_object('{}'),
      'updated_at', NOW()
    ),
    '{}'::jsonb,
    '{}'::jsonb,
    false,
    ARRAY[]::text[],
    '[]'::jsonb
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Retroactively create user_preferences for existing users who don't have one
INSERT INTO public.user_preferences (
  user_id,
  default_reading_level,
  email_notifications,
  preferred_news_sources,
  interests,
  preferred_sources,
  interest_profile,
  survey_responses,
  content_preferences,
  onboarding_completed,
  liked_recommendations,
  recommendation_history
)
SELECT
  u.id,
  'base',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  jsonb_build_object(
    'topics', jsonb_object('{}'),
    'categories', jsonb_object('{}'),
    'updated_at', NOW()
  ),
  '{}'::jsonb,
  '{}'::jsonb,
  false,
  ARRAY[]::text[],
  '[]'::jsonb
FROM auth.users u
LEFT JOIN public.user_preferences up ON u.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Add RLS policy for users to insert their own preferences (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_preferences'
    AND policyname = 'Users can insert own preferences'
  ) THEN
    CREATE POLICY "Users can insert own preferences"
      ON public.user_preferences
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;