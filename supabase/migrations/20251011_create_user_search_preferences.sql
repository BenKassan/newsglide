-- Create user_search_preferences table
-- Stores user's saved search filter preferences

CREATE TABLE IF NOT EXISTS public.user_search_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filters JSONB NOT NULL DEFAULT '{
        "includePhdAnalysis": false,
        "freshnessHorizonHours": 48,
        "targetWordCount": 500
    }'::jsonb,
    apply_by_default BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one preference row per user
    CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_search_preferences_user_id
ON public.user_search_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE public.user_search_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own preferences
CREATE POLICY "Users can view their own search preferences"
    ON public.user_search_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search preferences"
    ON public.user_search_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own search preferences"
    ON public.user_search_preferences
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search preferences"
    ON public.user_search_preferences
    FOR DELETE
    USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_search_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before UPDATE
CREATE TRIGGER update_user_search_preferences_updated_at
    BEFORE UPDATE ON public.user_search_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_search_preferences_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_search_preferences TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
