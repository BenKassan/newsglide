-- ============================================================================
-- NEWSGLIDE PERSONALIZATION SYSTEM - COMPLETE FIX SCRIPT
-- ============================================================================
-- Purpose: Deploy all missing database schemas for user personalization
-- Date: 2025-10-12
-- Execution: Run in Supabase Dashboard → SQL Editor
-- Estimated Time: 2-3 minutes
-- Safety: Idempotent - safe to run multiple times
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STEP 1: USER PREFERENCES - INTEREST PROFILE COLUMN
-- ============================================================================
-- Purpose: Add interest_profile JSONB column for tracking learned preferences
-- Required by: track-interaction edge function

DO $$
BEGIN
  -- Add interest_profile column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences'
    AND column_name = 'interest_profile'
  ) THEN
    ALTER TABLE user_preferences
    ADD COLUMN interest_profile JSONB DEFAULT '{"topics": {}, "categories": {}, "engagement": {"clicks": 0, "reads": 0, "saves": 0}}'::jsonb;

    RAISE NOTICE 'Added interest_profile column to user_preferences';
  ELSE
    RAISE NOTICE 'interest_profile column already exists';
  END IF;
END $$;

-- Create user_preferences for existing users who don't have one
INSERT INTO public.user_preferences (
  user_id,
  default_reading_level,
  email_notifications,
  preferred_news_sources,
  interest_profile
)
SELECT
  u.id,
  'base',
  true,
  ARRAY[]::text[],
  '{"topics": {}, "categories": {}, "engagement": {"clicks": 0, "reads": 0, "saves": 0}}'::jsonb
FROM auth.users u
LEFT JOIN public.user_preferences up ON u.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Ensure RLS policy for users to insert their own preferences
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

    RAISE NOTICE 'Created RLS policy: Users can insert own preferences';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: ARTICLE INTERACTIONS TABLE (CRITICAL)
-- ============================================================================
-- Purpose: Core tracking table for all user interactions with articles
-- Required by: track-interaction edge function

CREATE TABLE IF NOT EXISTS article_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'view',
    'read',
    'abandon',
    'save',
    'share',
    'reading_level_change',
    'source_click',
    'copy',
    'debate_view'
  )),
  reading_level TEXT CHECK (reading_level IN ('base', 'eli5', 'phd')),
  duration_seconds INTEGER,
  scroll_depth DECIMAL(3,2) CHECK (scroll_depth >= 0 AND scroll_depth <= 1),
  source_outlet TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_article_interactions_user_id ON article_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_article_interactions_topic ON article_interactions(topic);
CREATE INDEX IF NOT EXISTS idx_article_interactions_action_type ON article_interactions(action_type);
CREATE INDEX IF NOT EXISTS idx_article_interactions_created_at ON article_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_interactions_user_topic ON article_interactions(user_id, topic);

-- Enable Row Level Security
ALTER TABLE article_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'article_interactions'
    AND policyname = 'Users can view own article interactions'
  ) THEN
    CREATE POLICY "Users can view own article interactions"
      ON article_interactions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'article_interactions'
    AND policyname = 'Users can create own article interactions'
  ) THEN
    CREATE POLICY "Users can create own article interactions"
      ON article_interactions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'article_interactions'
    AND policyname = 'Service role can manage all interactions'
  ) THEN
    CREATE POLICY "Service role can manage all interactions"
      ON article_interactions FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Create engagement summary view
CREATE OR REPLACE VIEW article_engagement_summary AS
SELECT
  user_id,
  topic,
  COUNT(*) FILTER (WHERE action_type = 'view') as view_count,
  COUNT(*) FILTER (WHERE action_type = 'read') as read_count,
  COUNT(*) FILTER (WHERE action_type = 'abandon') as abandon_count,
  COUNT(*) FILTER (WHERE action_type = 'save') as save_count,
  COUNT(*) FILTER (WHERE action_type = 'source_click') as source_clicks,
  COUNT(*) FILTER (WHERE action_type = 'debate_view') as debate_views,
  AVG(duration_seconds) FILTER (WHERE action_type = 'read') as avg_read_time,
  MAX(scroll_depth) as max_scroll_depth,
  MIN(created_at) as first_interaction,
  MAX(created_at) as last_interaction,
  CASE
    WHEN COUNT(*) FILTER (WHERE action_type = 'read') > 0 THEN
      LEAST(100,
        (COUNT(*) FILTER (WHERE action_type = 'read') * 30) +
        (COUNT(*) FILTER (WHERE action_type = 'save') * 20) +
        (AVG(duration_seconds) FILTER (WHERE action_type = 'read') / 10) +
        (MAX(scroll_depth) * 20) +
        (COUNT(*) FILTER (WHERE action_type = 'source_click') * 10) +
        (COUNT(*) FILTER (WHERE action_type = 'debate_view') * 10)
      )
    ELSE 0
  END as engagement_score
FROM article_interactions
GROUP BY user_id, topic;

-- Grant permissions
GRANT SELECT ON article_engagement_summary TO authenticated;

