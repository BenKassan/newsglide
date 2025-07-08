-- Store debate generation history
CREATE TABLE public.debate_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  news_data_id UUID REFERENCES search_history(id),
  topic TEXT NOT NULL,
  participant_1 TEXT NOT NULL,
  participant_2 TEXT NOT NULL,
  debate_content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.debate_history ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view own debates" ON public.debate_history 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own debates" ON public.debate_history 
  FOR INSERT WITH CHECK (auth.uid() = user_id);