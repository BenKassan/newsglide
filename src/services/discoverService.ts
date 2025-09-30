import { supabase } from '@/integrations/supabase/client'
import { fetchTopicImages } from './unsplashService'

export interface DiscoverTopic {
  id: string
  title: string
  category: 'Breaking' | 'Politics' | 'Technology' | 'Business' | 'World' | 'Science' | 'Health' | 'Sports' | 'Entertainment'
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

// Enhanced trending topics that fetches from multiple categories
export async function fetchDiscoverTopics(userId?: string, invalidateCache: boolean = false): Promise<DiscoverCategory[]> {
  // Check cache validity
  if (!invalidateCache && cachedTopics && cacheTimestamp) {
    const now = Date.now()
    if (now - cacheTimestamp < CACHE_DURATION_MS) {
      console.log('Returning cached discover topics')
      return cachedTopics
    }
  }
  try {
    console.log('Fetching discover topics...')

    // Call the trending-topics edge function multiple times with different seeds
    // to get more variety
    const allTopics: DiscoverTopic[] = []

    // Fetch 6 batches of topics to get ~24 diverse topics
    for (let batch = 0; batch < 6; batch++) {
      try {
        const { data, error } = await supabase.functions.invoke('trending-topics', {
          body: {
            timestamp: Date.now() + batch, // Different timestamp for variety
            seed: batch
          },
        })

        if (!error && data?.topics && Array.isArray(data.topics)) {
          // Determine category and freshness for each topic
          data.topics.forEach((topic: string, index: number) => {
            const category = determineCategoryFromTopic(topic)
            const freshness = batch === 0 ? 'breaking' : batch < 3 ? 'today' : 'recent'

            allTopics.push({
              id: `${batch}-${index}-${Date.now()}`,
              title: topic,
              category,
              sourceCount: Math.floor(Math.random() * 100) + 50, // Simulated for now
              freshness,
              timestamp: new Date().toISOString()
            })
          })
        }
      } catch (batchError) {
        console.error(`Batch ${batch} failed:`, batchError)
      }

      // Small delay between batches
      if (batch < 5) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Remove duplicates based on title similarity
    const uniqueTopics = deduplicateTopics(allTopics)

    // Fetch images for all unique topics
    console.log('Fetching images for topics...')
    const topicTitles = uniqueTopics.map(t => t.title)
    const imageMap = await fetchTopicImages(topicTitles)

    // Add images to topics
    uniqueTopics.forEach(topic => {
      const image = imageMap.get(topic.title)
      if (image) {
        topic.image = image
      }
    })

    // Group by category
    const categorized = groupByCategory(uniqueTopics)

    console.log(`Fetched ${uniqueTopics.length} unique topics across ${categorized.length} categories`)

    // Update cache
    cachedTopics = categorized
    cacheTimestamp = Date.now()

    return categorized

  } catch (error) {
    console.error('Failed to fetch discover topics:', error)

    // Return fallback topics organized by category
    const fallback = getFallbackTopics()

    // Cache fallback too
    cachedTopics = fallback
    cacheTimestamp = Date.now()

    return fallback
  }
}

// Determine category based on keywords in the topic
function determineCategoryFromTopic(topic: string): DiscoverTopic['category'] {
  const lower = topic.toLowerCase()

  // Breaking news indicators
  if (lower.includes('breaking') || lower.includes('urgent') || lower.includes('just in')) {
    return 'Breaking'
  }

  // Politics
  if (lower.match(/\b(election|vote|congress|senate|president|minister|parliament|legislation|bill|policy)\b/)) {
    return 'Politics'
  }

  // Technology
  if (lower.match(/\b(tech|ai|software|app|startup|silicon|crypto|bitcoin|iphone|tesla|spacex|nasa|mars)\b/)) {
    return 'Technology'
  }

  // Business
  if (lower.match(/\b(stock|market|earnings|ceo|ipo|merger|acquisition|wall street|trade|economy|gdp)\b/)) {
    return 'Business'
  }

  // World
  if (lower.match(/\b(ukraine|russia|china|israel|gaza|war|peace|summit|nato|un|international)\b/)) {
    return 'World'
  }

  // Science
  if (lower.match(/\b(climate|study|research|scientist|discovery|space|mars|asteroid|vaccine|cure)\b/)) {
    return 'Science'
  }

  // Health
  if (lower.match(/\b(health|medical|disease|covid|pandemic|hospital|doctor|fda|drug|treatment)\b/)) {
    return 'Health'
  }

  // Sports
  if (lower.match(/\b(nfl|nba|mlb|nhl|fifa|olympics|championship|playoffs|super bowl|world cup)\b/)) {
    return 'Sports'
  }

  // Entertainment
  if (lower.match(/\b(movie|film|netflix|spotify|actor|singer|celebrity|oscar|grammy|album|concert)\b/)) {
    return 'Entertainment'
  }

  // Default to Technology for tech-heavy topics, Business for financial, Politics otherwise
  if (lower.match(/\b(google|apple|microsoft|amazon|meta|twitter)\b/)) return 'Technology'
  if (lower.match(/\b(billion|million|profit|revenue|shares)\b/)) return 'Business'

  return 'Politics' // Default fallback
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

  // Convert to array and sort by priority
  const categoryOrder: DiscoverTopic['category'][] = [
    'Breaking',
    'Politics',
    'Technology',
    'Business',
    'World',
    'Science',
    'Health',
    'Sports',
    'Entertainment'
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

// Fallback topics if edge function fails
function getFallbackTopics(): DiscoverCategory[] {
  return [
    {
      name: 'Politics',
      topics: [
        { id: '1', title: '2024 Election Updates', category: 'Politics', freshness: 'today', timestamp: new Date().toISOString(), sourceCount: 150, image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&h=250&fit=crop' },
        { id: '2', title: 'Congress Debates New Bill', category: 'Politics', freshness: 'today', timestamp: new Date().toISOString(), sourceCount: 89, image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&h=250&fit=crop' },
        { id: '3', title: 'Supreme Court Ruling', category: 'Politics', freshness: 'recent', timestamp: new Date().toISOString(), sourceCount: 120, image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&h=250&fit=crop' }
      ]
    },
    {
      name: 'Technology',
      topics: [
        { id: '4', title: 'AI Breakthrough Announced', category: 'Technology', freshness: 'breaking', timestamp: new Date().toISOString(), sourceCount: 200, image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=250&fit=crop' },
        { id: '5', title: 'Tech Layoffs Continue', category: 'Technology', freshness: 'today', timestamp: new Date().toISOString(), sourceCount: 95, image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=250&fit=crop' },
        { id: '6', title: 'New iPhone Features', category: 'Technology', freshness: 'recent', timestamp: new Date().toISOString(), sourceCount: 78, image: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=400&h=250&fit=crop' }
      ]
    },
    {
      name: 'Business',
      topics: [
        { id: '7', title: 'Stock Market Rally', category: 'Business', freshness: 'today', timestamp: new Date().toISOString(), sourceCount: 180, image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=250&fit=crop' },
        { id: '8', title: 'CEO Steps Down', category: 'Business', freshness: 'breaking', timestamp: new Date().toISOString(), sourceCount: 110, image: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=400&h=250&fit=crop' },
        { id: '9', title: 'Merger Announcement', category: 'Business', freshness: 'recent', timestamp: new Date().toISOString(), sourceCount: 65, image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=250&fit=crop' }
      ]
    },
    {
      name: 'World',
      topics: [
        { id: '10', title: 'International Summit Begins', category: 'World', freshness: 'breaking', timestamp: new Date().toISOString(), sourceCount: 250, image: 'https://images.unsplash.com/photo-1569163139394-de4798aa62b6?w=400&h=250&fit=crop' },
        { id: '11', title: 'Peace Talks Progress', category: 'World', freshness: 'today', timestamp: new Date().toISOString(), sourceCount: 140, image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&h=250&fit=crop' },
        { id: '12', title: 'Climate Agreement Signed', category: 'World', freshness: 'recent', timestamp: new Date().toISOString(), sourceCount: 95, image: 'https://images.unsplash.com/photo-1569163139394-de4798aa62b6?w=400&h=250&fit=crop' }
      ]
    }
  ]
}
