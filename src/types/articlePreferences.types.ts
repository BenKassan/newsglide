export type ReadingLevelPreference = 'eli5' | 'high_school' | 'college' | 'phd'
export type ArticleLengthPreference = 'short' | 'medium' | 'long' | 'super_long'
export type ArticleStylePreference = 'paragraphs' | 'bullets'

export const DEFAULT_READING_LEVEL: ReadingLevelPreference = 'college'
export const DEFAULT_ARTICLE_LENGTH: ArticleLengthPreference = 'medium'
export const DEFAULT_ARTICLE_STYLE: ArticleStylePreference = 'paragraphs'

export const normalizeReadingLevel = (value?: string | null): ReadingLevelPreference => {
  switch (value) {
    case 'eli5':
    case 'high_school':
    case 'college':
    case 'phd':
      return value
    case 'base': // Legacy support
      return 'college'
    default:
      return DEFAULT_READING_LEVEL
  }
}

export const normalizeArticleLength = (value?: string | null): ArticleLengthPreference => {
  switch (value) {
    case 'short':
    case 'medium':
    case 'long':
    case 'super_long':
      return value
    default:
      return DEFAULT_ARTICLE_LENGTH
  }
}

export const normalizeArticleStyle = (value?: string | null): ArticleStylePreference => {
  switch (value) {
    case 'paragraphs':
    case 'bullets':
      return value
    default:
      return DEFAULT_ARTICLE_STYLE
  }
}

export const READING_LEVEL_OPTIONS: Array<{
  value: ReadingLevelPreference
  label: string
  description: string
}> = [
  {
    value: 'eli5',
    label: "Explain Like I'm Five",
    description: 'Friendly explanations with simple language and vivid examples.',
  },
  {
    value: 'high_school',
    label: 'High School',
    description: 'Clear explanations with key context and approachable vocabulary.',
  },
  {
    value: 'college',
    label: 'College',
    description: 'Well-rounded analysis with nuance and professional tone.',
  },
  {
    value: 'phd',
    label: 'PhD',
    description: 'Scholarly depth with rigorous sourcing and technical insight.',
  },
]

export const ARTICLE_LENGTH_OPTIONS: Array<{
  value: ArticleLengthPreference
  label: string
  description: string
  targetWordCount: number
}> = [
  {
    value: 'short',
    label: 'Short (~200 words)',
    description: 'Quick snapshot that hits the essentials.',
    targetWordCount: 200,
  },
  {
    value: 'medium',
    label: 'Medium (~400 words)',
    description: 'Balanced depth with multiple angles.',
    targetWordCount: 400,
  },
  {
    value: 'long',
    label: 'Long (~800 words)',
    description: 'Comprehensive breakdown with rich detail.',
    targetWordCount: 800,
  },
  {
    value: 'super_long',
    label: 'Super Long (~1200 words)',
    description: 'Extended briefing with historical context and nuance.',
    targetWordCount: 1200,
  },
]

export const ARTICLE_STYLE_OPTIONS: Array<{
  value: ArticleStylePreference
  label: string
  description: string
}> = [
  {
    value: 'paragraphs',
    label: 'Paragraphs',
    description: 'Traditional narrative flow with polished prose.',
  },
  {
    value: 'bullets',
    label: 'Bullet Points',
    description: 'Concise bullet summaries for skimmable reading.',
  },
]

export const getWordCountForPreference = (length: ArticleLengthPreference): number => {
  const option = ARTICLE_LENGTH_OPTIONS.find((opt) => opt.value === length)
  return option?.targetWordCount ?? 400
}

export const readingLevelToLabel = (level: ReadingLevelPreference): string => {
  const option = READING_LEVEL_OPTIONS.find((opt) => opt.value === level)
  return option?.label ?? 'College'
}
