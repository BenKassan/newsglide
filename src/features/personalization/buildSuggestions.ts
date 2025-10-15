type SuggestionSource = 'search' | 'explore' | 'trending' | 'fallback'

interface Suggestion {
  query: string
  reason: string
  source: SuggestionSource
}

const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

const GENERIC_WORDS = [
  'latest',
  'breaking',
  'news',
  'today',
  'tonight',
  'update',
  'updates',
  'developments',
  'story',
  'stories',
  'headline',
  'headlines',
  'coverage',
  'report',
  'reports',
  'analysis',
  'briefing',
  'insights',
  'fresh',
  'take',
  'new',
  'recent',
  'watch',
]

const STOP_WORDS = new Set<string>([...MONTH_NAMES, ...GENERIC_WORDS])

const buildOrderedUniqueTokens = (tokens: string[]): string[] => {
  const seen = new Set<string>()
  const deduped: string[] = []

  for (const token of tokens) {
    if (!seen.has(token)) {
      seen.add(token)
      deduped.push(token)
    }
  }

  return deduped
}

const tokenizeForInterest = (value: string): string[] => {
  if (!value) return []

  const baseTokens = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  const filtered = baseTokens.filter((token) => {
    if (!token) return false
    if (STOP_WORDS.has(token)) return false
    if (/^\d+$/.test(token)) return false
    if (token.length === 1) return false
    return true
  })

  return buildOrderedUniqueTokens(filtered)
}

const formatTokenForDisplay = (token: string) => {
  if (!token) return ''
  if (token.length <= 3) {
    return token.toUpperCase()
  }
  return token.charAt(0).toUpperCase() + token.slice(1)
}

const canonicalizeInterest = (value: string) => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const tokens = tokenizeForInterest(trimmed)
  if (tokens.length === 0) return null

  const displayLabel = tokens.map(formatTokenForDisplay).join(' ')
  const normalized = tokens.join(' ')

  return {
    key: normalized,
    label: displayLabel,
    normalized,
    tokens,
  }
}

const normalizeForComparison = (value: string) => {
  if (!value) return ''
  const canonical = canonicalizeInterest(value)
  if (canonical) return canonical.normalized
  return value.trim().toLowerCase()
}

const formatPossessive = (subject: string) => {
  const trimmed = subject.trim()
  if (!trimmed) return subject
  return trimmed.endsWith('s') ? `${trimmed}'` : `${trimmed}'s`
}

const angleTemplates: Array<
  (subject: string, context: { month: string; year: number }) => string
> = [
  (subject, { month, year }) =>
    `Inside ${formatPossessive(subject)} ${month} ${year} strategy reset`,
  (subject, { month }) => `${subject} deal tracker for ${month} opportunities`,
  (subject, { month, year }) =>
    `${subject} policy showdown shaping ${month} ${year}`,
  (subject, { month }) =>
    `How ${formatPossessive(subject)} innovation bets are evolving this ${month}`,
  (subject, { month }) =>
    `${subject} leadership reshuffles driving ${month} decisions`,
  (subject, { month, year }) =>
    `${subject} milestones due before ${month} ${year}`,
]

interface CanonicalInterest {
  label: string
  normalized: string
  tokens: string[]
  weight: number
  source: SuggestionSource
  example: string
}

interface TrendingEntry {
  index: number
  topic: string
  normalized: string
  tokens: Set<string>
}

