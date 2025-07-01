
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
type SavedArticle = Database['public']['Tables']['saved_articles']['Row'];
type SavedArticleInsert = Database['public']['Tables']['saved_articles']['Insert'];
type SearchHistory = Database['public']['Tables']['search_history']['Row'];
type SearchHistoryInsert = Database['public']['Tables']['search_history']['Insert'];
type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];
type UserPreferencesUpdate = Database['public']['Tables']['user_preferences']['Update'];

// Profile operations
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function updateUserProfile(userId: string, updates: ProfileUpdate) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Saved articles operations
export async function saveArticle(userId: string, headline: string, topic: string, articleData: any) {
  const { data, error } = await supabase
    .from('saved_articles')
    .insert({
      user_id: userId,
      headline,
      topic,
      article_data: articleData
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getSavedArticles(userId: string) {
  const { data, error } = await supabase
    .from('saved_articles')
    .select('*')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function deleteSavedArticle(articleId: string) {
  const { error } = await supabase
    .from('saved_articles')
    .delete()
    .eq('id', articleId);
  
  if (error) throw error;
}

export async function updateArticleNotes(articleId: string, notes: string) {
  const { data, error } = await supabase
    .from('saved_articles')
    .update({ notes })
    .eq('id', articleId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Search history operations
export async function saveSearchHistory(userId: string, topic: string, newsData: any) {
  const { data, error } = await supabase
    .from('search_history')
    .insert({
      user_id: userId,
      topic,
      news_data: newsData
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getSearchHistory(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('search_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

export async function clearSearchHistory(userId: string) {
  const { error } = await supabase
    .from('search_history')
    .delete()
    .eq('user_id', userId);
  
  if (error) throw error;
}

// Preferences operations
export async function getUserPreferences(userId: string) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function updateUserPreferences(userId: string, prefs: UserPreferencesUpdate) {
  const { data, error } = await supabase
    .from('user_preferences')
    .update(prefs)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
