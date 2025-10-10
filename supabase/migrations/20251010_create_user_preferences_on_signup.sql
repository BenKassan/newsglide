-- Create function to automatically create user_preferences row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (
    user_id,
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
    ARRAY[]::text[],
    ARRAY[]::text[],
    '{"topics": {}, "categories": {}, "updated_at": "' || NOW() || '"}'::jsonb,
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
  ARRAY[]::text[],
  ARRAY[]::text[],
  '{"topics": {}, "categories": {}, "updated_at": "' || NOW() || '"}'::jsonb,
  '{}'::jsonb,
  '{}'::jsonb,
  false,
  ARRAY[]::text[],
  '[]'::jsonb
FROM auth.users u
LEFT JOIN public.user_preferences up ON u.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;