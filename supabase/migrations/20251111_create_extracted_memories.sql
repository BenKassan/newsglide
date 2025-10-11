-- AI-Extracted Memories Schema Migration
-- Stores memories automatically extracted from chat conversations for enhanced personalization

-- Create extracted_memories table
CREATE TABLE IF NOT EXISTS extracted_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,

  -- Memory classification
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'personal_info',    -- Name, occupation, location, etc.
    'preference',       -- Likes, dislikes, opinions
    'goal',            -- Aspirations, plans, objectives
    'context',         -- Current situation, circumstances
    'relationship',    -- Family, friends, colleagues mentioned
    'experience',      -- Past events, stories shared
    'interest',        -- Topics of interest discovered
    'constraint'       -- Limitations, restrictions (time, budget, etc)
  )),

  -- The extracted memory
  memory_key TEXT NOT NULL CHECK (char_length(memory_key) BETWEEN 1 AND 200),
  memory_content TEXT NOT NULL CHECK (char_length(memory_content) BETWEEN 1 AND 2000),

  -- Scoring and metadata
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  importance_score DECIMAL(3,2) CHECK (importance_score >= 0 AND importance_score <= 1),

  -- Temporal relevance
  expires_at TIMESTAMP WITH TIME ZONE, -- For temporal facts like "I'm moving next month"

  -- Tracking
  auto_extracted BOOLEAN DEFAULT true, -- true if AI extracted, false if user manually added
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN (
    'unverified',     -- Not yet confirmed
    'user_confirmed', -- User confirmed this is accurate
    'user_corrected', -- User corrected this memory
    'obsolete'        -- No longer relevant/accurate
  )),

  -- Additional context
  source_text TEXT, -- The original text this was extracted from
  metadata JSONB DEFAULT '{}', -- Additional context (model used, extraction method, etc)

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_extracted_memories_user_id ON extracted_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_extracted_memories_conversation_id ON extracted_memories(conversation_id);
CREATE INDEX IF NOT EXISTS idx_extracted_memories_memory_type ON extracted_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_extracted_memories_importance ON extracted_memories(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_extracted_memories_created_at ON extracted_memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_extracted_memories_expires_at ON extracted_memories(expires_at);

-- Enable Row Level Security
ALTER TABLE extracted_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own extracted memories"
  ON extracted_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert extracted memories"
  ON extracted_memories FOR INSERT
  WITH CHECK (true); -- Edge functions with service role can insert

CREATE POLICY "Users can update own extracted memories"
  ON extracted_memories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own extracted memories"
  ON extracted_memories FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_extracted_memory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp updates
CREATE TRIGGER update_extracted_memory_timestamp_trigger
  BEFORE UPDATE ON extracted_memories
  FOR EACH ROW
  EXECUTE FUNCTION update_extracted_memory_timestamp();

-- Function to merge extracted memories with manual memories for unified access
CREATE OR REPLACE FUNCTION get_all_user_memories(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  memory_type TEXT,
  memory_key TEXT,
  memory_value TEXT,
  confidence DECIMAL,
  importance DECIMAL,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  -- Manual memories (from user_memories table)
  SELECT
    um.id,
    'manual'::TEXT as memory_type,
    um.memory_key,
    um.memory_value,
    1.0::DECIMAL as confidence,
    1.0::DECIMAL as importance,
    'user'::TEXT as source,
    um.created_at
  FROM user_memories um
  WHERE um.user_id = p_user_id

  UNION ALL

  -- Extracted memories
  SELECT
    em.id,
    em.memory_type,
    em.memory_key,
    em.memory_content as memory_value,
    em.confidence_score as confidence,
    em.importance_score as importance,
    'ai_extracted'::TEXT as source,
    em.created_at
  FROM extracted_memories em
  WHERE em.user_id = p_user_id
    AND em.verification_status != 'obsolete'
    AND (em.expires_at IS NULL OR em.expires_at > NOW())

  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_user_memories(UUID) TO authenticated;

-- Create view for high-confidence memories
CREATE OR REPLACE VIEW high_confidence_memories AS
SELECT
  user_id,
  memory_type,
  memory_key,
  memory_content,
  confidence_score,
  importance_score,
  created_at
FROM extracted_memories
WHERE confidence_score >= 0.8
  AND verification_status != 'obsolete'
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY importance_score DESC, created_at DESC;

-- Grant permissions on the view
GRANT SELECT ON high_confidence_memories TO authenticated;

-- Function to prevent duplicate memory extraction
CREATE OR REPLACE FUNCTION prevent_duplicate_memory()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a very similar memory already exists
  IF EXISTS (
    SELECT 1 FROM extracted_memories
    WHERE user_id = NEW.user_id
      AND memory_type = NEW.memory_type
      AND similarity(memory_content, NEW.memory_content) > 0.85
      AND created_at > NOW() - INTERVAL '7 days'
  ) THEN
    -- Update the existing memory's importance instead of creating duplicate
    UPDATE extracted_memories
    SET importance_score = GREATEST(importance_score, NEW.importance_score),
        updated_at = NOW()
    WHERE user_id = NEW.user_id
      AND memory_type = NEW.memory_type
      AND similarity(memory_content, NEW.memory_content) > 0.85
      AND created_at > NOW() - INTERVAL '7 days';

    -- Prevent the insert
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enable pg_trgm extension for similarity matching (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigger to prevent duplicates
CREATE TRIGGER prevent_duplicate_memory_trigger
  BEFORE INSERT ON extracted_memories
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_memory();

-- Comments for documentation
COMMENT ON TABLE extracted_memories IS 'Stores memories automatically extracted from user conversations by AI for enhanced personalization';
COMMENT ON COLUMN extracted_memories.memory_type IS 'Classification of the memory for better organization and retrieval';
COMMENT ON COLUMN extracted_memories.confidence_score IS 'AI confidence in the extraction accuracy (0.0 to 1.0)';
COMMENT ON COLUMN extracted_memories.importance_score IS 'Estimated importance of this memory for personalization (0.0 to 1.0)';
COMMENT ON COLUMN extracted_memories.expires_at IS 'When this memory becomes irrelevant (e.g., "I have a meeting tomorrow")';

-- Example usage:
-- Get all memories for a user (manual + extracted):
-- SELECT * FROM get_all_user_memories('user-uuid-here');

-- Get high-importance recent memories:
-- SELECT * FROM extracted_memories
-- WHERE user_id = ? AND importance_score > 0.7
-- ORDER BY created_at DESC LIMIT 20;