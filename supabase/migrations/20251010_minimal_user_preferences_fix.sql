-- Minimal fix that only adds the essential interest_profile column
-- and creates basic user_preferences rows for existing users

-- Add the interest_profile column if it doesn't exist
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS interest_profile JSONB DEFAULT '{"topics": {}, "categories": {}}'::jsonb;

-- Create minimal user_preferences for users who don't have one
-- Only includes columns we know exist from the base schema
INSERT INTO public.user_preferences (
  user_id,
  default_reading_level,
  email_notifications,
  preferred_news_sources
)
SELECT
  u.id,
  'base',
  true,
  ARRAY[]::text[]
FROM auth.users u
LEFT JOIN public.user_preferences up ON u.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Create function to automatically create user_preferences row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_minimal()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a minimal row for the new user
  INSERT INTO public.user_preferences (
    user_id,
    default_reading_level,
    email_notifications,
    preferred_news_sources
  )
  VALUES (
    NEW.id,
    'base',
    true,
    ARRAY[]::text[]
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created_minimal ON auth.users;
CREATE TRIGGER on_auth_user_created_minimal
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_minimal();

-- Add RLS policy for users to insert their own preferences
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