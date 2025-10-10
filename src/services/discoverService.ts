import { supabase } from '@/integrations/supabase/client'
import { fetchTopicImages } from './unsplashService'

export type CategoryName =
  // News & Current Events
  | 'Breaking News' | 'Politics & Government' | 'World Affairs' | 'Business & Finance' | 'Technology News'
  // Science & Learning
  | 'Physics & Astronomy' | 'Biology & Life Sciences' | 'Chemistry' | 'Environmental Science'
  | 'Mathematics' | 'Psychology & Neuroscience'
  // Technology & Innovation
  | 'Artificial Intelligence' | 'Software Development' | 'Cybersecurity' | 'Blockchain & Crypto'
  | 'Space Technology' | 'Robotics & Automation'
  // Health & Wellness
  | 'Mental Health' | 'Nutrition & Diet' | 'Fitness & Exercise' | 'Medical Research' | 'Public Health'
  // Arts & Culture
  | 'Visual Arts' | 'Music & Audio' | 'Film & Television' | 'Literature & Writing'
  | 'Theater & Performance' | 'Architecture & Design'
  // History & Society
  | 'Ancient History' | 'Modern History' | 'Archaeology' | 'Anthropology' | 'Philosophy' | 'Sociology'
  // Business & Economics
  | 'Entrepreneurship' | 'Marketing & Branding' | 'Economics & Markets' | 'Personal Finance'
  | 'Real Estate' | 'E-commerce'
  // Sports & Recreation
  | 'Team Sports' | 'Individual Sports' | 'Extreme Sports' | 'Esports & Gaming' | 'Outdoor Activities'
  // Lifestyle & Hobbies
  | 'Cooking & Culinary' | 'Travel & Tourism' | 'Photography' | 'Gardening'
  | 'DIY & Crafts' | 'Fashion & Style'
  // Education & Career
  | 'Study Skills' | 'Career Development' | 'Professional Skills' | 'Languages' | 'Educational Tech'

export interface DiscoverTopic {
  id: string
  title: string
  category: CategoryName
  subcategory?: string
  sourceCount?: number
  freshness: 'breaking' | 'today' | 'recent'
  timestamp: string
  image?: string
}

export interface DiscoverCategory {
  name: string
  topics: DiscoverTopic[]
}

// Cache storage
let cachedTopics: DiscoverCategory[] | null = null
let cacheTimestamp: number | null = null
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

// Track shown topics to avoid repetition
const shownTopicsByCategory = new Map<string, Set<string>>()

// Shuffle array utility
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Enhanced trending topics - now returns shuffled topics with no repeats
export async function fetchDiscoverTopics(userId?: string, invalidateCache: boolean = false): Promise<DiscoverCategory[]> {
  const allTopics = getFallbackTopics()

  // Shuffle and filter topics for each category
  const filteredTopics = allTopics.map(category => {
    if (!shownTopicsByCategory.has(category.name)) {
      shownTopicsByCategory.set(category.name, new Set())
    }

    const shownSet = shownTopicsByCategory.get(category.name)!
    const availableTopics = category.topics.filter(topic => !shownSet.has(topic.title))

    // Shuffle available topics and mark them as shown
    const shuffled = shuffleArray(availableTopics)
    const selected = shuffled.slice(0, 12)
    selected.forEach(t => shownSet.add(t.title))

    return { ...category, topics: selected }
  })

  return filteredTopics
}

// ============================================================================
// NEW: AI-Generated Topics with Instant Cache-First Serving
// ============================================================================

interface CachedTopicSet {
  id: string
  category_name: string
  generation_number: number
  topics: DiscoverTopic[]
  creativity_level: number
  created_at: string
}

interface GenerateTopicsResponse {
  topics: DiscoverTopic[]
  generation_number: number
  creativity_level: number
  model_used: string
  cache_id?: string
  error?: string
}

// In-memory prefetch cache for hover optimization
const prefetchCache = new Map<string, Promise<DiscoverCategory>>()

/**
 * Get next topics for a category - INSTANT from cache or fast generation
 * This is the main function for "Generate New Topics" button
 */