-- Auto-mark articles as read based on engagement
CREATE OR REPLACE FUNCTION mark_article_as_read()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action_type = 'view' AND
     (NEW.duration_seconds > 30 OR NEW.scroll_depth > 0.5) THEN
    INSERT INTO article_interactions (
      user_id, topic, action_type, reading_level,
      duration_seconds, scroll_depth, metadata
    ) VALUES (
      NEW.user_id, NEW.topic, 'read', NEW.reading_level,
      NEW.duration_seconds, NEW.scroll_depth, NEW.metadata
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_mark_article_read_trigger ON article_interactions;
CREATE TRIGGER auto_mark_article_read_trigger
  AFTER INSERT ON article_interactions
  FOR EACH ROW
  WHEN (NEW.action_type = 'view')
  EXECUTE FUNCTION mark_article_as_read();

-- ============================================================================
-- STEP 3: SAVED ARTICLES TABLE - FIX 406 ERROR
-- ============================================================================
-- Purpose: Ensure saved_articles table exists with correct schema and RLS

CREATE TABLE IF NOT EXISTS saved_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  article_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, topic)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_articles_user_id ON saved_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_articles_topic ON saved_articles(topic);
CREATE INDEX IF NOT EXISTS idx_saved_articles_created_at ON saved_articles(created_at DESC);

-- Enable RLS
ALTER TABLE saved_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  -- Drop old restrictive policies if they exist
  DROP POLICY IF EXISTS "Users can view own saved articles" ON saved_articles;
  DROP POLICY IF EXISTS "Users can insert own saved articles" ON saved_articles;
  DROP POLICY IF EXISTS "Users can delete own saved articles" ON saved_articles;

  -- Create comprehensive policies
  CREATE POLICY "Users can view own saved articles"
    ON saved_articles FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert own saved articles"
    ON saved_articles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can delete own saved articles"
    ON saved_articles FOR DELETE
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can update own saved articles"
    ON saved_articles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
END $$;

-- ============================================================================
-- STEP 4: USER SESSIONS TABLE (OPTIONAL - FOR SESSION TRACKING)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  page_views INTEGER DEFAULT 0,
  articles_read INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON user_sessions(started_at DESC);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_sessions'
    AND policyname = 'Users can view own sessions'
  ) THEN
    CREATE POLICY "Users can view own sessions"
      ON user_sessions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_sessions'
    AND policyname = 'Users can manage own sessions'
  ) THEN
    CREATE POLICY "Users can manage own sessions"
      ON user_sessions FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- STEP 5: USER MEMORIES TABLE (OPTIONAL - FOR AI PERSONALIZATION)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_text TEXT NOT NULL,
  memory_type TEXT CHECK (memory_type IN ('preference', 'context', 'fact', 'goal')),
  importance DECIMAL(3,2) CHECK (importance >= 0 AND importance <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_importance ON user_memories(importance DESC);

ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_memories'
    AND policyname = 'Users can view own memories'
  ) THEN
    CREATE POLICY "Users can view own memories"
      ON user_memories FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_memories'
    AND policyname = 'Users can manage own memories'
  ) THEN
    CREATE POLICY "Users can manage own memories"
      ON user_memories FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables exist
DO $$
DECLARE
  missing_tables TEXT[];
  table_name TEXT;
BEGIN
  missing_tables := ARRAY[]::TEXT[];

  FOR table_name IN
    SELECT unnest(ARRAY['user_preferences', 'article_interactions', 'saved_articles', 'user_sessions', 'user_memories'])
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public'
      AND tables.table_name = table_name
    ) THEN
      missing_tables := array_append(missing_tables, table_name);
    END IF;
  END LOOP;

  IF array_length(missing_tables, 1) > 0 THEN
    RAISE WARNING 'Missing tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE '✅ All tables created successfully';
  END IF;
END $$;

-- Display table row counts
SELECT
  'user_preferences' as table_name,
  COUNT(*) as row_count
FROM user_preferences
UNION ALL
SELECT
  'article_interactions',
  COUNT(*)
FROM article_interactions
UNION ALL
SELECT
  'saved_articles',
  COUNT(*)
FROM saved_articles
UNION ALL
SELECT
  'user_sessions',
  COUNT(*)
FROM user_sessions
UNION ALL
SELECT
  'user_memories',
  COUNT(*)
FROM user_memories
ORDER BY table_name;

-- Display RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles
FROM pg_policies
WHERE tablename IN (
  'user_preferences',
  'article_interactions',
  'saved_articles',
  'user_sessions',
  'user_memories'
)
ORDER BY tablename, policyname;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '
  ============================================================================
  ✅ PERSONALIZATION SYSTEM SETUP COMPLETE
  ============================================================================

  Tables Created:
  - ✅ user_preferences (with interest_profile column)
  - ✅ article_interactions (core tracking)
  - ✅ saved_articles (save functionality)
  - ✅ user_sessions (session tracking)
  - ✅ user_memories (AI personalization)

  Views Created:
  - ✅ article_engagement_summary (analytics)

  Next Steps:
  1. Test article generation - should see no 500 errors
  2. Check console - should see "Interaction tracked" messages
  3. Verify saved articles work without 406 errors
  4. Monitor Supabase logs for any issues

  To test tracking is working:
  SELECT * FROM article_interactions ORDER BY created_at DESC LIMIT 10;

  To view engagement summary:
  SELECT * FROM article_engagement_summary WHERE user_id = auth.uid();

  ============================================================================
  ';
END $$;
