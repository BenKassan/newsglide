/-- Migration: Create Infinite Topic Hierarchy System
-- Description: Enables infinite drill-down topic exploration with AI-generated subtopics
-- Date: 2025-10-01

-- ============================================================================
-- Table: discover_topics
-- Purpose: Stores hierarchical topic structure with infinite depth
-- ============================================================================

CREATE TABLE IF NOT EXISTS discover_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  path TEXT NOT NULL, -- e.g., "technology/space/mars"
  depth INTEGER NOT NULL DEFAULT 0,
  parent_id UUID REFERENCES discover_topics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- null for default/public topics

  -- Caching fields for performance
  cached_subtopics JSONB, -- stores generated subtopics: [{ name, path, article_count }]
  cache_expires_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  article_count INTEGER DEFAULT 0,
  description TEXT, -- optional AI-generated description

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_path_per_user UNIQUE(path, user_id),
  CONSTRAINT valid_depth CHECK (depth >= 0),
  CONSTRAINT valid_article_count CHECK (article_count >= 0)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_discover_topics_path ON discover_topics(path);
CREATE INDEX IF NOT EXISTS idx_discover_topics_parent ON discover_topics(parent_id);
CREATE INDEX IF NOT EXISTS idx_discover_topics_user ON discover_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_discover_topics_depth ON discover_topics(depth);
CREATE INDEX IF NOT EXISTS idx_discover_topics_cache_expiry ON discover_topics(cache_expires_at)
  WHERE cache_expires_at IS NOT NULL;

-- ============================================================================
-- Table: topic_articles
-- Purpose: Junction table linking topics to articles with relevance scores
-- ============================================================================

CREATE TABLE IF NOT EXISTS topic_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES discover_topics(id) ON DELETE CASCADE,
  article_id UUID NOT NULL, -- reference to your articles system (flexible for now)
  relevance_score FLOAT NOT NULL DEFAULT 0.5,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_topic_article UNIQUE(topic_id, article_id),
  CONSTRAINT valid_relevance_score CHECK (relevance_score >= 0.0 AND relevance_score <= 1.0)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_topic_articles_topic ON topic_articles(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_articles_article ON topic_articles(article_id);
CREATE INDEX IF NOT EXISTS idx_topic_articles_relevance ON topic_articles(relevance_score DESC);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE discover_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_articles ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view default (public) topics
CREATE POLICY "Public topics are viewable by everyone"
  ON discover_topics
  FOR SELECT
  USING (user_id IS NULL);

-- Policy: Users can view their own custom topics
CREATE POLICY "Users can view their own topics"
  ON discover_topics
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own custom topics
CREATE POLICY "Users can create their own topics"
  ON discover_topics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own custom topics
CREATE POLICY "Users can update their own topics"
  ON discover_topics
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own custom topics
CREATE POLICY "Users can delete their own topics"
  ON discover_topics
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Anyone can view topic-article associations
CREATE POLICY "Topic articles are viewable by everyone"
  ON topic_articles
  FOR SELECT
  USING (true);

-- Policy: System can insert topic-article associations (via service role)
-- Individual users won't directly insert here, only via service functions

-- ============================================================================
-- Seed Data: Root Topics
-- ============================================================================

INSERT INTO discover_topics (name, path, depth, description) VALUES
  ('Technology', 'technology', 0, 'Explore the latest in tech, AI, software, and innovation'),
  ('Politics', 'politics', 0, 'Political news, elections, policy, and government affairs'),
  ('Science', 'science', 0, 'Scientific discoveries, research, and breakthroughs'),
  ('Business', 'business', 0, 'Business news, markets, economy, and finance'),
  ('Health', 'health', 0, 'Health, medicine, wellness, and medical research'),
  ('Sports', 'sports', 0, 'Sports news, games, athletes, and competitions'),
  ('Entertainment', 'entertainment', 0, 'Movies, TV, music, celebrities, and pop culture'),
  ('World', 'world', 0, 'International news, global events, and world affairs')
ON CONFLICT (path, user_id) DO NOTHING;

-- ============================================================================
-- Functions: Auto-update timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_discover_topics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_discover_topics_timestamp
  BEFORE UPDATE ON discover_topics
  FOR EACH ROW
  EXECUTE FUNCTION update_discover_topics_updated_at();

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function: Get subtopics for a given path
CREATE OR REPLACE FUNCTION get_subtopics(parent_path_param TEXT, user_id_param UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name TEXT,
  path TEXT,
  depth INTEGER,
  article_count INTEGER,
  cached_subtopics JSONB,
  cache_expires_at TIMESTAMP WITH TIME ZONE
) AS $$
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
$$ LANGUAGE plpgsql;

-- Function: Check if cache is valid
CREATE OR REPLACE FUNCTION is_cache_valid(topic_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT cache_expires_at INTO expiry
  FROM discover_topics
  WHERE id = topic_id_param;

  RETURN expiry IS NOT NULL AND expiry > NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE discover_topics IS 'Stores hierarchical topic structure for infinite drill-down exploration';
COMMENT ON COLUMN discover_topics.path IS 'Slash-separated path (e.g., technology/space/mars)';
COMMENT ON COLUMN discover_topics.cached_subtopics IS 'Cached AI-generated subtopics as JSONB array';
COMMENT ON COLUMN discover_topics.user_id IS 'NULL for public topics, user UUID for custom topics';

COMMENT ON TABLE topic_articles IS 'Junction table linking topics to articles with relevance scores';
COMMENT ON COLUMN topic_articles.relevance_score IS 'Relevance score from 0.0 to 1.0 based on semantic + keyword matching';
