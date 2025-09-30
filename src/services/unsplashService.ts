// Unsplash API service for fetching topic-relevant images
// Free tier: 50 requests/hour

const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
const UNSPLASH_API_URL = 'https://api.unsplash.com'

// Cache images to avoid redundant API calls
const imageCache = new Map<string, string>()

export interface UnsplashImage {
  url: string
  photographer: string
  photographerUrl: string
}

/**
 * Search Unsplash for an image matching the topic
 * @param query - The search query (e.g., "OpenAI news", "Climate summit")
 * @param orientation - Image orientation (landscape, portrait, squarish)
 * @returns Image URL or null if not found
 */
export async function searchTopicImage(
  query: string,
  orientation: 'landscape' | 'portrait' | 'squarish' = 'landscape'
): Promise<string | null> {
  // Check cache first
  const cacheKey = `${query}-${orientation}`
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!
  }

  try {
    // Extract main keywords from topic (remove common words)
    const cleanQuery = cleanTopicForSearch(query)

    const params = new URLSearchParams({
      query: cleanQuery,
      orientation,
      per_page: '1',
      content_filter: 'high', // Safe content only
    })

    const response = await fetch(
      `${UNSPLASH_API_URL}/search/photos?${params}`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    )

    if (!response.ok) {
      console.error('Unsplash API error:', response.status)
      return null
    }

    const data = await response.json()

    if (data.results && data.results.length > 0) {
      const image = data.results[0]
      const imageUrl = image.urls.regular // Good quality, optimized size

      // Cache the result
      imageCache.set(cacheKey, imageUrl)

      return imageUrl
    }

    return null
  } catch (error) {
    console.error('Failed to fetch image from Unsplash:', error)
    return null
  }
}

/**
 * Clean topic string to get better search results
 * Examples:
 *   "OpenAI GPT-5" -> "artificial intelligence technology"
 *   "Climate Summit 2025" -> "climate environment conference"
 *   "Tesla Stock News" -> "electric vehicle business"
 */
function cleanTopicForSearch(topic: string): string {
  // Remove year numbers, "news", "updates", etc.
  let cleaned = topic
    .toLowerCase()
    .replace(/\b(news|update|today|latest|20\d{2})\b/g, '')
    .trim()

  // Map common topics to better search terms
  const topicMappings: Record<string, string> = {
    'openai': 'artificial intelligence',
    'gpt': 'artificial intelligence',
    'ai': 'artificial intelligence technology',
    'climate': 'climate environment nature',
    'tesla': 'electric vehicle automotive',
    'stock': 'business finance',
    'crypto': 'cryptocurrency bitcoin',
    'bitcoin': 'cryptocurrency digital currency',
    'election': 'politics government voting',
    'summit': 'conference meeting international',
    'war': 'conflict military',
    'economy': 'business finance market',
  }

  // Replace mapped terms
  Object.entries(topicMappings).forEach(([key, value]) => {
    if (cleaned.includes(key)) {
      cleaned = cleaned.replace(key, value)
    }
  })

  return cleaned.trim() || topic // Fallback to original if empty
}

/**
 * Fetch images for multiple topics in batch
 */
export async function fetchTopicImages(
  topics: string[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>()

  // Fetch images with delays to respect rate limits
  for (const topic of topics) {
    const imageUrl = await searchTopicImage(topic)
    if (imageUrl) {
      results.set(topic, imageUrl)
    }

    // Small delay between requests (rate limit: 50/hour)
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return results
}
