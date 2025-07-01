
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useRateLimit = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);

  const checkUserRateLimit = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    
    try {
      if (!user) {
        // Check session storage for anonymous rate limit
        const anonSearches = parseInt(sessionStorage.getItem('anon_searches') || '0');
        if (anonSearches >= 3) {
          toast({
            title: "Sign up for more searches",
            description: "Anonymous users can make 3 searches per session. Sign up for unlimited access!",
            variant: "destructive"
          });
          return false;
        }
        sessionStorage.setItem('anon_searches', String(anonSearches + 1));
        return true;
      }

      // Check authenticated user rate limit (10 searches per hour)
      const { count } = await supabase
        .from('search_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
      
      if (count && count >= 10) {
        toast({
          title: "Rate limit reached",
          description: "You can make up to 10 searches per hour. Please try again later.",
          variant: "destructive"
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return true; // Allow request if check fails
    } finally {
      setIsChecking(false);
    }
  }, [user, toast]);

  return { checkUserRateLimit, isChecking };
};
