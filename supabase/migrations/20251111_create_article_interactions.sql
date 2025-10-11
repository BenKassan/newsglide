-- Article Interactions Tracking Schema Migration
-- Tracks all user interactions with articles for personalization and analytics

-- Create article_interactions table
CREATE TABLE IF NOT EXISTS article_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL, -- The article topic/search term as unique identifier
  action_type TEXT NOT NULL CHECK (action_type IN (
    'view',                -- Article opened/loaded
    'read',               -- Article read (based on time/scroll)
    'abandon',            -- Article quickly closed (<10 seconds)
    'save',              -- Article saved to library
    'share',             -- Article shared (future feature)
    'reading_level_change', -- Changed between base/eli5/phd
    'source_click',      -- Clicked on source link
    'copy',              -- Content copied
    'debate_view'        -- Viewed AI debate
  )),
  reading_level TEXT CHECK (reading_level IN ('base', 'eli5', 'phd')),
  duration_seconds INTEGER, -- How long spent on article
  scroll_depth DECIMAL(3,2) CHECK (scroll_depth >= 0 AND scroll_depth <= 1), -- 0-1 percentage
  source_outlet TEXT, -- Which source was clicked (if action_type='source_click')
  metadata JSONB DEFAULT '{}', -- Additional context (device, viewport, etc)
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
CREATE POLICY "Users can view own article interactions"
  ON article_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own article interactions"
  ON article_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policies - interactions are immutable for data integrity

-- Create aggregated view for article engagement metrics
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
  -- Calculate engagement score (0-100)
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

-- Grant permissions on the view
GRANT SELECT ON article_engagement_summary TO authenticated;

-- Create function to automatically mark article as 'read' based on engagement
CREATE OR REPLACE FUNCTION mark_article_as_read()
RETURNS TRIGGER AS $$
BEGIN
  -- If viewing for >30 seconds OR scrolled >50%, mark as read
  IF NEW.action_type = 'view' AND
     (NEW.duration_seconds > 30 OR NEW.scroll_depth > 0.5) THEN
    -- Insert a 'read' action
    INSERT INTO article_interactions (
      user_id,
      topic,
      action_type,
      reading_level,
      duration_seconds,
      scroll_depth,
      metadata
    ) VALUES (
      NEW.user_id,
      NEW.topic,
      'read',
      NEW.reading_level,
      NEW.duration_seconds,
      NEW.scroll_depth,
      NEW.metadata
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-marking reads
CREATE TRIGGER auto_mark_article_read_trigger
  AFTER INSERT ON article_interactions
  FOR EACH ROW
  WHEN (NEW.action_type = 'view')
  EXECUTE FUNCTION mark_article_as_read();

-- Comments for documentation
COMMENT ON TABLE article_interactions IS 'Tracks all user interactions with news articles for personalization and engagement analytics';
COMMENT ON COLUMN article_interactions.topic IS 'The search topic/query that generated the article - acts as article identifier';
COMMENT ON COLUMN article_interactions.scroll_depth IS 'Percentage of article scrolled (0.0 to 1.0)';
COMMENT ON COLUMN article_interactions.engagement_score IS 'Calculated score 0-100 based on various interaction signals';

-- Example queries for analytics:
-- Most engaged topics for a user:
-- SELECT topic, engagement_score FROM article_engagement_summary
-- WHERE user_id = ? ORDER BY engagement_score DESC LIMIT 10;

-- Topics with high abandonment rate:
-- SELECT topic, abandon_count::float / NULLIF(view_count, 0) as abandon_rate
-- FROM article_engagement_summary
-- WHERE user_id = ? AND view_count > 0
-- ORDER BY abandon_rate DESC;