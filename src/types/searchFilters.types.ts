/**
 * Search Filters Types
 *
 * Defines the structure for user search preferences and filters
 */

export interface SearchFilters {
  // Analysis depth
  includePhdAnalysis: boolean

  // Time range (in hours)
  // 24 = last 24 hours, 48 = last 48 hours (default), 168 = last week
  freshnessHorizonHours: 24 | 48 | 168

  // Article length (target word count)
  // 300 = short, 500 = standard (default), 1000 = long
  targetWordCount: 300 | 500 | 1000
}

export interface UserSearchPreferences {
  id?: string
  userId: string
  filters: SearchFilters
  applyByDefault: boolean // If true, these filters are used for all searches
  createdAt?: Date
  updatedAt?: Date
}

// Default filter values (matching current behavior)
export const DEFAULT_FILTERS: SearchFilters = {
  includePhdAnalysis: false,
  freshnessHorizonHours: 48,
  targetWordCount: 500,
}

// Helper to get time range label
export const getTimeRangeLabel = (hours: 24 | 48 | 168): string => {
  switch (hours) {
    case 24:
      return 'Last 24 hours'
    case 48:
      return 'Last 2 days'
    case 168:
      return 'Last week'
    default:
      return 'Last 2 days'
  }
}

// Helper to get article length label
export const getArticleLengthLabel = (wordCount: 300 | 500 | 1000): string => {
  switch (wordCount) {
    case 300:
      return 'Short (~300 words)'
    case 500:
      return 'Standard (~500 words)'
    case 1000:
      return 'Long (~1000 words)'
    default:
      return 'Standard (~500 words)'
  }
}
