import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@features/auth'
import { useToast } from './use-toast'
import { NewsData } from '@services/openaiService'

export interface SavedArticle {
  id: string
  user_id: string
  news_data: NewsData
  created_at: string
  tags?: string[]
}

export function useSavedArticles() {
  const { user } = useAuth()
  const { toast } = useToast()

  const query = useQuery<SavedArticle[]>({
    queryKey: ['saved-articles', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('saved_articles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching saved articles:', error)
        toast({
          title: 'Error loading articles',
          description: 'Failed to load your saved articles. Please try again.',
          variant: 'destructive',
        })
        throw error
      }

      return data || []
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })

  return {
    ...query,
    articles: query.data ?? [],
  }
}
