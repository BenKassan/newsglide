interface InterestEntry {
  label: string
  count: number
  lastUsed: string
}

type InterestStore = Record<string, InterestEntry>

const SEARCH_KEY = 'newsglide_interest_search_terms'
const EXPLORE_KEY = 'newsglide_interest_explore_topics'

const isBrowser = typeof window !== 'undefined'

const readStore = (key: string): InterestStore => {
  if (!isBrowser) return {}

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return {}

    const parsed = JSON.parse(raw) as InterestStore
    if (parsed && typeof parsed === 'object') {
      return parsed
    }
  } catch (error) {
    console.warn(`[InterestTracker] Failed to parse local storage for ${key}`, error)
  }

  return {}
}

const writeStore = (key: string, store: InterestStore) => {
  if (!isBrowser) return

  try {
    window.localStorage.setItem(key, JSON.stringify(store))
  } catch (error) {
    console.warn(`[InterestTracker] Failed to persist local storage for ${key}`, error)
  }
}

const recordInterest = (key: string, rawTerm: string) => {
  if (!rawTerm) return

  const normalized = rawTerm.trim()
  if (!normalized) return

  const mapKey = normalized.toLowerCase()
  const store = readStore(key)
  const previous = store[mapKey]
  const timestamp = new Date().toISOString()

  store[mapKey] = {
    label: previous?.label || normalized,
    count: (previous?.count || 0) + 1,
    lastUsed: timestamp,
  }

  writeStore(key, store)
}

const getTopInterests = (key: string, limit: number): string[] => {
  const store = readStore(key)
  const entries = Object.values(store)

  return entries
    .sort((a, b) => {
      if (b.count === a.count) {
        return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
      }
      return b.count - a.count
    })
    .slice(0, limit)
    .map((entry) => entry.label)
}

export const userInterestTracker = {
  recordSearchTerm(term: string) {
    recordInterest(SEARCH_KEY, term)
  },

  recordExploreTopic(topicLabel: string) {
    recordInterest(EXPLORE_KEY, topicLabel)
  },

  getTopSearchTerms(limit = 10): string[] {
    return getTopInterests(SEARCH_KEY, limit)
  },

  getTopExploreTopics(limit = 10): string[] {
    return getTopInterests(EXPLORE_KEY, limit)
  },
}
