import { supabase } from '@/integrations/supabase/client'

/**
 * Service for managing infinite topic hierarchy exploration
 * Handles topic navigation, subtopic generation, and caching
 */

// ============================================================================
// Types
// ============================================================================

export interface HierarchyTopic {
  id: string
  name: string
  path: string
  depth: number
  parent_id: string | null
  user_id: string | null
  cached_subtopics: SubtopicCache[] | null
  cache_expires_at: string | null
  article_count: number
  description?: string | null
  created_at: string
  updated_at: string
}

export interface SubtopicCache {
  name: string
  path: string
  article_count: number
}

export interface GenerateSubtopicsRequest {
  topicName: string
  parentPath: string
  depth: number
  newsContext?: string
}

export interface GenerateSubtopicsResponse {
  subtopics: string[]
  error?: string
}

// ============================================================================
// Constants
// ============================================================================

const CACHE_TTL_HOURS = 1 // Subtopic cache expires after 1 hour
const MAX_CUSTOM_TOPICS_FREE = 5

// ============================================================================
// Core Topic Retrieval
// ============================================================================

/**
 * Get a topic by its path
 * @param path - Topic path (e.g., "technology/space/mars")
 * @param userId - Optional user ID for custom topics
 * @param createIfNotExists - If true, create the topic if it doesn't exist
 */
