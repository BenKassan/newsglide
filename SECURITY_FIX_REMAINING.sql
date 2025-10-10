-- Fix remaining 3 vulnerable functions
-- Run this in Supabase SQL Editor to complete security fixes

-- =============================================================================
-- Fix: delete_old_cache_entries
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
-- Fix: handle_new_user (or handle_new_user_minimal)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
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

-- Also fix the _minimal variant if it exists
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
-- Fix: reset_daily_search_counts
-- =============================================================================
CREATE OR REPLACE FUNCTION public.reset_daily_search_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- ← SECURITY FIX
AS $$
BEGIN
  UPDATE public.user_preferences
  SET daily_search_count = 0,
      updated_at = NOW();
END;
$$;

-- =============================================================================
-- Verification - Run this to check all are now secured
-- =============================================================================
SELECT proname,
  CASE WHEN 'search_path' = ANY(SELECT split_part(unnest(proconfig), '=', 1))
  THEN '✅ SECURED' ELSE '❌ VULNERABLE' END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prokind = 'f'
  AND proname IN ('delete_old_cache_entries', 'handle_new_user', 'handle_new_user_minimal', 'reset_daily_search_counts')
ORDER BY proname;
