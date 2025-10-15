import { fetchPersonImage } from '@/features/debates/services/wikipediaImageService'
import { searchTopicImage } from './unsplashService'

const topicImageCache = new Map<string, string | null>()

const PERSON_TOPIC_STOP_WORDS = new Set([
  'news',
  'latest',
  'today',
  'update',
  'updates',
  'breaking',
  'live',
  'analysis',
  'report',
  'reports',
  'stock',
  'stocks',
  'price',
  'prices',
  'market',
  'markets',
  'treatment',
  'treatments',
  'therapy',
  'for',
  'vs',
  'and',
  'or',
  'the',
  'a',
  'an',
  'in',
  'on',
  'of',
  'at',
  'with',
  'about',
  'trend',
  'trends',
  'tech',
  'technology',
  'policy',
  'policies',
  'summit',
  'conference',
  'results',
  'score',
  'scores',
])

const DEFAULT_CONCURRENCY = 3

const normalizeTopicKey = (topic: string) => topic.trim().toLowerCase()

const toTitleCase = (value: string) =>
  value
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(' ')

const isLikelyPersonTopic = (rawTopic: string) => {
  const sanitized = rawTopic
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!sanitized) return false

  const words = sanitized.split(' ')

  if (words.length < 2 || words.length > 4) {
    return false
  }

  if (words.some((word) => PERSON_TOPIC_STOP_WORDS.has(word))) {
    return false
  }

  // Require each word to be at least two characters long to avoid noise like "ai"
  if (words.some((word) => word.length < 2)) {
    return false
  }

  return true
}

export async function resolveTopicImage(topic: string): Promise<string | null> {
  const cacheKey = normalizeTopicKey(topic)

  if (!cacheKey) {
    return null
  }

  if (topicImageCache.has(cacheKey)) {
    return topicImageCache.get(cacheKey) ?? null
  }

  let imageUrl: string | null = null

  // Try fetching a portrait if the topic looks like a person
  if (isLikelyPersonTopic(topic)) {
    try {
      imageUrl = await fetchPersonImage(toTitleCase(topic))
    } catch (error) {
      console.error(`Failed to fetch Wikipedia image for "${topic}":`, error)
    }
  }

  // Fall back to Unsplash topic imagery
  if (!imageUrl) {
    try {
      imageUrl = await searchTopicImage(topic, 'landscape')
    } catch (error) {
      console.error(`Failed to fetch Unsplash image for "${topic}":`, error)
    }
  }

  topicImageCache.set(cacheKey, imageUrl)
  return imageUrl
}

export async function resolveTopicImages(
  topics: string[],
  concurrency: number = DEFAULT_CONCURRENCY
): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {}
  const pending = [...topics]

  const worker = async () => {
    while (pending.length > 0) {
      const topic = pending.shift()
      if (!topic) continue

      try {
        const imageUrl = await resolveTopicImage(topic)
        results[topic] = imageUrl
      } catch (error) {
        console.error(`Failed to resolve image for "${topic}":`, error)
        results[topic] = null
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker())
  await Promise.all(workers)

  return results
}
