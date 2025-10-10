# Complete Supabase SQL Fix for AI Chat

Copy and paste this entire SQL code into your Supabase SQL Editor and run it:

```sql
-- ========================================
-- PART 1: Add Missing Columns
-- ========================================

-- Add personalization fields to user_preferences table
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

-- Add preferred_sources column (in case it's missing)
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS preferred_sources TEXT[] DEFAULT '{}';

-- ========================================
-- PART 2: Create Comments for Documentation
-- ========================================

COMMENT ON COLUMN user_preferences.survey_responses IS 'Stores all survey answers in a structured format';
COMMENT ON COLUMN user_preferences.interest_profile IS 'Derived interest categories with weights based on user behavior';
COMMENT ON COLUMN user_preferences.content_preferences IS 'User preferences for reading level, content depth, and format';
COMMENT ON COLUMN user_preferences.onboarding_completed IS 'Whether user has completed the initial onboarding survey';
COMMENT ON COLUMN user_preferences.liked_recommendations IS 'Array of recommendation topics the user has liked';
COMMENT ON COLUMN user_preferences.recommendation_history IS 'History of all recommendations shown to the user with timestamps';

-- ========================================
-- PART 3: Create Indexes for Better Performance
-- ========================================

CREATE INDEX IF NOT EXISTS idx_user_preferences_onboarding ON user_preferences(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_user_preferences_liked_recommendations ON user_preferences USING GIN(liked_recommendations);

-- ========================================
-- PART 4: Create User Preferences for Existing Users
-- ========================================

-- Create minimal user_preferences for users who don't have one
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

-- ========================================
-- PART 5: Create Auto-Creation Function
-- ========================================

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

-- ========================================
-- PART 6: Create Trigger for New Users
-- ========================================

-- Drop any existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_minimal ON auth.users;

-- Create trigger to call the function when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- PART 7: Add RLS Policy for Insert
-- ========================================

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

-- ========================================
-- VERIFICATION QUERIES (Optional)
-- ========================================

-- Check if columns were added successfully
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_preferences'
AND column_name IN ('interests', 'survey_responses', 'interest_profile', 'content_preferences', 'onboarding_completed', 'liked_recommendations', 'recommendation_history', 'preferred_sources');

-- Check if all users have preferences
SELECT COUNT(*) as users_without_preferences
FROM auth.users u
LEFT JOIN public.user_preferences up ON u.id = up.user_id
WHERE up.user_id IS NULL;

-- Check if trigger was created
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

## After Running the SQL

### 1. Set Your Anthropic API Key
Go to your Supabase Dashboard:
1. Navigate to **Settings** → **Edge Functions** → **Secrets**
2. Click **Add new secret**
3. Name: `ANTHROPIC_API_KEY`
4. Value: Your Claude API key (starts with `sk-ant-api...`)
5. Click **Add secret**

### 2. Test the Chat
1. Refresh your NewsGlide app
2. Navigate to **AI Assistant**
3. Send a test message like "Hello, can you help me discover news?"
4. You should now receive responses from Claude!

### 3. Verify Everything Works
Check for:
- ✅ Messages send successfully
- ✅ Responses appear in the chat
- ✅ Conversations are saved in the sidebar
- ✅ You can switch between conversations
- ✅ No errors in the browser console

## Troubleshooting

If you still get errors after running this:

1. **Check the Supabase Function Logs**:
   - Go to Functions → Logs in your Supabase dashboard
   - Look for any error messages

2. **Verify API Key**:
   - Make sure your ANTHROPIC_API_KEY is set correctly
   - The key should start with `sk-ant-api`

3. **Check User Preferences**:
   Run this query to verify your user has preferences:
   ```sql
   SELECT * FROM user_preferences WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
   ```

4. **Force Refresh**:
   - Hard refresh the browser (Cmd+Shift+R or Ctrl+Shift+R)
   - Clear browser cache if needed

## Success Indicators
When everything is working, you should see:
- Chat messages appear instantly
- AI responses stream in character by character
- Conversations save automatically
- Interest tracking updates based on your conversations
- No errors in browser console or Supabase logs