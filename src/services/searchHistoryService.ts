
import { supabase } from '@/integrations/supabase/client';
import { NewsData } from '@/services/openaiService';

export interface SearchHistoryItem {
  id: string;
  user_id: string;
  topic: string;
  news_data: NewsData;
  created_at: string;
}

export async function getSearchHistory(userId: string, limit = 50): Promise<SearchHistoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Failed to get search history:', error);
    return [];
  }
}

export async function deleteSearchItem(historyId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('id', historyId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to delete search item:', error);
    return false;
  }
}

export async function clearAllHistory(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to clear search history:', error);
    return false;
  }
}

export async function saveSearchToHistory(userId: string, topic: string, newsData: NewsData): Promise<void> {
  try {
    const { error } = await supabase
      .from('search_history')
      .insert({
        user_id: userId,
        topic,
        news_data: newsData
      });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to save search to history:', error);
  }
}