export async function getNextCategoryTopics(categoryName: string): Promise<DiscoverCategory | null> {
  try {
    // Step 1: Try to get from cache (INSTANT - <50ms)
    const cached = await getNextCachedTopics(categoryName)

    if (cached) {
      // Mark as consumed
      await markCacheConsumed(cached.id)

      // Trigger background refill (non-blocking)
      triggerBackgroundRefill(categoryName).catch(err =>
        console.error('Background refill failed:', err)
      )

      return {
        name: categoryName,
        topics: cached.topics
      }
    }

    // Step 2: Cache miss - generate in real-time (1-2 seconds)
    console.log(`Cache miss for ${categoryName}, generating real-time`)
    return await generateCategoryTopicsRealtime(categoryName)

  } catch (error) {
    console.error('Error getting next category topics:', error)

    // Fallback to old shuffle method
    return await refreshCategoryTopics(categoryName)
  }
}

/**
 * Get next unconsumed cached topics for a category
 * Returns instantly from database cache
 */
async function getNextCachedTopics(categoryName: string): Promise<CachedTopicSet | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_next_cached_topics', {
        p_category_name: categoryName
      })

    if (error) {
      console.error('Error getting cached topics:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    return data[0] as CachedTopicSet
  } catch (err) {
    console.error('Exception in getNextCachedTopics:', err)
    return null
  }
}

/**
 * Mark a cache entry as consumed
 */
async function markCacheConsumed(cacheId: string): Promise<void> {
  try {
    await supabase.rpc('mark_cache_consumed', { p_cache_id: cacheId })
  } catch (err) {
    console.error('Error marking cache consumed:', err)
  }
}

/**
 * Trigger background refill of cache (non-blocking)
 */
async function triggerBackgroundRefill(categoryName: string): Promise<void> {
  try {
    // Call generate function to create next cache entry
    const { error } = await supabase.functions.invoke('generate-discover-topics', {
      body: { category_name: categoryName }
    })

    if (error) {
      console.error('Background refill error:', error)
    }
  } catch (err) {
    console.error('Exception in background refill:', err)
  }
}

/**
 * Generate topics in real-time (for cache misses)
 * Exported for explicit user-initiated fresh generation
 */
export async function generateCategoryTopicsRealtime(categoryName: string): Promise<DiscoverCategory | null> {
  try {
    const { data, error } = await supabase.functions.invoke<GenerateTopicsResponse>(
      'generate-discover-topics',
      {
        body: {
          category_name: categoryName,
          force: true // Don't cache, return immediately
        }
      }
    )

    if (error || !data || !data.topics) {
      console.error('Error generating topics:', error)
      return null
    }

    return {
      name: categoryName,
      topics: data.topics
    }
  } catch (err) {
    console.error('Exception in generateCategoryTopicsRealtime:', err)
    return null
  }
}

/**
 * Prefetch next topics on hover (optimization for cache misses)
 */
export function prefetchCategoryTopics(categoryName: string): void {
  // Only prefetch if not already in progress
  if (!prefetchCache.has(categoryName)) {
    const promise = getNextCategoryTopics(categoryName)
    prefetchCache.set(categoryName, promise)

    // Clean up after completion
    promise.finally(() => {
      setTimeout(() => prefetchCache.delete(categoryName), 5000)
    })
  }
}

/**
 * Get prefetched topics or generate if not available
 */
export async function getPrefetchedOrGenerate(categoryName: string): Promise<DiscoverCategory | null> {
  const prefetched = prefetchCache.get(categoryName)

  if (prefetched) {
    prefetchCache.delete(categoryName)
    return await prefetched
  }

  return await getNextCategoryTopics(categoryName)
}

// ============================================================================
// OLD: Fallback methods (kept for compatibility)
// ============================================================================

// Function to refresh a specific category with new topics (shuffle from predefined pool)
export async function refreshCategoryTopics(categoryName: string): Promise<DiscoverCategory | null> {
  const allTopics = getFallbackTopics()
  const category = allTopics.find(c => c.name === categoryName)

  if (!category) return null

  if (!shownTopicsByCategory.has(categoryName)) {
    shownTopicsByCategory.set(categoryName, new Set())
  }

  const shownSet = shownTopicsByCategory.get(categoryName)!
  const availableTopics = category.topics.filter(topic => !shownSet.has(topic.title))

  // Return whatever topics are available (0-12), never reset during session
  if (availableTopics.length === 0) {
    // All topics exhausted - return empty array
    return { ...category, topics: [] }
  }

  // Shuffle and take up to 12 available topics
  const shuffled = shuffleArray(availableTopics)
  const selected = shuffled.slice(0, 12)
  selected.forEach(t => shownSet.add(t.title))

  return { ...category, topics: selected }
}

