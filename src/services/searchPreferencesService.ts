import { supabase } from '@/integrations/supabase/client'
import {
  SearchFilters,
  UserSearchPreferences,
  DEFAULT_FILTERS,
  normalizeSearchFilters,
} from '@/types/searchFilters.types'
import {
  getUserArticlePreferences,
  mapLengthToWordCount,
} from './articlePreferencesService'

const LOCALSTORAGE_KEY = 'newsglide_search_preferences'

/**
 * Search Preferences Service
 * Handles loading and saving user search filter preferences
 */

/**
 * Get user's saved search preferences from database
 */
export async function getUserSearchPreferences(
  userId: string
): Promise<UserSearchPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('user_search_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No preferences found - this is normal for new users
        return null
      }
      console.error('Error fetching user search preferences:', error)
      return null
    }

    if (!data) return null

    return {
      id: data.id,
      userId: data.user_id,
      filters: normalizeSearchFilters(data.filters as Partial<SearchFilters>),
      applyByDefault: data.apply_by_default,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  } catch (error) {
    console.error('Failed to get user search preferences:', error)
    return null
  }
}

/**
 * Save user's search preferences to database (upsert)
 */
export async function saveUserSearchPreferences(
  userId: string,
  filters: SearchFilters,
  applyByDefault: boolean
): Promise<{ success: boolean; error?: string }> {
  const normalizedFilters = normalizeSearchFilters(filters)
  try {
    const { error } = await supabase.from('user_search_preferences').upsert(
      {
        user_id: userId,
        filters: normalizedFilters as any, // Cast to any for jsonb
        apply_by_default: applyByDefault,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id', // Update if user already has preferences
      }
    )

    if (error) {
      console.error('Error saving user search preferences:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to save user search preferences:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Delete user's saved search preferences
 */
export async function deleteUserSearchPreferences(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_search_preferences')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting user search preferences:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to delete user search preferences:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get search preferences from localStorage (for anonymous users)
 */
export function getLocalSearchPreferences(): SearchFilters | null {
  try {
    const stored = localStorage.getItem(LOCALSTORAGE_KEY)
    if (!stored) return null

    const parsed = JSON.parse(stored)
    return normalizeSearchFilters(parsed as Partial<SearchFilters>)
  } catch (error) {
    console.error('Failed to get local search preferences:', error)
    return null
  }
}

/**
 * Save search preferences to localStorage (for anonymous users)
 */
export function saveLocalSearchPreferences(filters: SearchFilters): void {
  try {
    localStorage.setItem(
      LOCALSTORAGE_KEY,
      JSON.stringify(normalizeSearchFilters(filters))
    )
  } catch (error) {
    console.error('Failed to save local search preferences:', error)
  }
}

/**
 * Clear search preferences from localStorage
 */
export function clearLocalSearchPreferences(): void {
  try {
    localStorage.removeItem(LOCALSTORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear local search preferences:', error)
  }
}

/**
 * Get effective search filters for a user
 * Priority: saved preferences > localStorage > defaults
 */
export async function getEffectiveSearchFilters(
  userId?: string
): Promise<SearchFilters> {
  // Try to get saved preferences for authenticated users
  if (userId) {
    const [savedSearchPrefs, articlePrefs] = await Promise.all([
      getUserSearchPreferences(userId),
      getUserArticlePreferences(userId),
    ])

    if (savedSearchPrefs?.applyByDefault) {
      // Saved search filters may include freshness or other toggles, but article-level
      // preferences should always control format/length (and force PhD analysis when needed).
      const normalizedSaved = normalizeSearchFilters(savedSearchPrefs.filters)
      return normalizeSearchFilters({
        ...normalizedSaved,
        targetWordCount: mapLengthToWordCount(articlePrefs.articleLength),
        articleFormat: articlePrefs.articleStyle,
        includePhdAnalysis:
          articlePrefs.readingLevel === 'phd'
            ? true
            : normalizedSaved.includePhdAnalysis,
      })
    }

    return normalizeSearchFilters({
      targetWordCount: mapLengthToWordCount(articlePrefs.articleLength),
      articleFormat: articlePrefs.articleStyle,
      includePhdAnalysis: articlePrefs.readingLevel === 'phd',
    })
  }

  // Fall back to localStorage for anonymous users or users without saved preferences
  const localPrefs = getLocalSearchPreferences()
  if (localPrefs) {
    return normalizeSearchFilters(localPrefs)
  }

  // Fall back to defaults
  return DEFAULT_FILTERS
}