export const buildSuggestions = (
  searchTerms: string[],
  exploreTopics: string[],
  trendingTopics: string[],
  limit = 3
): Suggestion[] => {
  const interestMap = new Map<string, CanonicalInterest>()

  const addInterest = (value: string, weight: number, source: SuggestionSource) => {
    const canonical = canonicalizeInterest(value)
    if (!canonical) return

    const existing = interestMap.get(canonical.key)
    if (existing) {
      existing.weight += weight
      if (source === 'search' && existing.source !== 'search') {
        existing.source = 'search'
      }
      return
    }

    interestMap.set(canonical.key, {
      label: canonical.label,
      normalized: canonical.normalized,
      tokens: canonical.tokens,
      weight,
      source,
      example: value,
    })
  }

  searchTerms.forEach((term) => addInterest(term, 3, 'search'))
  exploreTopics.forEach((topic) => addInterest(topic, 2, 'explore'))

  const interests = Array.from(interestMap.values()).sort((a, b) => b.weight - a.weight)
  const month = new Date().toLocaleString('en-US', { month: 'long' })
  const year = new Date().getFullYear()

  const suggestions: Suggestion[] = []
  const usedQueries = new Set<string>()
  const usedTopicSets: Array<Set<string>> = []

  const historyNormalized = new Set<string>()
  ;[...searchTerms, ...exploreTopics].forEach((term) => {
    const normalized = normalizeForComparison(term)
    if (normalized) {
      historyNormalized.add(normalized)
    }
  })

  const hasSignificantTokenOverlap = (tokens: string[]) => {
    if (tokens.length === 0) return false

    return usedTopicSets.some((existing) => {
      // Treat strong token overlap as the same topic so we surface distinct themes.
      const overlap = tokens.filter((token) => existing.has(token)).length
      const maxSize = Math.max(existing.size, tokens.length)
      if (maxSize === 0) return false
      return overlap / maxSize >= 0.5 || overlap >= 2
    })
  }

  const registerTopicTokens = (tokens: string[]) => {
    if (tokens.length === 0) return
    usedTopicSets.push(new Set(tokens))
  }

  const tryAddSuggestion = (suggestion: Suggestion, topicTokens?: string[]) => {
    const normalized = normalizeForComparison(suggestion.query)
    if (!normalized) return false
    if (usedQueries.has(normalized)) return false
    if (historyNormalized.has(normalized)) return false

    const activeTokens =
      topicTokens && topicTokens.length > 0
        ? topicTokens
        : tokenizeForInterest(suggestion.query)

    if (activeTokens.length > 0 && hasSignificantTokenOverlap(activeTokens)) {
      return false
    }

    usedQueries.add(normalized)
    suggestions.push(suggestion)
    registerTopicTokens(activeTokens)
    return true
  }

  const trendingEntries: TrendingEntry[] = trendingTopics
    .map((topic, index) => {
      const trimmed = topic?.trim()
      if (!trimmed) return null
      const normalized = normalizeForComparison(trimmed)
      if (!normalized) return null
      const tokens = new Set(tokenizeForInterest(trimmed))
      if (tokens.size === 0) return null
      return {
        index,
        topic: trimmed,
        normalized,
        tokens,
      }
    })
    .filter((entry): entry is TrendingEntry => entry !== null)

  const usedTrending = new Set<number>()

  const findBestTrendingMatch = (interest: CanonicalInterest) => {
    let best: { entry: TrendingEntry; score: number } | null = null
    const interestTokens = new Set(interest.tokens)
    const interestLabelLower = interest.label.toLowerCase()

    for (const entry of trendingEntries) {
      if (usedTrending.has(entry.index)) continue
      if (historyNormalized.has(entry.normalized)) continue

      let score = 0

      if (entry.normalized.includes(interest.normalized)) {
        score += 6
      }

      if (entry.topic.toLowerCase().includes(interestLabelLower)) {
        score += 5
      }

      let overlapCount = 0
      for (const token of interestTokens) {
        if (entry.tokens.has(token)) {
          overlapCount++
        }
      }

      if (overlapCount > 0) {
        score += overlapCount * 3
      } else if (
        interest.tokens.some((token) => entry.topic.toLowerCase().includes(token))
      ) {
        score += 1
      }

      if (score > 0 && (!best || score > best.score)) {
        best = { entry, score }
      }
    }

    return best?.entry ?? null
  }

  const pickTemplateForInterest = (interest: CanonicalInterest, offset: number) => {
    const seed = interest.tokens.reduce(
      (acc, token) => acc + token.charCodeAt(0),
      0
    )
    const index =
      angleTemplates.length === 0
        ? 0
        : Math.abs(seed + offset) % angleTemplates.length
    return angleTemplates[index]
  }

  for (let interestIndex = 0; interestIndex < interests.length; interestIndex++) {
    const interest = interests[interestIndex]
    if (suggestions.length >= limit) break

    const match = findBestTrendingMatch(interest)
    if (match) {
      const added = tryAddSuggestion(
        {
          query: match.topic,
          reason:
            interest.source === 'search'
              ? `Linked to your “${interest.label}” searches`
              : `Because you explored “${interest.label}”`,
          source: interest.source,
        },
        interest.tokens
      )
      if (added) {
        usedTrending.add(match.index)
        continue
      }
    }

    if (angleTemplates.length === 0) break

    const template = pickTemplateForInterest(interest, suggestions.length + interestIndex)
    const headline = template(interest.label, { month, year })

    tryAddSuggestion(
      {
        query: headline,
        reason:
          interest.source === 'search'
            ? `Fresh angle pulled from your “${interest.label}” searches`
            : `Fresh angle based on “${interest.label}”`,
        source: interest.source,
      },
      interest.tokens
    )
  }

  for (const entry of trendingEntries) {
    if (suggestions.length >= limit) break
    if (usedTrending.has(entry.index)) continue
    tryAddSuggestion(
      {
        query: entry.topic,
        reason: 'What people are following right now',
        source: 'trending',
      },
      [...entry.tokens]
    )
  }

  const fallbackAngles = [
    `${month} ${year} global developments worth tracking`,
    `Markets and policy shifts shaping ${month} ${year}`,
    `Science and innovation highlights for ${month}`,
    `${month} ${year} geopolitical briefings to know`,
  ]

  for (const fallback of fallbackAngles) {
    if (suggestions.length >= limit) break
    tryAddSuggestion(
      {
        query: fallback,
        reason: 'Curated briefing picked for you',
        source: 'fallback',
      },
      tokenizeForInterest(fallback)
    )
  }

  return suggestions.slice(0, limit)
}

export type { Suggestion, SuggestionSource }
