import { supabase } from '@/integrations/supabase/client'
import {
  ArticleLengthPreference,
  ArticleStylePreference,
  DEFAULT_ARTICLE_LENGTH,
  DEFAULT_ARTICLE_STYLE,
  DEFAULT_READING_LEVEL,
  normalizeArticleLength,
  normalizeArticleStyle,
  normalizeReadingLevel,
  ReadingLevelPreference,
} from '@/types/articlePreferences.types'
import { TargetWordCount } from '@/types/searchFilters.types'

export interface ArticlePreferences {
  readingLevel: ReadingLevelPreference
  articleLength: ArticleLengthPreference
  articleStyle: ArticleStylePreference
}

const WORD_COUNT_BY_LENGTH: Record<ArticleLengthPreference, TargetWordCount> = {
  short: 200,
  medium: 400,
  long: 800,
  super_long: 1200,
}

const LENGTH_BY_WORD_COUNT: Record<TargetWordCount, ArticleLengthPreference> = {
  200: 'short',
  400: 'medium',
  800: 'long',
  1200: 'super_long',
}

export const mapLengthToWordCount = (
  length: ArticleLengthPreference
): TargetWordCount => WORD_COUNT_BY_LENGTH[length] ?? 400

export const mapWordCountToLength = (
  wordCount: TargetWordCount
): ArticleLengthPreference => LENGTH_BY_WORD_COUNT[wordCount] ?? DEFAULT_ARTICLE_LENGTH

export async function getUserArticlePreferences(userId?: string): Promise<ArticlePreferences> {
  if (!userId) {
    return {
      readingLevel: DEFAULT_READING_LEVEL,
      articleLength: DEFAULT_ARTICLE_LENGTH,
      articleStyle: DEFAULT_ARTICLE_STYLE,
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('default_reading_level, default_article_length, default_article_style')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Failed to load user article preferences:', error)
      return {
        readingLevel: DEFAULT_READING_LEVEL,
        articleLength: DEFAULT_ARTICLE_LENGTH,
        articleStyle: DEFAULT_ARTICLE_STYLE,
      }
    }

    return {
      readingLevel: normalizeReadingLevel(data?.default_reading_level),
      articleLength: normalizeArticleLength(data?.default_article_length),
      articleStyle: normalizeArticleStyle(data?.default_article_style),
    }
  } catch (error) {
    console.error('Unexpected error loading article preferences:', error)
    return {
      readingLevel: DEFAULT_READING_LEVEL,
      articleLength: DEFAULT_ARTICLE_LENGTH,
      articleStyle: DEFAULT_ARTICLE_STYLE,
    }
  }
}
