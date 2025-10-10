-- Migration: Fix function search_path vulnerabilities
-- Date: 2025-10-11
-- Issue: All functions missing explicit search_path parameter
-- Security: Prevents search path injection attacks
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- =============================================================================
-- Fix 1: increment_search_count
-- =============================================================================
CREATE OR REPLACE FUNCTION public.increment_search_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- ← SECURITY FIX
AS $function$
BEGIN
  UPDATE user_preferences
  SET
    daily_search_count = daily_search_count + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE NOTICE 'User preferences not found for user_id: %', p_user_id;
  END IF;
END;
$function$;

-- =============================================================================
-- Fix 2: handle_new_user_minimal
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_minimal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- ← SECURITY FIX
AS $$
BEGIN
  INSERT INTO public.user_preferences (
    user_id,
    interests
  ) VALUES (
    NEW.id,
    ARRAY[]::text[]
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- Fix 3: handle_updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp  -- ← SECURITY FIX
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

-- =============================================================================
-- Fix 4: delete_old_cache_entries
-- =============================================================================
CREATE OR REPLACE FUNCTION public.delete_old_cache_entries()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp  -- ← SECURITY FIX
AS $$
BEGIN
  DELETE FROM public.news_cache WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- =============================================================================
-- Fix 5: update_discover_topics_updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_discover_topics_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp  -- ← SECURITY FIX
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- Fix 6: get_subtopics
-- =============================================================================
-- Note: Must drop first due to signature change
DROP FUNCTION IF EXISTS public.get_subtopics(TEXT, UUID);

CREATE OR REPLACE FUNCTION public.get_subtopics(parent_path_param TEXT, user_id_param UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name TEXT,
  path TEXT,
  depth INTEGER,
  article_count INTEGER,
  cached_subtopics JSONB,
  cache_expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp  -- ← SECURITY FIX
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dt.id,
    dt.name,
    dt.path,
    dt.depth,
    dt.article_count,
    dt.cached_subtopics,
    dt.cache_expires_at
  FROM discover_topics dt
  WHERE dt.path LIKE parent_path_param || '/%'
    AND dt.depth = (SELECT depth FROM discover_topics WHERE path = parent_path_param LIMIT 1) + 1
    AND (dt.user_id IS NULL OR dt.user_id = user_id_param)
  ORDER BY dt.name;
END;
$$;

-- =============================================================================
-- Fix 7: is_cache_valid
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_cache_valid(topic_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp  -- ← SECURITY FIX
AS $$
DECLARE
  expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT cache_expires_at INTO expiry
  FROM discover_topics
  WHERE id = topic_id_param;

  RETURN expiry IS NOT NULL AND expiry > NOW();
END;
$$;

-- =============================================================================
-- Fix 8: get_next_cached_topics
-- =============================================================================
-- Note: Must drop first due to signature change
DROP FUNCTION IF EXISTS public.get_next_cached_topics(text);

CREATE OR REPLACE FUNCTION public.get_next_cached_topics(p_category_name text)
RETURNS TABLE (
  id uuid,
  category_name text,
  generation_number int,
  topics jsonb,
  creativity_level float,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SET search_path = public, pg_temp  -- ← SECURITY FIX
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id,
    tc.category_name,
    tc.generation_number,
    tc.topics,
    tc.creativity_level,
    tc.created_at
  FROM discover_topic_cache tc
  WHERE tc.category_name = p_category_name
    AND tc.is_consumed = false
  ORDER BY tc.generation_number ASC
  LIMIT 1;
END;
$$;

-- =============================================================================
-- Fix 9: mark_cache_consumed
-- =============================================================================
CREATE OR REPLACE FUNCTION public.mark_cache_consumed(p_cache_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp  -- ← SECURITY FIX
AS $$
BEGIN
  UPDATE discover_topic_cache
  SET is_consumed = true,
      consumed_at = now()
  WHERE id = p_cache_id;
END;
$$;

-- =============================================================================
-- Fix 10: get_previous_topic_names
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_previous_topic_names(p_category_name text)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp  -- ← SECURITY FIX
AS $$
DECLARE
  all_topics text[];
BEGIN
  SELECT array_agg(DISTINCT unnest(topic_names))
  INTO all_topics
  FROM discover_generation_history
  WHERE category_name = p_category_name;

  RETURN COALESCE(all_topics, ARRAY[]::text[]);
END;
$$;

-- =============================================================================
-- Fix 11: get_next_generation_number
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_next_generation_number(p_category_name text)
RETURNS int
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp  -- ← SECURITY FIX
AS $$
DECLARE
  max_gen int;
BEGIN
  SELECT COALESCE(MAX(generation_number), 0) + 1
  INTO max_gen
  FROM discover_generation_history
  WHERE category_name = p_category_name;

  RETURN max_gen;
END;
$$;

-- =============================================================================
-- Fix 12: update_conversation_timestamp
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp  -- ← SECURITY FIX
AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- Fix 13: generate_conversation_title
-- =============================================================================
CREATE OR REPLACE FUNCTION public.generate_conversation_title()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp  -- ← SECURITY FIX
AS $$
BEGIN
  IF NEW.role = 'user' AND
     (SELECT title FROM conversations WHERE id = NEW.conversation_id) IS NULL THEN
    UPDATE conversations
    SET title = LEFT(NEW.content, 50)
    WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- Verification Query
-- =============================================================================
-- Run this to verify all functions now have search_path set:
-- SELECT
--   p.proname as function_name,
--   pg_get_function_identity_arguments(p.oid) as arguments,
--   CASE
--     WHEN p.proconfig IS NULL THEN 'NO SEARCH PATH SET ❌'
--     WHEN 'search_path' = ANY(SELECT split_part(unnest(p.proconfig), '=', 1))
--     THEN 'SEARCH PATH SET ✅'
--     ELSE 'NO SEARCH PATH SET ❌'
--   END as search_path_status
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND p.prokind = 'f'
-- ORDER BY function_name;

-- =============================================================================
-- Migration Complete
-- =============================================================================
-- All 13 functions have been updated with explicit search_path parameter
-- This prevents search path injection attacks while maintaining functionality
-- No application code changes required - functions maintain same signatures
