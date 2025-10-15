import { describe, expect, it } from 'vitest'

import { buildSuggestions } from '../../features/personalization/buildSuggestions'

const extractLower = (value: string) => value.toLowerCase()

describe('buildSuggestions', () => {
  it('prioritizes diverse topics when history repeats a subject', () => {
    const searchTerms = [
      'Jeff Bezos innovations',
      'Jeff Bezos leadership',
      'Physics Nobel candidates',
      'Harry Potter lore deep dive',
      'Antarctica climate missions',
    ]

    const trendingTopics = [
      'Bezos funds ocean cleanup 2025',
      'Physics Nobel prospects 2025',
      'Antarctica ice shelf mission update',
    ]

    const suggestions = buildSuggestions(searchTerms, [], trendingTopics, 3)

    expect(suggestions).toHaveLength(3)

    const bezosMentions = suggestions.filter((item) =>
      extractLower(item.query).includes('bezos')
    )
    expect(bezosMentions.length).toBeLessThanOrEqual(1)

    expect(
      suggestions.some((item) => extractLower(item.query).includes('physics'))
    ).toBe(true)
    expect(
      suggestions.some((item) => extractLower(item.query).includes('harry')) ||
        suggestions.some((item) =>
          extractLower(item.query).includes('antarctica')
        )
    ).toBe(true)
  })

  it('avoids vague headline language in generated templates', () => {
    const searchTerms = [
      'Jeff Bezos',
      'Quantum physics breakthroughs',
      'Antarctica research stations',
    ]

    const suggestions = buildSuggestions(searchTerms, [], [], 3)

    expect(suggestions).toHaveLength(3)

    for (const suggestion of suggestions) {
      const lower = extractLower(suggestion.query)
      expect(lower.includes('latest')).toBe(false)
      expect(lower.includes('headline')).toBe(false)
    }
  })
})
