import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateDiscoverTopicsRequest {
  category_name: string
  generation_number?: number // Optional, will auto-calculate if not provided
  force?: boolean // Force generation even if cache exists
}

interface DiscoverTopic {
  id: string
  title: string
  category: string
  subcategory?: string
  freshness: 'breaking' | 'today' | 'recent'
  timestamp: string
}

interface GenerateDiscoverTopicsResponse {
  topics: DiscoverTopic[]
  generation_number: number
  creativity_level: number
  model_used: string
  cache_id?: string
  error?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const { category_name, generation_number, force } = await req.json() as GenerateDiscoverTopicsRequest

    // Validate OpenAI API key
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY is not configured')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get generation number (provided or calculate next)
    let genNumber = generation_number
    if (!genNumber) {
      const { data: nextGen } = await supabase.rpc('get_next_generation_number', {
        p_category_name: category_name
      })
      genNumber = nextGen || 1
    }

    // Calculate creativity level based on generation number
    const creativityLevel = calculateCreativityLevel(genNumber)

    // Get previous topic names for duplicate prevention
    const { data: previousTopics } = await supabase.rpc('get_previous_topic_names', {
      p_category_name: category_name
    })
    const excludeTopics = previousTopics || []

    // Select model based on creativity level
    const model = creativityLevel >= 0.7 ? 'gpt-4' : 'gpt-3.5-turbo'

    // Generate topics using OpenAI
    const topics = await generateTopicsWithAI(
      category_name,
      genNumber,
      creativityLevel,
      excludeTopics,
      model,
      openaiKey
    )

    // Store in generation history
    await supabase
      .from('discover_generation_history')
      .insert({
        category_name,
        generation_number: genNumber,
        topic_names: topics.map(t => t.title),
        creativity_level: creativityLevel,
        model_used: model,
        generation_time_ms: Date.now() - startTime
      })

    // Store in cache (unless this is a forced real-time generation)
    let cacheId: string | undefined
    if (!force) {
      const { data: cached } = await supabase
        .from('discover_topic_cache')
        .insert({
          category_name,
          generation_number: genNumber,
          topics: topics,
          creativity_level: creativityLevel
        })
        .select('id')
        .single()

      cacheId = cached?.id
    }

    const response: GenerateDiscoverTopicsResponse = {
      topics,
      generation_number: genNumber,
      creativity_level: creativityLevel,
      model_used: model,
      cache_id: cacheId
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error generating discover topics:', error)

    const response: GenerateDiscoverTopicsResponse = {
      topics: [],
      generation_number: 0,
      creativity_level: 0,
      model_used: 'none',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

/**
 * Calculate creativity level based on generation number
 * Starts at 0.2, increases by 0.1 per generation, caps at 0.95
 */
function calculateCreativityLevel(generationNumber: number): number {
  return Math.min(0.95, 0.2 + (generationNumber - 1) * 0.1)
}

/**
 * Generate topics using OpenAI
 */
async function generateTopicsWithAI(
  categoryName: string,
  generationNumber: number,
  creativityLevel: number,
  excludeTopics: string[],
  model: string,
  openaiKey: string
): Promise<DiscoverTopic[]> {
  const prompt = buildPrompt(categoryName, generationNumber, creativityLevel, excludeTopics)
  const temperature = 0.5 + (creativityLevel * 0.4) // 0.5 to 0.88

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a news topic generation expert. Generate diverse, newsworthy topics that are relevant, timely, and have strong coverage potential. Return only valid JSON arrays.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature,
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    throw new Error('No content returned from OpenAI')
  }

  // Parse topics from response
  const topicNames = parseTopicNames(content)

  // Validate we got 12 topics
  if (topicNames.length < 8) {
    throw new Error(`Insufficient topics generated: ${topicNames.length}`)
  }

  // Convert to DiscoverTopic format
  return topicNames.slice(0, 12).map((title, idx) => ({
    id: `gen-${generationNumber}-${idx}`,
    title,
    category: categoryName,
    freshness: 'recent' as const,
    timestamp: new Date().toISOString()
  }))
}

/**
 * Build dynamic prompt based on creativity level
 */
function buildPrompt(
  categoryName: string,
  generationNumber: number,
  creativityLevel: number,
  excludeTopics: string[]
): string {
  let creativityInstructions = ''

  if (creativityLevel < 0.4) {
    // Low creativity: mainstream topics
    creativityInstructions = `Generate 12 mainstream, highly popular topics in "${categoryName}" that have extensive news coverage.
Focus on:
- Major entities, brands, and organizations
- Widely-known events and phenomena
- Topics that consistently appear in headlines
- High search volume subjects`
  } else if (creativityLevel < 0.7) {
    // Medium creativity: specific topics
    creativityInstructions = `Generate 12 specific, newsworthy topics in "${categoryName}" that go deeper than surface-level coverage.
Focus on:
- Emerging trends and developments
- Specific aspects of broader topics
- Niche areas with growing coverage
- Timely and relevant subjects`
  } else {
    // High creativity: interdisciplinary and creative
    creativityInstructions = `Generate 12 creative, cutting-edge topics related to "${categoryName}".
Focus on:
- Interdisciplinary connections and intersections
- Emerging phenomena and innovations
- Unusual angles and perspectives
- Forward-looking developments
- Creative but still newsworthy and real topics`
  }

  const excludeSection = excludeTopics.length > 0
    ? `\n\nIMPORTANT: You MUST NOT generate any of these topics (already used):\n${excludeTopics.slice(-50).join(', ')}\n\nGenerate completely different topics.`
    : ''

  return `${creativityInstructions}

Requirements:
- Exactly 12 topics
- Each topic must be newsworthy (have real articles available)
- Topics must be distinct from each other
- Topics should be specific enough to search for but broad enough to have coverage${excludeSection}

Return ONLY a JSON array of topic names, nothing else. Format:
["Topic 1", "Topic 2", "Topic 3", ...]

Example format:
["Artificial Intelligence Ethics", "Machine Learning in Healthcare", "Neural Network Optimization"]`
}

/**
 * Parse topic names from AI response
 */
function parseTopicNames(content: string): string[] {
  try {
    // Clean up response
    const cleaned = content
      .trim()
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()

    const parsed = JSON.parse(cleaned)

    if (Array.isArray(parsed)) {
      return parsed
        .filter(item => typeof item === 'string' && item.length > 0)
        .map(item => item.trim())
    }
  } catch (e) {
    // If JSON parsing fails, try newline-separated
    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.replace(/^[\d\-\*\.]+\s*/, ''))
      .map(line => line.replace(/^["']|["']$/g, ''))
      .filter(line => line.length > 2)

    if (lines.length >= 8) {
      return lines
    }
  }

  throw new Error('Failed to parse topics from AI response')
}
