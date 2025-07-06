import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@features/auth'
import {
  getSearchHistory,
  saveSearchItem,
  deleteSearchItem,
  clearAllHistory,
  SearchHistoryItem,
} from '../services/searchHistoryService'
import { useToast } from '@shared/hooks/use-toast'

export const useSearchHistory = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const {
    data: searchHistory = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['searchHistory', user?.id],
    queryFn: () => getSearchHistory(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })

  const saveSearchMutation = useMutation({
    mutationFn: (searchItem: Omit<SearchHistoryItem, 'id' | 'searched_at'>) =>
      saveSearchItem(searchItem, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searchHistory', user?.id] })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save search. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const deleteSearchMutation = useMutation({
    mutationFn: (itemId: string) => deleteSearchItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searchHistory', user?.id] })
      toast({
        title: 'Search Removed',
        description: 'The search has been removed from your history.',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete search. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const clearHistoryMutation = useMutation({
    mutationFn: () => clearAllHistory(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['searchHistory', user?.id] })
      toast({
        title: 'History Cleared',
        description: 'Your search history has been cleared.',
      })
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to clear history. Please try again.',
        variant: 'destructive',
      })
    },
  })

  return {
    searchHistory,
    isLoading,
    error,
    refetch,
    saveSearch: saveSearchMutation.mutate,
    deleteSearch: deleteSearchMutation.mutate,
    clearHistory: clearHistoryMutation.mutate,
    isSaving: saveSearchMutation.isLoading,
    isDeleting: deleteSearchMutation.isLoading,
    isClearing: clearHistoryMutation.isLoading,
  }
}