// Determine category based on keywords in the topic
function determineCategoryFromTopic(topic: string): CategoryName {
  const lower = topic.toLowerCase()

  // Breaking news indicators
  if (lower.includes('breaking') || lower.includes('urgent') || lower.includes('just in')) {
    return 'Breaking News'
  }

  // Science & Learning
  if (lower.match(/\b(quantum|physics|astronomy|black hole|particle|gravity|relativity|universe|cosmos)\b/)) return 'Physics & Astronomy'
  if (lower.match(/\b(gene|dna|crispr|biology|cell|evolution|organism|species|ecosystem)\b/)) return 'Biology & Life Sciences'
  if (lower.match(/\b(climate|environment|renewable|carbon|pollution|conservation|sustainability|ecology)\b/)) return 'Environmental Science'
  if (lower.match(/\b(brain|neuroscience|psychology|cognitive|mental|therapy|consciousness|behavior)\b/)) return 'Psychology & Neuroscience'

  // Technology & Innovation
  if (lower.match(/\b(ai|artificial intelligence|machine learning|neural network|deep learning|llm|gpt)\b/)) return 'Artificial Intelligence'
  if (lower.match(/\b(programming|software|code|developer|api|cloud|devops|microservice)\b/)) return 'Software Development'
  if (lower.match(/\b(security|cybersecurity|hacking|encryption|ransomware|breach|vulnerability)\b/)) return 'Cybersecurity'
  if (lower.match(/\b(blockchain|crypto|bitcoin|ethereum|nft|web3|defi)\b/)) return 'Blockchain & Crypto'
  if (lower.match(/\b(space|rocket|satellite|mars|moon|spacex|nasa|orbital|astronaut)\b/)) return 'Space Technology'
  if (lower.match(/\b(robot|automation|drone|autonomous|manufacturing)\b/)) return 'Robotics & Automation'
  if (lower.match(/\b(tech|silicon|startup|app|iphone|tesla|google|apple|microsoft)\b/)) return 'Technology News'

  // Health & Wellness
  if (lower.match(/\b(anxiety|depression|stress|mindfulness|meditation|sleep|wellbeing)\b/)) return 'Mental Health'
  if (lower.match(/\b(nutrition|diet|food|eating|vitamin|supplement|meal)\b/)) return 'Nutrition & Diet'
  if (lower.match(/\b(fitness|exercise|workout|training|gym|strength|cardio)\b/)) return 'Fitness & Exercise'
  if (lower.match(/\b(medical|research|study|trial|treatment|drug|vaccine|cure|disease)\b/)) return 'Medical Research'
  if (lower.match(/\b(health|pandemic|epidemic|covid|hospital|doctor|fda)\b/)) return 'Public Health'

  // Arts & Culture
  if (lower.match(/\b(art|painting|sculpture|museum|gallery|artist|contemporary|exhibition)\b/)) return 'Visual Arts'
  if (lower.match(/\b(music|song|album|concert|band|musician|audio|sound)\b/)) return 'Music & Audio'
  if (lower.match(/\b(film|movie|cinema|netflix|streaming|director|actor|oscar)\b/)) return 'Film & Television'
  if (lower.match(/\b(book|novel|author|writing|literature|poetry|reading)\b/)) return 'Literature & Writing'
  if (lower.match(/\b(architecture|building|design|urban|construction)\b/)) return 'Architecture & Design'

  // History & Society
  if (lower.match(/\b(ancient|rome|greece|egypt|civilization|archaeological)\b/)) return 'Ancient History'
  if (lower.match(/\b(history|historical|war|revolution|century)\b/)) return 'Modern History'
  if (lower.match(/\b(philosophy|philosopher|ethics|logic|existential|metaphysics)\b/)) return 'Philosophy'

  // Business & Economics
  if (lower.match(/\b(startup|entrepreneur|founder|venture|funding|pitch|scale)\b/)) return 'Entrepreneurship'
  if (lower.match(/\b(marketing|brand|advertising|campaign|social media|seo)\b/)) return 'Marketing & Branding'
  if (lower.match(/\b(economy|economics|gdp|inflation|recession|market|trade)\b/)) return 'Economics & Markets'
  if (lower.match(/\b(invest|retirement|savings|tax|mortgage|budget|wealth)\b/)) return 'Personal Finance'
  if (lower.match(/\b(real estate|property|housing|rent|mortgage|land)\b/)) return 'Real Estate'
  if (lower.match(/\b(ecommerce|online shopping|retail|amazon|shopify)\b/)) return 'E-commerce'
  if (lower.match(/\b(stock|earnings|ceo|ipo|merger|acquisition|wall street|shares|profit|revenue)\b/)) return 'Business & Finance'

  // Sports & Recreation
  if (lower.match(/\b(nfl|nba|mlb|nhl|soccer|football|basketball|baseball|hockey)\b/)) return 'Team Sports'
  if (lower.match(/\b(tennis|golf|swimming|athletics|marathon|cycling)\b/)) return 'Individual Sports'
  if (lower.match(/\b(gaming|esports|twitch|streamer|video game|xbox|playstation)\b/)) return 'Esports & Gaming'
  if (lower.match(/\b(hiking|camping|outdoor|adventure|climbing|kayaking)\b/)) return 'Outdoor Activities'

  // Lifestyle & Hobbies
  if (lower.match(/\b(cooking|recipe|chef|cuisine|culinary|restaurant|baking)\b/)) return 'Cooking & Culinary'
  if (lower.match(/\b(travel|tourism|vacation|destination|trip|hotel)\b/)) return 'Travel & Tourism'
  if (lower.match(/\b(photography|photo|camera|lens|portrait|landscape)\b/)) return 'Photography'
  if (lower.match(/\b(garden|plant|flower|landscape|horticulture)\b/)) return 'Gardening'
  if (lower.match(/\b(diy|craft|handmade|woodworking|maker)\b/)) return 'DIY & Crafts'
  if (lower.match(/\b(fashion|style|clothing|designer|trend|outfit)\b/)) return 'Fashion & Style'

  // Education & Career
  if (lower.match(/\b(career|job|employment|leadership|professional|workplace)\b/)) return 'Career Development'
  if (lower.match(/\b(language|translation|multilingual|linguistics)\b/)) return 'Languages'

  // Politics & Government (more specific)
  if (lower.match(/\b(election|vote|congress|senate|president|minister|parliament|legislation|bill)\b/)) return 'Politics & Government'

  // World Affairs
  if (lower.match(/\b(ukraine|russia|china|israel|gaza|war|peace|summit|nato|un|international|diplomatic)\b/)) return 'World Affairs'

  // Default fallback to Technology News
  return 'Technology News'
}

