import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@features/auth'
import { useToast } from './use-toast'

export interface SearchHistoryItem {
  id: string
  user_id: string
  query: string
  created_at: string
}

export function useSearchHistory() {
  const { user } = useAuth()
  const { toast } = useToast()

  return useQuery<SearchHistoryItem[]>({
    queryKey: ['search-history', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error fetching search history:', error)
        toast({
          title: 'Error loading search history',
          description: 'Failed to load your search history. Please try again.',
          variant: 'destructive',
        })
        throw error
      }

      return data || []
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}
