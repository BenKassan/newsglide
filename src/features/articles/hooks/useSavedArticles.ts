import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@features/auth'
import {
  getSavedArticles,
  saveArticle,
  deleteArticle,
  updateArticleNotes,
  updateArticleTags,
  SavedArticle,
} from '../services/savedArticlesService'
import { useToast } from '@shared/hooks/use-toast'

export const useSavedArticles = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const {
    data: savedArticles = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['savedArticles', user?.id],
    queryFn: () => getSavedArticles(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  const saveArticleMutation = useMutation({
    mutationFn: (article: Omit<SavedArticle, 'id' | 'saved_at'>) => saveArticle(article, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedArticles', user?.id] })
      toast({
        title: 'Article Saved',
        description: 'The article has been saved to your collection.',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save article. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const deleteArticleMutation = useMutation({
    mutationFn: (articleId: string) => deleteArticle(articleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedArticles', user?.id] })
      toast({
        title: 'Article Deleted',
        description: 'The article has been removed from your saved articles.',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete article. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const updateNotesMutation = useMutation({
    mutationFn: ({ articleId, notes }: { articleId: string; notes: string }) =>
      updateArticleNotes(articleId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedArticles', user?.id] })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update notes. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const updateTagsMutation = useMutation({
    mutationFn: ({ articleId, tags }: { articleId: string; tags: string[] }) =>
      updateArticleTags(articleId, tags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedArticles', user?.id] })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update tags. Please try again.',
        variant: 'destructive',
      })
    },
  })

  return {
    savedArticles,
    isLoading,
    error,
    refetch,
    saveArticle: saveArticleMutation.mutate,
    deleteArticle: deleteArticleMutation.mutate,
    updateNotes: updateNotesMutation.mutate,
    updateTags: updateTagsMutation.mutate,
    isSaving: saveArticleMutation.isLoading,
    isDeleting: deleteArticleMutation.isLoading,
  }
}
