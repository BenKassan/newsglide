-- Add article preference fields and update defaults

ALTER TABLE user_preferences
ALTER COLUMN default_reading_level SET DEFAULT 'college';

UPDATE user_preferences
SET default_reading_level = CASE
  WHEN default_reading_level IN ('eli5', 'high_school', 'college', 'phd') THEN default_reading_level
  WHEN default_reading_level = 'base' THEN 'college'
  ELSE 'college'
END;

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS default_article_length TEXT DEFAULT 'medium';

UPDATE user_preferences
SET default_article_length = COALESCE(default_article_length, 'medium');

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS default_article_style TEXT DEFAULT 'paragraphs';

UPDATE user_preferences
SET default_article_style = COALESCE(default_article_style, 'paragraphs');

-- Ensure onboarding function sets new defaults
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (
    user_id,
    default_reading_level,
    default_article_length,
    default_article_style,
    email_notifications,
    preferred_news_sources,
    interests,
    preferred_sources,
    theme,
    font_size,
    interest_profile,
    survey_responses,
    content_preferences,
    onboarding_completed,
    liked_recommendations,
    recommendation_history
  )
  VALUES (
    NEW.id,
    'college',
    'medium',
    'paragraphs',
    true,
    ARRAY[]::text[],
    ARRAY[]::text[],
    ARRAY[]::text[],
    'light',
    'medium',
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

-- Ensure existing users have rows with new defaults where missing
INSERT INTO public.user_preferences (
  user_id,
  default_reading_level,
  default_article_length,
  default_article_style,
  email_notifications,
  preferred_news_sources,
  interests,
  preferred_sources,
  theme,
  font_size,
  interest_profile,
  survey_responses,
  content_preferences,
  onboarding_completed,
  liked_recommendations,
  recommendation_history
)
SELECT
  u.id,
  'college',
  'medium',
  'paragraphs',
  true,
  ARRAY[]::text[],
  ARRAY[]::text[],
  ARRAY[]::text[],
  'light',
  'medium',
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

-- Normalize any existing NULLs to new defaults
UPDATE user_preferences
SET
  default_reading_level = COALESCE(default_reading_level, 'college'),
  default_article_length = COALESCE(default_article_length, 'medium'),
  default_article_style = COALESCE(default_article_style, 'paragraphs');
