
-- Add new columns to user_preferences table for theme and font size
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
ADD COLUMN IF NOT EXISTS font_size text DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large'));

-- Update the updated_at trigger for user_preferences table
CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON public.user_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_updated_at();
