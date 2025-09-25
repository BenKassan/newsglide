-- Add personalization fields to user_preferences table
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS survey_responses JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS interest_profile JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS content_preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS liked_recommendations TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS recommendation_history JSONB DEFAULT '[]';

-- Add comments for documentation
COMMENT ON COLUMN user_preferences.survey_responses IS 'Stores all survey answers in a structured format';
COMMENT ON COLUMN user_preferences.interest_profile IS 'Derived interest categories with weights based on user behavior';
COMMENT ON COLUMN user_preferences.content_preferences IS 'User preferences for reading level, content depth, and format';
COMMENT ON COLUMN user_preferences.onboarding_completed IS 'Whether user has completed the initial onboarding survey';
COMMENT ON COLUMN user_preferences.liked_recommendations IS 'Array of recommendation topics the user has liked';
COMMENT ON COLUMN user_preferences.recommendation_history IS 'History of all recommendations shown to the user with timestamps';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_onboarding ON user_preferences(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_user_preferences_liked_recommendations ON user_preferences USING GIN(liked_recommendations);

-- Example structure for survey_responses:
-- {
--   "fieldOfInterest": ["technology", "science"],
--   "role": "professional",
--   "topicInterests": ["ai", "climate-change"],
--   "newsConsumption": "in-depth",
--   "goals": ["professional-development", "general-knowledge"],
--   "geographicInterest": "global",
--   "timeAvailability": "15-30min",
--   "preferredPerspectives": ["technical", "business"],
--   "updateFrequency": "daily",
--   "completedAt": "2025-01-09T12:00:00Z"
-- }

-- Example structure for interest_profile:
-- {
--   "categories": {
--     "technology": 0.8,
--     "science": 0.6,
--     "business": 0.4
--   },
--   "topics": {
--     "artificial-intelligence": 0.9,
--     "climate-change": 0.7,
--     "quantum-computing": 0.5
--   },
--   "engagement": {
--     "clicks": 150,
--     "searches": 75,
--     "readingTime": 4500
--   }
-- }

-- Example structure for content_preferences:
-- {
--   "readingLevel": "base",
--   "articleLength": "medium",
--   "preferredDepth": "in-depth",
--   "formatPreferences": ["articles", "analysis"],
--   "timeOfDay": {
--     "morning": "quick-briefing",
--     "evening": "deep-dive"
--   }
-- }

-- Example structure for recommendation_history:
-- [
--   {
--     "timestamp": "2025-01-09T12:00:00Z",
--     "recommendations": ["AI regulations 2025", "Climate tech funding"],
--     "clicked": ["AI regulations 2025"],
--     "liked": [],
--     "sessionId": "abc123"
--   }
-- ]