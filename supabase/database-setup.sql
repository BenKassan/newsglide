-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- PROFILES TABLE
-- ================================================
-- This table stores additional user information beyond what Supabase Auth provides
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    full_name TEXT,
    avatar_url TEXT,
    preferred_voice TEXT,
    reading_speed INTEGER DEFAULT 1,
    streak_count INTEGER DEFAULT 0,
    total_articles_read INTEGER DEFAULT 0,
    total_reading_time INTEGER DEFAULT 0, -- in seconds
    last_active_date DATE,
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    achievement_badges JSONB DEFAULT '[]'::JSONB
);

-- ================================================
-- USER PREFERENCES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    news_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
    notification_enabled BOOLEAN DEFAULT true,
    daily_goal INTEGER DEFAULT 5, -- number of articles per day
    preferred_reading_time TIME, -- preferred time to read news
    language_preference TEXT DEFAULT 'en',
    theme_preference TEXT DEFAULT 'light',
    font_size TEXT DEFAULT 'medium',
    auto_play_audio BOOLEAN DEFAULT false
);

-- ================================================
-- READING HISTORY TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.reading_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    article_title TEXT NOT NULL,
    article_url TEXT,
    article_source TEXT,
    category TEXT,
    reading_time INTEGER, -- in seconds
    completed BOOLEAN DEFAULT false,
    bookmarked BOOLEAN DEFAULT false,
    notes TEXT
);

-- ================================================
-- USER ACHIEVEMENTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    achievement_type TEXT NOT NULL,
    achievement_name TEXT NOT NULL,
    achievement_description TEXT,
    points_earned INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::JSONB
);

-- ================================================
-- DAILY CHALLENGES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS public.daily_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
    challenge_type TEXT NOT NULL,
    challenge_goal INTEGER NOT NULL,
    challenge_progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    points_reward INTEGER DEFAULT 10,
    UNIQUE(user_id, challenge_date, challenge_type)
);

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_user_id ON public.reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_created_at ON public.reading_history(created_at);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_user_id ON public.daily_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON public.daily_challenges(challenge_date);

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

-- ================================================
-- PROFILES TABLE POLICIES
-- ================================================
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ================================================
-- USER PREFERENCES TABLE POLICIES
-- ================================================
-- Users can view their own preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences" ON public.user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own preferences" ON public.user_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- ================================================
-- READING HISTORY TABLE POLICIES
-- ================================================
-- Users can view their own reading history
CREATE POLICY "Users can view own reading history" ON public.reading_history
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own reading history
CREATE POLICY "Users can insert own reading history" ON public.reading_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reading history
CREATE POLICY "Users can update own reading history" ON public.reading_history
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own reading history
CREATE POLICY "Users can delete own reading history" ON public.reading_history
    FOR DELETE USING (auth.uid() = user_id);

-- ================================================
-- ACHIEVEMENTS TABLE POLICIES
-- ================================================
-- Users can view their own achievements
CREATE POLICY "Users can view own achievements" ON public.achievements
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own achievements
CREATE POLICY "Users can insert own achievements" ON public.achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ================================================
-- DAILY CHALLENGES TABLE POLICIES
-- ================================================
-- Users can view their own challenges
CREATE POLICY "Users can view own challenges" ON public.daily_challenges
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own challenges
CREATE POLICY "Users can insert own challenges" ON public.daily_challenges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own challenges
CREATE POLICY "Users can update own challenges" ON public.daily_challenges
    FOR UPDATE USING (auth.uid() = user_id);

-- ================================================
-- TRIGGERS AND FUNCTIONS
-- ================================================
-- Function to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (new.id, new.raw_user_meta_data->>'full_name');

    INSERT INTO public.user_preferences (user_id)
    VALUES (new.id);

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update the updated_at column
CREATE OR REPLACE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- SAMPLE DATA FUNCTIONS (Optional - for testing)
-- ================================================
-- Function to create sample daily challenges for a user
CREATE OR REPLACE FUNCTION public.create_daily_challenges_for_user(user_uuid UUID)
RETURNS void AS $$
BEGIN
    -- Create a reading challenge
    INSERT INTO public.daily_challenges (user_id, challenge_type, challenge_goal, points_reward)
    VALUES (user_uuid, 'read_articles', 5, 50)
    ON CONFLICT (user_id, challenge_date, challenge_type) DO NOTHING;

    -- Create a category diversity challenge
    INSERT INTO public.daily_challenges (user_id, challenge_type, challenge_goal, points_reward)
    VALUES (user_uuid, 'diverse_categories', 3, 30)
    ON CONFLICT (user_id, challenge_date, challenge_type) DO NOTHING;

    -- Create a time-based challenge
    INSERT INTO public.daily_challenges (user_id, challenge_type, challenge_goal, points_reward)
    VALUES (user_uuid, 'reading_time', 900, 20) -- 15 minutes in seconds
    ON CONFLICT (user_id, challenge_date, challenge_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- STORAGE BUCKET FOR AVATARS (Run in Supabase Dashboard)
-- ================================================
-- Note: This needs to be run in the Supabase Dashboard under Storage
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('avatars', 'avatars', true);