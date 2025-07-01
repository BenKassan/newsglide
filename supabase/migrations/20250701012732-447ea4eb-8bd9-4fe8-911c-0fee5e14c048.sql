
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user preferences table
CREATE TABLE public.user_preferences (
  user_id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  default_reading_level TEXT DEFAULT 'base',
  email_notifications BOOLEAN DEFAULT true,
  preferred_news_sources TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create saved articles table
CREATE TABLE public.saved_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  headline TEXT NOT NULL,
  topic TEXT NOT NULL,
  article_data JSONB NOT NULL,
  notes TEXT,
  tags TEXT[],
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create search history table  
CREATE TABLE public.search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  topic TEXT NOT NULL,
  news_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Add RLS policies for user preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Add RLS policies for saved articles
CREATE POLICY "Users can view own saved articles" ON public.saved_articles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own saved articles" ON public.saved_articles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own saved articles" ON public.saved_articles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own saved articles" ON public.saved_articles FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for search history
CREATE POLICY "Users can view own search history" ON public.search_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own search history" ON public.search_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger for profiles
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add updated_at trigger for user_preferences
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.user_preferences 
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
