-- User Memories Schema Migration
-- Creates table for storing user-specific information that Glidey should remember

-- Create user_memories table
CREATE TABLE IF NOT EXISTS user_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_key TEXT NOT NULL CHECK (char_length(memory_key) BETWEEN 1 AND 200),
  memory_value TEXT NOT NULL CHECK (char_length(memory_value) BETWEEN 1 AND 2000),
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_updated_at ON user_memories(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_memories_category ON user_memories(category) WHERE category IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own memories" ON user_memories;
DROP POLICY IF EXISTS "Users can create own memories" ON user_memories;
DROP POLICY IF EXISTS "Users can update own memories" ON user_memories;
DROP POLICY IF EXISTS "Users can delete own memories" ON user_memories;

-- RLS Policies for user_memories table
CREATE POLICY "Users can view own memories"
  ON user_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own memories"
  ON user_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
  ON user_memories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
  ON user_memories FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_memory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamp on memory updates
DROP TRIGGER IF EXISTS update_user_memory_timestamp_trigger ON user_memories;
CREATE TRIGGER update_user_memory_timestamp_trigger
  BEFORE UPDATE ON user_memories
  FOR EACH ROW
  EXECUTE FUNCTION update_user_memory_timestamp();
