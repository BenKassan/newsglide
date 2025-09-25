import { supabase } from '@/integrations/supabase/client'

export interface LocalArticle {
  id: string
  user_id?: string
  headline: string
  topic: string
  article_data: any
  saved_at: string
  notes?: string
  tags?: string[]
}

export interface LocalSearchItem {
  id: string
  user_id?: string
  topic: string
  news_data: any
  created_at: string
}

export const localStorageService = {
  // Saved Articles
  saveArticle: (article: Omit<LocalArticle, 'id' | 'saved_at'>) => {
    const saved = JSON.parse(localStorage.getItem('saved_articles') || '[]')
    const newArticle = {
      ...article,
      id: crypto.randomUUID(),
      saved_at: new Date().toISOString()
    }
    saved.push(newArticle)
    localStorage.setItem('saved_articles', JSON.stringify(saved))
    return newArticle
  },

  getSavedArticles: (): LocalArticle[] => {
    return JSON.parse(localStorage.getItem('saved_articles') || '[]')
  },

  removeArticle: (id: string): boolean => {
    const saved = JSON.parse(localStorage.getItem('saved_articles') || '[]')
    const filtered = saved.filter((article: LocalArticle) => article.id !== id)
    localStorage.setItem('saved_articles', JSON.stringify(filtered))
    return true
  },

  updateArticle: (id: string, updates: Partial<LocalArticle>): boolean => {
    const saved = JSON.parse(localStorage.getItem('saved_articles') || '[]')
    const index = saved.findIndex((article: LocalArticle) => article.id === id)
    if (index !== -1) {
      saved[index] = { ...saved[index], ...updates }
      localStorage.setItem('saved_articles', JSON.stringify(saved))
      return true
    }
    return false
  },

  // Search History
  saveSearchToHistory: (search: Omit<LocalSearchItem, 'id' | 'created_at'>) => {
    const history = JSON.parse(localStorage.getItem('search_history') || '[]')
    const newSearch = {
      ...search,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    }
    history.unshift(newSearch) // Add to beginning
    // Keep only last 50 searches
    if (history.length > 50) {
      history.splice(50)
    }
    localStorage.setItem('search_history', JSON.stringify(history))
    return newSearch
  },

  getSearchHistory: (): LocalSearchItem[] => {
    return JSON.parse(localStorage.getItem('search_history') || '[]')
  },

  removeSearchItem: (id: string): boolean => {
    const history = JSON.parse(localStorage.getItem('search_history') || '[]')
    const filtered = history.filter((item: LocalSearchItem) => item.id !== id)
    localStorage.setItem('search_history', JSON.stringify(filtered))
    return true
  },

  clearSearchHistory: (): boolean => {
    localStorage.removeItem('search_history')
    return true
  },

  // Data Migration when user signs up
  migrateToSupabase: async (userId: string) => {
    try {
      console.log('Starting data migration to Supabase for user:', userId)
      
      // Migrate saved articles
      const savedArticles = localStorageService.getSavedArticles()
      if (savedArticles.length > 0) {
        const articlesToMigrate = savedArticles.map(article => ({
          user_id: userId,
          headline: article.headline,
          topic: article.topic,
          article_data: article.article_data,
          notes: article.notes,
          tags: article.tags
        }))
        
        const { error: articlesError } = await supabase
          .from('saved_articles')
          .insert(articlesToMigrate)
        
        if (articlesError) {
          console.error('Error migrating articles:', articlesError)
        } else {
          console.log(`Migrated ${savedArticles.length} saved articles`)
        }
      }

      // Migrate search history
      const searchHistory = localStorageService.getSearchHistory()
      if (searchHistory.length > 0) {
        const searchesToMigrate = searchHistory.map(search => ({
          user_id: userId,
          topic: search.topic,
          news_data: search.news_data
        }))
        
        const { error: searchError } = await supabase
          .from('search_history')
          .insert(searchesToMigrate)
        
        if (searchError) {
          console.error('Error migrating search history:', searchError)
        } else {
          console.log(`Migrated ${searchHistory.length} search items`)
        }
      }

      // Clear localStorage after successful migration
      localStorage.removeItem('saved_articles')
      localStorage.removeItem('search_history')
      
      console.log('Data migration completed successfully')
      return true
    } catch (error) {
      console.error('Failed to migrate data to Supabase:', error)
      return false
    }
  },

  // Clear all local data
  clearAllData: () => {
    localStorage.removeItem('saved_articles')
    localStorage.removeItem('search_history')
  }
}