// Remove duplicate or very similar topics
function deduplicateTopics(topics: DiscoverTopic[]): DiscoverTopic[] {
  const seen = new Map<string, DiscoverTopic>()
  const uniqueTopics: DiscoverTopic[] = []

  for (const topic of topics) {
    const normalized = topic.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
    const key = normalized.split(' ').slice(0, 4).join(' ') // First 4 words as key

    if (!seen.has(key)) {
      seen.set(key, topic)
      uniqueTopics.push(topic)
    }
  }

  return uniqueTopics
}

// Group topics by category
function groupByCategory(topics: DiscoverTopic[]): DiscoverCategory[] {
  const categories: Map<string, DiscoverTopic[]> = new Map()

  topics.forEach(topic => {
    const categoryName = topic.category
    if (!categories.has(categoryName)) {
      categories.set(categoryName, [])
    }
    categories.get(categoryName)!.push(topic)
  })

  // Convert to array and sort by priority - organized by major sections
  const categoryOrder: CategoryName[] = [
    // News & Current Events (highest priority)
    'Breaking News',
    'Politics & Government',
    'World Affairs',
    'Business & Finance',
    'Technology News',

    // Science & Learning
    'Physics & Astronomy',
    'Biology & Life Sciences',
    'Chemistry',
    'Environmental Science',
    'Mathematics',
    'Psychology & Neuroscience',

    // Technology & Innovation
    'Artificial Intelligence',
    'Software Development',
    'Cybersecurity',
    'Blockchain & Crypto',
    'Space Technology',
    'Robotics & Automation',

    // Health & Wellness
    'Mental Health',
    'Nutrition & Diet',
    'Fitness & Exercise',
    'Medical Research',
    'Public Health',

    // Arts & Culture
    'Visual Arts',
    'Music & Audio',
    'Film & Television',
    'Literature & Writing',
    'Theater & Performance',
    'Architecture & Design',

    // History & Society
    'Ancient History',
    'Modern History',
    'Archaeology',
    'Anthropology',
    'Philosophy',
    'Sociology',

    // Business & Economics
    'Entrepreneurship',
    'Marketing & Branding',
    'Economics & Markets',
    'Personal Finance',
    'Real Estate',
    'E-commerce',

    // Sports & Recreation
    'Team Sports',
    'Individual Sports',
    'Extreme Sports',
    'Esports & Gaming',
    'Outdoor Activities',

    // Lifestyle & Hobbies
    'Cooking & Culinary',
    'Travel & Tourism',
    'Photography',
    'Gardening',
    'DIY & Crafts',
    'Fashion & Style',

    // Education & Career
    'Study Skills',
    'Career Development',
    'Professional Skills',
    'Languages',
    'Educational Tech'
  ]

  const result: DiscoverCategory[] = []

  categoryOrder.forEach(cat => {
    const topicsInCategory = categories.get(cat)
    if (topicsInCategory && topicsInCategory.length > 0) {
      result.push({
        name: cat,
        topics: topicsInCategory
      })
    }
  })

  return result
}

