
import { supabase } from '@/integrations/supabase/client';
import { NewsData } from '@/services/openaiService';

export interface SavedArticle {
  id: string;
  user_id: string;
  headline: string;
  topic: string;
  article_data: NewsData;
  notes?: string;
  tags?: string[];
  saved_at: string;
}

export async function saveArticle(userId: string, newsData: NewsData, tags?: string[]): Promise<{success: boolean, alreadySaved?: boolean, error?: string}> {
  try {
    // Check if already saved
    const { data: existing, error: checkError } = await supabase
      .from('saved_articles')
      .select('id')
      .eq('user_id', userId)
      .eq('topic', newsData.topic)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existing) {
      return { success: false, alreadySaved: true };
    }

    // Save the article
    const { error } = await supabase
      .from('saved_articles')
      .insert({
        user_id: userId,
        headline: newsData.headline,
        topic: newsData.topic,
        article_data: newsData,
        tags: tags || [],
        notes: ''
      });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Failed to save article:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save article' };
  }
}

export async function getSavedArticles(userId: string): Promise<SavedArticle[]> {
  try {
    const { data, error } = await supabase
      .from('saved_articles')
      .select('*')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Failed to get saved articles:', error);
    return [];
  }
}

export async function updateArticleNotes(articleId: string, notes: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('saved_articles')
      .update({ notes })
      .eq('id', articleId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to update notes:', error);
    return false;
  }
}

export async function updateArticleTags(articleId: string, tags: string[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('saved_articles')
      .update({ tags })
      .eq('id', articleId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to update tags:', error);
    return false;
  }
}

export async function deleteArticle(articleId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('saved_articles')
      .delete()
      .eq('id', articleId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to delete article:', error);
    return false;
  }
}

export async function checkIfArticleSaved(userId: string, topic: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('saved_articles')
      .select('id')
      .eq('user_id', userId)
      .eq('topic', topic)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Failed to check if article saved:', error);
    return false;
  }
}
