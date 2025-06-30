
import { supabase } from '@/integrations/supabase/client';
import { NewsData } from './openaiService';

export interface SearchHistoryItem {
  id: string;
  user_id: string;
  topic: string;
  news_data: NewsData;
  created_at: string;
}

class ActivityService {
  async saveSearch(topic: string, newsData: NewsData): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('search_history')
        .insert({
          user_id: user.id,
          topic,
          news_data: newsData
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error saving search:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error in saveSearch:', error);
      return null;
    }
  }

  async getSearchHistory(limit: number = 10): Promise<SearchHistoryItem[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching search history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSearchHistory:', error);
      return [];
    }
  }
}

export const activityService = new ActivityService();
