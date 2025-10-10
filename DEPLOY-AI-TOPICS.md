# Deploy AI Topic Generation System

The Edge Function is deployed! Now we need to complete the database setup and add your OpenAI API key.

## Step 1: Apply Database Migration

Go to: https://supabase.com/dashboard/project/icwusduvaohosrvxlahh/sql/new

Copy and paste this SQL, then click "Run":

```sql
-- Create discover_topic_cache table for instant serving
CREATE TABLE IF NOT EXISTS discover_topic_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL,
  generation_number int NOT NULL,
  topics jsonb NOT NULL,
  creativity_level float NOT NULL DEFAULT 0.0,
  is_consumed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  consumed_at timestamp with time zone,
  UNIQUE(category_name, generation_number)
);

-- Create discover_generation_history table
CREATE TABLE IF NOT EXISTS discover_generation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL,
  generation_number int NOT NULL,
  topic_names text[] NOT NULL,
  creativity_level float NOT NULL,
  model_used text NOT NULL,
  generation_time_ms int,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(category_name, generation_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_topic_cache_category_unconsumed
  ON discover_topic_cache(category_name, is_consumed)
  WHERE is_consumed = false;

CREATE INDEX IF NOT EXISTS idx_topic_cache_created
  ON discover_topic_cache(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_generation_history_category
  ON discover_generation_history(category_name, generation_number DESC);

-- RLS Policies
ALTER TABLE discover_topic_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE discover_generation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view topic cache"
  ON discover_topic_cache FOR SELECT TO public USING (true);

CREATE POLICY "Public can view generation history"
  ON discover_generation_history FOR SELECT TO public USING (true);

CREATE POLICY "Users can mark cache consumed"
  ON discover_topic_cache FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage cache"
  ON discover_topic_cache FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage history"
  ON discover_generation_history FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Functions
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

CREATE OR REPLACE FUNCTION mark_cache_consumed(p_cache_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE discover_topic_cache
  SET is_consumed = true, consumed_at = now()
  WHERE id = p_cache_id;
END;
$$ LANGUAGE plpgsql;

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
```

## Step 2: Add OpenAI API Key

1. Go to: https://supabase.com/dashboard/project/icwusduvaohosrvxlahh/settings/functions
2. Click "Add secret"
3. Name: `OPENAI_API_KEY`
4. Value: Your OpenAI API key (starts with sk-...)
5. Click "Save"

## Step 3: Test It!

After completing steps 1 and 2, refresh your NewsGlide page and click "Generate New Topics". You should now see:
- Fresh AI-generated topics
- No more "All topics shown" message after 1-2 clicks
- Topics get progressively more creative
- Never repeat until you've seen many generations

## How It Works

- **Generation 1** (20% creativity): Mainstream topics like "NFL", "Bitcoin"
- **Generation 2** (30% creativity): More specific like "NFL Draft Strategy"
- **Generation 3** (40% creativity): Deeper topics like "NFL Salary Cap Analytics"
- **Generation 4+** (50-95% creativity): Interdisciplinary and cutting-edge topics

Each category tracks what topics have been shown, and the AI is explicitly instructed to avoid repeating them!
