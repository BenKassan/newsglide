-- Fix the ambiguous user_id error in increment_search_count function
CREATE OR REPLACE FUNCTION public.increment_search_count(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Reset if new day
  UPDATE public.user_preferences 
  SET daily_search_count = 0, last_search_reset = CURRENT_DATE
  WHERE user_id = p_user_id AND last_search_reset < CURRENT_DATE;
  
  -- Increment count
  UPDATE public.user_preferences 
  SET daily_search_count = daily_search_count + 1
  WHERE user_id = p_user_id;
END;
$function$