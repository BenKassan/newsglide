-- Create discover_topic_cache table for instant serving
-- This table stores pre-generated topic sets for each category
-- Enables <100ms response time by serving from cache

CREATE TABLE IF NOT EXISTS discover_topic_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL,
  generation_number int NOT NULL,
  topics jsonb NOT NULL, -- Array of topic objects with id, title, category, etc.
  creativity_level float NOT NULL DEFAULT 0.0,
  is_consumed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  consumed_at timestamp with time zone,

  -- Ensure unique cache entries per category/generation
  UNIQUE(category_name, generation_number)
);

-- Create discover_generation_history table for tracking all generations
-- Tracks what topics have been generated to prevent duplicates
CREATE TABLE IF NOT EXISTS discover_generation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL,
  generation_number int NOT NULL,
  topic_names text[] NOT NULL, -- Array of generated topic names for duplicate checking
  creativity_level float NOT NULL,
  model_used text NOT NULL, -- 'gpt-3.5-turbo' or 'gpt-4'
  generation_time_ms int, -- Track performance
  created_at timestamp with time zone DEFAULT now(),

  UNIQUE(category_name, generation_number)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_topic_cache_category_unconsumed
  ON discover_topic_cache(category_name, is_consumed)
  WHERE is_consumed = false;

CREATE INDEX IF NOT EXISTS idx_topic_cache_created
  ON discover_topic_cache(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generation_history_category
  ON discover_generation_history(category_name, generation_number DESC);

-- RLS Policies (public read, admin write)
ALTER TABLE discover_topic_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE discover_generation_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access to cache
CREATE POLICY "Public can view topic cache"
  ON discover_topic_cache
  FOR SELECT
  TO public
  USING (true);

-- Allow public read access to history
CREATE POLICY "Public can view generation history"
  ON discover_generation_history
  FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to mark cache as consumed
CREATE POLICY "Users can mark cache consumed"
  ON discover_topic_cache
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow service role to insert/update (for Edge Functions)
CREATE POLICY "Service role can manage cache"
  ON discover_topic_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage history"
  ON discover_generation_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Helper function to get next unconsumed cache entry
CREATE OR REPLACE FUNCTION get_next_cached_topics(p_category_name text)
RETURNS TABLE (
  id uuid,
  category_name text,
  generation_number int,
  topics jsonb,
  creativity_level float,
  created_at timestamp with time zone
) AS $$
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
$$ LANGUAGE plpgsql;

-- Helper function to mark cache as consumed
CREATE OR REPLACE FUNCTION mark_cache_consumed(p_cache_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE discover_topic_cache
  SET is_consumed = true,
      consumed_at = now()
  WHERE id = p_cache_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get all previous topic names for duplicate prevention
CREATE OR REPLACE FUNCTION get_previous_topic_names(p_category_name text)
RETURNS text[] AS $$
DECLARE
  all_topics text[];
BEGIN
  SELECT array_agg(DISTINCT unnest(topic_names))
  INTO all_topics
  FROM discover_generation_history
  WHERE category_name = p_category_name;

  RETURN COALESCE(all_topics, ARRAY[]::text[]);
END;
$$ LANGUAGE plpgsql;

-- Helper function to get next generation number for a category
CREATE OR REPLACE FUNCTION get_next_generation_number(p_category_name text)
RETURNS int AS $$
DECLARE
  max_gen int;
BEGIN
  SELECT COALESCE(MAX(generation_number), 0) + 1
  INTO max_gen
  FROM discover_generation_history
  WHERE category_name = p_category_name;

  RETURN max_gen;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE discover_topic_cache IS 'Pre-generated topic sets for instant serving (<100ms response)';
COMMENT ON TABLE discover_generation_history IS 'Complete history of generated topics for duplicate prevention';
COMMENT ON FUNCTION get_next_cached_topics IS 'Get next unconsumed cached topic set for a category';
COMMENT ON FUNCTION mark_cache_consumed IS 'Mark a cache entry as consumed and timestamp it';
COMMENT ON FUNCTION get_previous_topic_names IS 'Get all previously generated topic names for duplicate checking';
COMMENT ON FUNCTION get_next_generation_number IS 'Get the next generation number for a category';
