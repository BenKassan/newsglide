import { supabase } from '@/integrations/supabase/client'
import { NewsData } from '@/services/openaiService'

export interface SearchHistoryItem {
  id: string
  user_id: string
  topic: string
  news_data: NewsData
  created_at: string
}

const prepareNewsDataForHistory = (newsData: NewsData) => {
  const cleanedNewsData: Record<string, any> = {
    ...newsData,
  }

  delete cleanedNewsData.confidenceLevel
  delete cleanedNewsData.topicHottness
  delete cleanedNewsData.keyQuestions
  delete cleanedNewsData.summaryPoints

  return cleanedNewsData
}

export async function getSearchHistory(userId: string, limit = 50): Promise<SearchHistoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Failed to get search history:', error)
    return []
  }
}

export async function deleteSearchItem(historyId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('search_history').delete().eq('id', historyId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Failed to delete search item:', error)
    return false
  }
}

export async function clearAllHistory(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('search_history').delete().eq('user_id', userId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Failed to clear search history:', error)
    return false
  }
}

export async function saveSearchToHistory(
  userId: string,
  topic: string,
  newsData: NewsData
): Promise<SearchHistoryItem | null> {
  try {
    const cleanedNewsData = prepareNewsDataForHistory(newsData)

    const { data, error } = await supabase
      .from('search_history')
      .insert({
        user_id: userId,
        topic,
        news_data: cleanedNewsData,
      })
      .select()
      .single()

    if (error) throw error
    return data as SearchHistoryItem
  } catch (error) {
    console.error('Failed to save search to history:', error)
    return null
  }
}

export async function updateSearchHistoryItem(
  historyId: string,
  newsData: NewsData
): Promise<boolean> {
  try {
    const cleanedNewsData = prepareNewsDataForHistory(newsData)

    const { error } = await supabase
      .from('search_history')
      .update({ news_data: cleanedNewsData })
      .eq('id', historyId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Failed to update search history item:', error)
    return false
  }
}