// Comprehensive topic database for learning and discovery
function getFallbackTopics(): DiscoverCategory[] {
  let id = 0
  const generateId = () => String(++id)
  const now = new Date().toISOString()

  return [
    // Sports
    {
      name: 'Team Sports',
      topics: [
        { id: generateId(), title: 'NFL', category: 'Team Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'NBA', category: 'Team Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'MLB', category: 'Team Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'NHL', category: 'Team Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Soccer', category: 'Team Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Premier League', category: 'Team Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Champions League', category: 'Team Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'World Cup', category: 'Team Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'College Football', category: 'Team Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'College Basketball', category: 'Team Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Cricket', category: 'Team Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Rugby', category: 'Team Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Volleyball', category: 'Team Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Basketball Strategy', category: 'Team Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Football Analytics', category: 'Team Sports', freshness: 'recent', timestamp: now }
      ]
    },
    {
      name: 'Individual Sports',
      topics: [
        { id: generateId(), title: 'Tennis', category: 'Individual Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Golf', category: 'Individual Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'UFC', category: 'Individual Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Boxing', category: 'Individual Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Formula 1', category: 'Individual Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'NASCAR', category: 'Individual Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Olympics', category: 'Individual Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Track and Field', category: 'Individual Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Swimming', category: 'Individual Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Gymnastics', category: 'Individual Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Cycling', category: 'Individual Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Marathon Running', category: 'Individual Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Skiing', category: 'Individual Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Snowboarding', category: 'Individual Sports', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Surfing', category: 'Individual Sports', freshness: 'recent', timestamp: now }
      ]
    },
    // Finance & Economics
    {
      name: 'Business & Finance',
      topics: [
        { id: generateId(), title: 'Stock Market', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Cryptocurrency', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Bitcoin', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Ethereum', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Housing Market', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Real Estate', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Interest Rates', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Federal Reserve', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Jerome Powell', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Inflation', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'GDP', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Recession', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Economic Policy', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Banking', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Investment Strategies', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Wall Street', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'IPOs', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Mergers and Acquisitions', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Corporate Earnings', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Treasury Bonds', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Commodities', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Forex Trading', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Venture Capital', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Private Equity', category: 'Business & Finance', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Hedge Funds', category: 'Business & Finance', freshness: 'recent', timestamp: now }
      ]
    },
    // Technology
    {
      name: 'Technology News',
      topics: [
        { id: generateId(), title: 'Artificial Intelligence', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Machine Learning', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'ChatGPT', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Claude AI', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'OpenAI', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Google', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Apple', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Microsoft', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Amazon', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Meta', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Tesla', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'SpaceX', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Blockchain', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Cloud Computing', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Quantum Computing', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Cybersecurity', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: '5G Technology', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Internet of Things', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Semiconductors', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'iPhone', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Android', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Software Development', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Web3', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Virtual Reality', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Augmented Reality', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Autonomous Vehicles', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Robotics', category: 'Technology News', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Drones', category: 'Technology News', freshness: 'recent', timestamp: now }
      ]
    },
    // Politics
    {
      name: 'Politics & Government',
      topics: [
        { id: generateId(), title: 'Trump', category: 'Politics & Government', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Biden', category: 'Politics & Government', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Congress', category: 'Politics & Government', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Senate', category: 'Politics & Government', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Supreme Court', category: 'Politics & Government', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Elections', category: 'Politics & Government', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Campaign 2024', category: 'Politics & Government', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Immigration Policy', category: 'Politics & Government', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Healthcare Reform', category: 'Politics & Government', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Climate Policy', category: 'Politics & Government', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Foreign Policy', category: 'Politics & Government', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'National Security', category: 'Politics & Government', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Gun Control', category: 'Politics & Government', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Abortion Rights', category: 'Politics & Government', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Voting Rights', category: 'Politics & Government', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Tax Policy', category: 'Politics & Government', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Education Policy', category: 'Politics & Government', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Infrastructure', category: 'Politics & Government', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Social Security', category: 'Politics & Government', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Medicare', category: 'Politics & Government', freshness: 'recent', timestamp: now }
      ]
    },
    // World News
    {
      name: 'World Affairs',
      topics: [
        { id: generateId(), title: 'Ukraine', category: 'World Affairs', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Russia', category: 'World Affairs', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'China', category: 'World Affairs', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'India', category: 'World Affairs', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Israel', category: 'World Affairs', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Palestine', category: 'World Affairs', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Middle East', category: 'World Affairs', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Europe', category: 'World Affairs', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'European Union', category: 'World Affairs', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'United Kingdom', category: 'World Affairs', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Asia', category: 'World Affairs', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Africa', category: 'World Affairs', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Latin America', category: 'World Affairs', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'North Korea', category: 'World Affairs', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Iran', category: 'World Affairs', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'NATO', category: 'World Affairs', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'United Nations', category: 'World Affairs', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'International Trade', category: 'World Affairs', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Global Diplomacy', category: 'World Affairs', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Human Rights', category: 'World Affairs', freshness: 'recent', timestamp: now }
      ]
    },

    // Entertainment
    {
      name: 'Film & Television',
      topics: [
        { id: generateId(), title: 'Movies', category: 'Film & Television', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Netflix', category: 'Film & Television', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Disney+', category: 'Film & Television', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'HBO', category: 'Film & Television', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Amazon Prime Video', category: 'Film & Television', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'TV Shows', category: 'Film & Television', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Streaming Services', category: 'Film & Television', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Oscars', category: 'Film & Television', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Emmy Awards', category: 'Film & Television', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Hollywood', category: 'Film & Television', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Marvel', category: 'Film & Television', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Star Wars', category: 'Film & Television', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Documentaries', category: 'Film & Television', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Animation', category: 'Film & Television', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Film Festivals', category: 'Film & Television', freshness: 'recent', timestamp: now }
      ]
    },
    {
      name: 'Music & Audio',
      topics: [
        { id: generateId(), title: 'Music', category: 'Music & Audio', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Spotify', category: 'Music & Audio', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Apple Music', category: 'Music & Audio', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Concerts', category: 'Music & Audio', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Music Festivals', category: 'Music & Audio', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Grammy Awards', category: 'Music & Audio', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Hip Hop', category: 'Music & Audio', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Pop Music', category: 'Music & Audio', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Rock Music', category: 'Music & Audio', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Country Music', category: 'Music & Audio', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Electronic Music', category: 'Music & Audio', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Podcasts', category: 'Music & Audio', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Audio Technology', category: 'Music & Audio', freshness: 'recent', timestamp: now }
      ]
    },
    {
      name: 'Esports & Gaming',
      topics: [
        { id: generateId(), title: 'Gaming', category: 'Esports & Gaming', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'PlayStation', category: 'Esports & Gaming', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Xbox', category: 'Esports & Gaming', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Nintendo', category: 'Esports & Gaming', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'PC Gaming', category: 'Esports & Gaming', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Esports', category: 'Esports & Gaming', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Twitch', category: 'Esports & Gaming', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Game Releases', category: 'Esports & Gaming', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Mobile Gaming', category: 'Esports & Gaming', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Game Development', category: 'Esports & Gaming', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Virtual Reality Gaming', category: 'Esports & Gaming', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Gaming Industry', category: 'Esports & Gaming', freshness: 'recent', timestamp: now }
      ]
    },
    // Science & Research
    {
      name: 'Physics & Astronomy',
      topics: [
        { id: generateId(), title: 'Space Exploration', category: 'Physics & Astronomy', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'NASA', category: 'Physics & Astronomy', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'James Webb Telescope', category: 'Physics & Astronomy', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Mars', category: 'Physics & Astronomy', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Black Holes', category: 'Physics & Astronomy', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Dark Matter', category: 'Physics & Astronomy', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Quantum Physics', category: 'Physics & Astronomy', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Particle Physics', category: 'Physics & Astronomy', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Astronomy', category: 'Physics & Astronomy', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Astrophysics', category: 'Physics & Astronomy', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Exoplanets', category: 'Physics & Astronomy', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Cosmology', category: 'Physics & Astronomy', freshness: 'recent', timestamp: now }
      ]
    },
    {
      name: 'Biology & Life Sciences',
      topics: [
        { id: generateId(), title: 'Genetics', category: 'Biology & Life Sciences', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'CRISPR', category: 'Biology & Life Sciences', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Gene Therapy', category: 'Biology & Life Sciences', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Evolution', category: 'Biology & Life Sciences', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Biodiversity', category: 'Biology & Life Sciences', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Ecology', category: 'Biology & Life Sciences', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Marine Biology', category: 'Biology & Life Sciences', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Microbiology', category: 'Biology & Life Sciences', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Neuroscience', category: 'Biology & Life Sciences', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Conservation Biology', category: 'Biology & Life Sciences', freshness: 'recent', timestamp: now }
      ]
    },
    {
      name: 'Environmental Science',
      topics: [
        { id: generateId(), title: 'Climate Change', category: 'Environmental Science', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Global Warming', category: 'Environmental Science', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Renewable Energy', category: 'Environmental Science', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Solar Power', category: 'Environmental Science', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Wind Energy', category: 'Environmental Science', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Electric Vehicles', category: 'Environmental Science', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Sustainability', category: 'Environmental Science', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Carbon Emissions', category: 'Environmental Science', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Recycling', category: 'Environmental Science', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Ocean Conservation', category: 'Environmental Science', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Wildlife Protection', category: 'Environmental Science', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Deforestation', category: 'Environmental Science', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Water Conservation', category: 'Environmental Science', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Green Technology', category: 'Environmental Science', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Environmental Policy', category: 'Environmental Science', freshness: 'recent', timestamp: now }
      ]
    },
    //Health & Wellness
    {
      name: 'Mental Health',
      topics: [
        { id: generateId(), title: 'Mental Health', category: 'Mental Health', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Meditation', category: 'Mental Health', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Mindfulness', category: 'Mental Health', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Therapy', category: 'Mental Health', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Anxiety', category: 'Mental Health', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Depression', category: 'Mental Health', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Stress Management', category: 'Mental Health', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Sleep', category: 'Mental Health', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Wellbeing', category: 'Mental Health', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Psychology', category: 'Mental Health', freshness: 'recent', timestamp: now }
      ]
    },
    {
      name: 'Fitness & Exercise',
      topics: [
        { id: generateId(), title: 'Fitness', category: 'Fitness & Exercise', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Workout Routines', category: 'Fitness & Exercise', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Strength Training', category: 'Fitness & Exercise', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Cardio', category: 'Fitness & Exercise', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Yoga', category: 'Fitness & Exercise', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Pilates', category: 'Fitness & Exercise', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'CrossFit', category: 'Fitness & Exercise', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Running', category: 'Fitness & Exercise', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Bodybuilding', category: 'Fitness & Exercise', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Personal Training', category: 'Fitness & Exercise', freshness: 'recent', timestamp: now }
      ]
    },
    {
      name: 'Nutrition & Diet',
      topics: [
        { id: generateId(), title: 'Nutrition', category: 'Nutrition & Diet', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Diet', category: 'Nutrition & Diet', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Weight Loss', category: 'Nutrition & Diet', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Keto Diet', category: 'Nutrition & Diet', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Intermittent Fasting', category: 'Nutrition & Diet', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Vegan Diet', category: 'Nutrition & Diet', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Protein', category: 'Nutrition & Diet', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Supplements', category: 'Nutrition & Diet', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Vitamins', category: 'Nutrition & Diet', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Healthy Eating', category: 'Nutrition & Diet', freshness: 'recent', timestamp: now }
      ]
    },
    {
      name: 'Medical Research',
      topics: [
        { id: generateId(), title: 'Medicine', category: 'Medical Research', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Cancer Research', category: 'Medical Research', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Vaccines', category: 'Medical Research', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Drug Development', category: 'Medical Research', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Clinical Trials', category: 'Medical Research', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Alzheimer\'s Research', category: 'Medical Research', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Longevity', category: 'Medical Research', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Immunology', category: 'Medical Research', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Public Health', category: 'Medical Research', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Epidemiology', category: 'Medical Research', freshness: 'recent', timestamp: now }
      ]
    },
    // Culture & Lifestyle
    {
      name: 'Cooking & Culinary',
      topics: [
        { id: generateId(), title: 'Cooking', category: 'Cooking & Culinary', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Recipes', category: 'Cooking & Culinary', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Restaurants', category: 'Cooking & Culinary', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Baking', category: 'Cooking & Culinary', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Food Trends', category: 'Cooking & Culinary', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Chefs', category: 'Cooking & Culinary', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Cuisine', category: 'Cooking & Culinary', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Wine', category: 'Cooking & Culinary', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Coffee', category: 'Cooking & Culinary', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Craft Beer', category: 'Cooking & Culinary', freshness: 'recent', timestamp: now }
      ]
    },
    {
      name: 'Travel & Tourism',
      topics: [
        { id: generateId(), title: 'Travel', category: 'Travel & Tourism', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Tourism', category: 'Travel & Tourism', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Vacation Destinations', category: 'Travel & Tourism', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Adventure Travel', category: 'Travel & Tourism', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Hotels', category: 'Travel & Tourism', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Airlines', category: 'Travel & Tourism', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Cruises', category: 'Travel & Tourism', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Digital Nomads', category: 'Travel & Tourism', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Backpacking', category: 'Travel & Tourism', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Luxury Travel', category: 'Travel & Tourism', freshness: 'recent', timestamp: now }
      ]
    },
    {
      name: 'Fashion & Style',
      topics: [
        { id: generateId(), title: 'Fashion', category: 'Fashion & Style', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Fashion Week', category: 'Fashion & Style', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Designer Brands', category: 'Fashion & Style', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Street Style', category: 'Fashion & Style', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Sustainable Fashion', category: 'Fashion & Style', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Beauty', category: 'Fashion & Style', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Skincare', category: 'Fashion & Style', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Makeup', category: 'Fashion & Style', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Fashion Trends', category: 'Fashion & Style', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Personal Style', category: 'Fashion & Style', freshness: 'recent', timestamp: now }
      ]
    },
    // Business & Entrepreneurship
    {
      name: 'Entrepreneurship',
      topics: [
        { id: generateId(), title: 'Startups', category: 'Entrepreneurship', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Y Combinator', category: 'Entrepreneurship', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Business Strategy', category: 'Entrepreneurship', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Scaling', category: 'Entrepreneurship', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Fundraising', category: 'Entrepreneurship', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Product Development', category: 'Entrepreneurship', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Marketing', category: 'Entrepreneurship', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'E-commerce', category: 'Entrepreneurship', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'SaaS', category: 'Entrepreneurship', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Business Models', category: 'Entrepreneurship', freshness: 'recent', timestamp: now }
      ]
    },
    // Education & Career
    {
      name: 'Career Development',
      topics: [
        { id: generateId(), title: 'Career Development', category: 'Career Development', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Remote Work', category: 'Career Development', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Leadership', category: 'Career Development', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Professional Skills', category: 'Career Development', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Networking', category: 'Career Development', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Job Search', category: 'Career Development', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Interviews', category: 'Career Development', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Workplace Culture', category: 'Career Development', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Productivity', category: 'Career Development', freshness: 'recent', timestamp: now },
        { id: generateId(), title: 'Work-Life Balance', category: 'Career Development', freshness: 'recent', timestamp: now }
      ]
    }
  ]
}
