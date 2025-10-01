-- Add recommendation_queue column to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS recommendation_queue JSONB DEFAULT '[]'::jsonb;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_recommendation_queue 
ON user_preferences USING gin (recommendation_queue);

-- Add comment for documentation
COMMENT ON COLUMN user_preferences.recommendation_queue IS 'Array of recommended topics that the user has queued for future exploration';