export async function getTopicByPath(
  path: string,
  userId?: string,
  createIfNotExists: boolean = false
): Promise<HierarchyTopic | null> {
  try {
    let query = supabase
      .from('discover_topics')
      .select('*')
      .eq('path', path)

    // If user ID provided, get their custom topic OR public topic
    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`)
    } else {
      query = query.is('user_id', null)
    }

    const { data, error } = await query.single()

    if (error) {
      // If topic not found and createIfNotExists is true, create it
      if (error.code === 'PGRST116' && createIfNotExists) {
        return await createTopicFromPath(path, userId)
      }
      console.error('Error fetching topic by path:', error)
      return null
    }

    return data as HierarchyTopic
  } catch (err) {
    console.error('Exception in getTopicByPath:', err)
    return null
  }
}

/**
 * Create a new topic from a path (for user searches)
 * @param path - Topic path to create
 * @param userId - Optional user ID (required for creating topics due to RLS)
 */
async function createTopicFromPath(
  path: string,
  userId?: string
): Promise<HierarchyTopic | null> {
  try {
    // Parse the path to get topic name and parent info
    const pathSegments = path.split('/')
    const topicName = pathSegments[pathSegments.length - 1]
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())

    const depth = pathSegments.length - 1
    const parentPath = pathSegments.slice(0, -1).join('/')

    let parentId: string | null = null

    // If there's a parent path, ensure parent topic exists
    if (parentPath) {
      const parentTopic = await getTopicByPath(parentPath, userId, true)
      if (parentTopic) {
        parentId = parentTopic.id
      }
    }

    // Create the new topic
    // Note: Creating as user-owned topic since RLS requires user_id for INSERT
    // If no user is logged in, we cannot create the topic
    if (!userId) {
      console.error('Cannot create topic without user ID due to RLS policies')
      return null
    }

    // Check if topic already exists (might be owned by another user or public)
    const existingTopic = await supabase
      .from('discover_topics')
      .select('*')
      .eq('path', path)
      .is('user_id', null)
      .maybeSingle()

    if (existingTopic.data) {
      // Public topic already exists, return it
      const publicTopic = existingTopic.data as HierarchyTopic
      // Generate subtopics if not cached
      if (!isCacheValid(publicTopic.cache_expires_at)) {
        await generateSubtopics(publicTopic, userId)
      }
      return publicTopic
    }

    const { data, error } = await supabase
      .from('discover_topics')
      .insert({
        name: topicName,
        path: path,
        depth: depth,
        parent_id: parentId,
        user_id: userId, // Create as user-owned topic (required by RLS)
        article_count: 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating topic from path:', error)
      return null
    }

    // Generate subtopics for the newly created topic
    const newTopic = data as HierarchyTopic
    await generateSubtopics(newTopic, userId)

    return newTopic
  } catch (err) {
    console.error('Exception in createTopicFromPath:', err)
    return null
  }
}

/**
 * Get all root topics (depth = 0)
 */
export async function getRootTopics(): Promise<HierarchyTopic[]> {
  try {
    const { data, error } = await supabase
      .from('discover_topics')
      .select('*')
      .eq('depth', 0)
      .is('user_id', null) // Only public root topics
      .order('name')

    if (error) {
      console.error('Error fetching root topics:', error)
      return []
    }

    return data as HierarchyTopic[]
  } catch (err) {
    console.error('Exception in getRootTopics:', err)
    return []
  }
}

// ============================================================================
// Subtopic Management
// ============================================================================

/**
 * Get subtopics for a given parent path
 * Checks cache first, generates if needed
 */
export async function getSubtopics(
  parentPath: string,
  userId?: string
): Promise<HierarchyTopic[]> {
  try {
    // First, get the parent topic to check cache
    const parentTopic = await getTopicByPath(parentPath, userId)

    if (!parentTopic) {
      console.error('Parent topic not found:', parentPath)
      return []
    }

    // Check if cache is valid
    const cacheValid = isCacheValid(parentTopic.cache_expires_at)

    if (cacheValid && parentTopic.cached_subtopics) {
      // Return cached subtopics (convert cache to full topics)
      return await hydrateSubtopicsFromCache(parentTopic.cached_subtopics, parentPath, userId)
    }

    // Cache invalid or missing - generate new subtopics
    const subtopics = await generateSubtopics(parentTopic, userId)

    // Update cache in database
    await updateSubtopicCache(parentTopic.id, subtopics)

    return subtopics
  } catch (err) {
    console.error('Exception in getSubtopics:', err)
    return []
  }
}

/**
 * Generate new subtopics using AI
 */
export async function generateSubtopics(
  parentTopic: HierarchyTopic,
  userId?: string
): Promise<HierarchyTopic[]> {
  try {
    // Call edge function to generate subtopic names
    const { data, error } = await supabase.functions.invoke<GenerateSubtopicsResponse>(
      'generate-subtopics',
      {
        body: {
          topicName: parentTopic.name,
          parentPath: parentTopic.path,
          depth: parentTopic.depth,
          newsContext: '' // TODO: Add recent news context
        } as GenerateSubtopicsRequest
      }
    )

    if (error || !data || !data.subtopics) {
      console.error('Error generating subtopics:', error)
      return []
    }

    // Create topic entries for each generated subtopic
    const subtopics: HierarchyTopic[] = []

    for (const subtopicName of data.subtopics) {
      const subtopicPath = `${parentTopic.path}/${slugify(subtopicName)}`

      // Insert or get existing topic
      const { data: topicData, error: insertError } = await supabase
        .from('discover_topics')
        .upsert({
          name: subtopicName,
          path: subtopicPath,
          depth: parentTopic.depth + 1,
          parent_id: parentTopic.id,
          user_id: userId || null,
          article_count: 0 // Will be updated later by relevance matching
        }, {
          onConflict: 'path,user_id'
        })
        .select()
        .single()

      if (!insertError && topicData) {
        subtopics.push(topicData as HierarchyTopic)
      }
    }

    return subtopics
  } catch (err) {
    console.error('Exception in generateSubtopics:', err)
    return []
  }
}

/**
 * Update subtopic cache for a topic
 */
async function updateSubtopicCache(
  topicId: string,
  subtopics: HierarchyTopic[]
): Promise<void> {
  try {
    const cache: SubtopicCache[] = subtopics.map(st => ({
      name: st.name,
      path: st.path,
      article_count: st.article_count
    }))

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS)

    await supabase
      .from('discover_topics')
      .update({
        cached_subtopics: cache,
        cache_expires_at: expiresAt.toISOString()
      })
      .eq('id', topicId)
  } catch (err) {
    console.error('Error updating subtopic cache:', err)
  }
}

/**
 * Hydrate cached subtopics into full topic objects
 */
async function hydrateSubtopicsFromCache(
  cache: SubtopicCache[],
  parentPath: string,
  userId?: string
): Promise<HierarchyTopic[]> {
  try {
    const paths = cache.map(c => c.path)

    let query = supabase
      .from('discover_topics')
      .select('*')
      .in('path', paths)

    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`)
    } else {
      query = query.is('user_id', null)
    }

    const { data, error } = await query

    if (error || !data) {
      console.error('Error hydrating subtopics:', error)
      return []
    }

    return data as HierarchyTopic[]
  } catch (err) {
    console.error('Exception in hydrateSubtopicsFromCache:', err)
    return []
  }
}

