
-- Create news cache table for reducing API calls
CREATE TABLE public.news_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  topic TEXT NOT NULL,
  news_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  hit_count INTEGER DEFAULT 0
);

-- Create performance monitoring table
CREATE TABLE public.performance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operation TEXT NOT NULL,
  duration INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Create indexes for optimal performance
CREATE INDEX idx_news_cache_key ON public.news_cache(cache_key);
CREATE INDEX idx_news_cache_created ON public.news_cache(created_at);
CREATE INDEX idx_news_cache_topic ON public.news_cache(topic);

-- Indexes for existing tables to improve query performance
CREATE INDEX idx_saved_articles_user_topic ON public.saved_articles(user_id, topic);
CREATE INDEX idx_search_history_user_created ON public.search_history(user_id, created_at DESC);
CREATE INDEX idx_saved_articles_user_saved_at ON public.saved_articles(user_id, saved_at DESC);

-- Function to auto-delete old cache entries
CREATE OR REPLACE FUNCTION delete_old_cache() RETURNS void AS $$
BEGIN
  DELETE FROM public.news_cache WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on new tables
ALTER TABLE public.news_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;

-- Cache is public readable, only functions can write
CREATE POLICY "Anyone can read cache" ON public.news_cache FOR SELECT USING (true);
CREATE POLICY "Service role can manage cache" ON public.news_cache FOR ALL USING (auth.role() = 'service_role');

-- Performance logs are user-specific
CREATE POLICY "Users can view own logs" ON public.performance_logs FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Anyone can insert logs" ON public.performance_logs FOR INSERT WITH CHECK (true);
