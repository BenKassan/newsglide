/**
 * Search Filters Types
 *
 * Defines the structure for user search preferences and filters
 */

export type ArticleFormat = 'paragraphs' | 'bullets'

export type TargetWordCount = 200 | 400 | 800 | 1200

export interface SearchFilters {
  // Analysis depth
  includePhdAnalysis: boolean

  // Time range (in hours)
  // 24 = last 24 hours, 72 = last 3 days (default)
  freshnessHorizonHours: 24 | 72

  // Article length (target word count)
  // 200 = short, 400 = medium (default), 800 = long, 1200 = super long
  targetWordCount: TargetWordCount

  // Article presentation style
  articleFormat: ArticleFormat
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
  freshnessHorizonHours: 72,
  targetWordCount: 400,
  articleFormat: 'paragraphs',
}

const normalizeFreshnessHorizon = (hours?: number): 24 | 72 => {
  if (hours === 24 || hours === 72) {
    return hours
  }

  // Gracefully handle legacy values that might still be stored
  if (hours === 48 || hours === 168) {
    return 72
  }

  return DEFAULT_FILTERS.freshnessHorizonHours
}

const normalizeTargetWordCount = (wordCount?: number): TargetWordCount => {
  if (wordCount === 200 || wordCount === 400 || wordCount === 800 || wordCount === 1200) {
    return wordCount
  }

  if (typeof wordCount !== 'number' || Number.isNaN(wordCount)) {
    return DEFAULT_FILTERS.targetWordCount
  }

  if (wordCount <= 260) return 200
  if (wordCount <= 600) return 400
  if (wordCount <= 1000) return 800
  return 1200
}

export const normalizeSearchFilters = (filters?: Partial<SearchFilters>): SearchFilters => ({
  includePhdAnalysis: filters?.includePhdAnalysis ?? DEFAULT_FILTERS.includePhdAnalysis,
  freshnessHorizonHours: normalizeFreshnessHorizon(filters?.freshnessHorizonHours),
  targetWordCount: normalizeTargetWordCount(filters?.targetWordCount),
  articleFormat: filters?.articleFormat ?? DEFAULT_FILTERS.articleFormat,
})

// Helper to get time range label
export const getTimeRangeLabel = (hours: 24 | 72): string => {
  switch (hours) {
    case 24:
      return 'Last 24 hours'
    case 72:
      return 'Last 3 days'
    default:
      return 'Last 3 days'
  }
}

// Helper to get article length label
export const getArticleLengthLabel = (wordCount: TargetWordCount): string => {
  switch (wordCount) {
    case 200:
      return 'Short (~200 words)'
    case 400:
      return 'Medium (~400 words)'
    case 800:
      return 'Long (~800 words)'
    case 1200:
      return 'Super Long (~1200 words)'
    default:
      return 'Medium (~400 words)'
  }
}

export const getArticleFormatLabel = (format: ArticleFormat): string => {
  switch (format) {
    case 'bullets':
      return 'Bullet points'
    case 'paragraphs':
    default:
      return 'Paragraphs'
  }
}
