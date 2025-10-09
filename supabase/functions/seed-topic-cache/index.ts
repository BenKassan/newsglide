import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// All categories from the discover feed
const CATEGORIES = [
  'Team Sports',
  'Individual Sports',
  'Business & Finance',
  'Technology News',
  'Politics & Government',
  'World Affairs',
  'Film & Television',
  'Music & Audio',
  'Esports & Gaming',
  'Physics & Astronomy',
  'Biology & Life Sciences',
  'Environmental Science',
  'Mental Health',
  'Fitness & Exercise',
  'Nutrition & Diet',
  'Medical Research',
  'Cooking & Culinary',
  'Travel & Tourism',
  'Fashion & Style',
  'Entrepreneurship',
  'Career Development'
]

interface SeedRequest {
  categories?: string[] // Optional: specific categories to seed
  generations_count?: number // How many generations to pre-generate (default: 5)
  parallel?: boolean // Generate in parallel for speed (default: true)
}

interface SeedResponse {
  success: boolean
  categories_seeded: string[]
  total_generations: number
  total_topics: number
  duration_ms: number
  errors?: string[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  const errors: string[] = []

  try {
    const { categories, generations_count, parallel } = await req.json() as SeedRequest

    // Use provided categories or default to all
    const categoriesToSeed = categories || CATEGORIES
    const generationsCount = generations_count || 5
    const useParallel = parallel !== false

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let totalGenerations = 0
    let totalTopics = 0

    console.log(`Starting cache seeding for ${categoriesToSeed.length} categories, ${generationsCount} generations each`)

    if (useParallel) {
      // Generate all categories in parallel for speed
      const promises = categoriesToSeed.map(async (category) => {
        try {
          const result = await seedCategoryGenerations(category, generationsCount, supabase)
          return result
        } catch (error) {
          const errorMsg = `Failed to seed ${category}: ${error instanceof Error ? error.message : 'Unknown error'}`
          console.error(errorMsg)
          errors.push(errorMsg)
          return { generations: 0, topics: 0 }
        }
      })

      const results = await Promise.all(promises)
      results.forEach(result => {
        totalGenerations += result.generations
        totalTopics += result.topics
      })
    } else {
      // Generate sequentially (slower but safer for rate limits)
      for (const category of categoriesToSeed) {
        try {
          const result = await seedCategoryGenerations(category, generationsCount, supabase)
          totalGenerations += result.generations
          totalTopics += result.topics
        } catch (error) {
          const errorMsg = `Failed to seed ${category}: ${error instanceof Error ? error.message : 'Unknown error'}`
          console.error(errorMsg)
          errors.push(errorMsg)
        }
      }
    }

    const duration = Date.now() - startTime

    const response: SeedResponse = {
      success: errors.length === 0,
      categories_seeded: categoriesToSeed,
      total_generations: totalGenerations,
      total_topics: totalTopics,
      duration_ms: duration,
      ...(errors.length > 0 && { errors })
    }

    console.log(`Seeding complete: ${totalGenerations} generations, ${totalTopics} topics in ${duration}ms`)

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in seed-topic-cache:', error)

    const response: SeedResponse = {
      success: false,
      categories_seeded: [],
      total_generations: 0,
      total_topics: 0,
      duration_ms: Date.now() - startTime,
      errors: [error instanceof Error ? error.message : 'Unknown error occurred']
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

/**
 * Seed multiple generations for a single category
 */
async function seedCategoryGenerations(
  categoryName: string,
  count: number,
  supabase: any
): Promise<{ generations: number, topics: number }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  let generationsCreated = 0
  let topicsCreated = 0

  for (let i = 1; i <= count; i++) {
    try {
      // Check if this generation already exists
      const { data: existing } = await supabase
        .from('discover_topic_cache')
        .select('id')
        .eq('category_name', categoryName)
        .eq('generation_number', i)
        .maybeSingle()

      if (existing) {
        console.log(`Skipping ${categoryName} generation ${i} (already exists)`)
        continue
      }

      // Call generate-discover-topics function
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-discover-topics`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_name: categoryName,
          generation_number: i
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      generationsCreated++
      topicsCreated += result.topics?.length || 0

      console.log(`✓ Generated ${categoryName} #${i} (${result.topics?.length || 0} topics, creativity: ${result.creativity_level.toFixed(2)})`)

      // Small delay to avoid rate limits (100ms between requests)
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      console.error(`Failed to generate ${categoryName} #${i}:`, error)
      throw error
    }
  }

  return { generations: generationsCreated, topics: topicsCreated }
}