// ============================================================================
// User Custom Topics
// ============================================================================

/**
 * Create a custom topic for a user
 */
export async function createCustomTopic(
  parentPath: string,
  topicName: string,
  userId: string
): Promise<HierarchyTopic | null> {
  try {
    // Check user's custom topic count (for tier limits)
    const customCount = await getUserCustomTopicCount(userId)

    if (customCount >= MAX_CUSTOM_TOPICS_FREE) {
      // TODO: Check if user has premium subscription
      throw new Error('Free tier limit reached. Upgrade for unlimited custom topics.')
    }

    // Get parent topic
    const parentTopic = await getTopicByPath(parentPath, userId)

    if (!parentTopic) {
      throw new Error('Parent topic not found')
    }

    // Create custom topic
    const customPath = `${parentPath}/${slugify(topicName)}`

    const { data, error } = await supabase
      .from('discover_topics')
      .insert({
        name: topicName,
        path: customPath,
        depth: parentTopic.depth + 1,
        parent_id: parentTopic.id,
        user_id: userId,
        article_count: 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating custom topic:', error)
      return null
    }

    // Generate initial subtopics for the custom topic
    await generateSubtopics(data as HierarchyTopic, userId)

    return data as HierarchyTopic
  } catch (err) {
    console.error('Exception in createCustomTopic:', err)
    throw err
  }
}

/**
 * Delete a custom topic
 */
export async function deleteCustomTopic(
  topicId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('discover_topics')
      .delete()
      .eq('id', topicId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting custom topic:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Exception in deleteCustomTopic:', err)
    return false
  }
}

/**
 * Get count of user's custom topics
 */
async function getUserCustomTopicCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('discover_topics')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (error) {
      console.error('Error getting custom topic count:', error)
      return 0
    }

    return count || 0
  } catch (err) {
    console.error('Exception in getUserCustomTopicCount:', err)
    return 0
  }
}

// ============================================================================
// Article Association
// ============================================================================

/**
 * Get articles for a topic
 * TODO: Implement after article system is defined
 */
export async function getTopicArticles(
  topicPath: string,
  limit: number = 10
): Promise<any[]> {
  try {
    // TODO: Implement article retrieval with relevance scores
    // This will query topic_articles junction table
    return []
  } catch (err) {
    console.error('Exception in getTopicArticles:', err)
    return []
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if cache timestamp is still valid
 */
function isCacheValid(cacheExpiresAt: string | null): boolean {
  if (!cacheExpiresAt) return false

  const expiryDate = new Date(cacheExpiresAt)
  const now = new Date()

  return expiryDate > now
}

/**
 * Convert topic name to URL-safe slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single
    .trim()
}

/**
 * Parse path into breadcrumb segments
 */
export function parseBreadcrumbs(path: string): { name: string; path: string }[] {
  const segments = path.split('/')
  const breadcrumbs: { name: string; path: string }[] = []

  let currentPath = ''

  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment

    breadcrumbs.push({
      name: segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      path: currentPath
    })
  }

  return breadcrumbs
}
