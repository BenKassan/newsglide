
-- Simple cache table for NewsGlide backend caching
CREATE TABLE IF NOT EXISTS public.news_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  topic TEXT NOT NULL,
  news_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_news_cache_key ON public.news_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_news_cache_created ON public.news_cache(created_at);

-- Clean up old cache automatically
CREATE OR REPLACE FUNCTION delete_old_cache_entries() 
RETURNS void AS $$
BEGIN
  DELETE FROM public.news_cache WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;
