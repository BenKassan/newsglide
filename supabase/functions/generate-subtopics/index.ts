import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateSubtopicsRequest {
  topicName: string
  parentPath: string
  depth: number
  newsContext?: string
}

interface GenerateSubtopicsResponse {
  subtopics: string[]
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { topicName, parentPath, depth, newsContext } = await req.json() as GenerateSubtopicsRequest

    // Validate required environment variables
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY is not configured')
    }

    // Generate subtopics using OpenAI
    const subtopics = await generateSubtopicsWithAI(topicName, parentPath, depth, newsContext, openaiKey)

    const response: GenerateSubtopicsResponse = {
      subtopics
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error generating subtopics:', error)

    const response: GenerateSubtopicsResponse = {
      subtopics: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

/**
 * Generate subtopics using OpenAI GPT-4
 */
async function generateSubtopicsWithAI(
  topicName: string,
  parentPath: string,
  depth: number,
  newsContext: string | undefined,
  openaiKey: string
): Promise<string[]> {
  // Construct prompt based on depth
  const prompt = buildPrompt(topicName, parentPath, depth, newsContext)

  // Call OpenAI API
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a news topic categorization expert. Generate relevant, newsworthy subtopics.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
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

  // Parse subtopics from response (expecting JSON array or newline-separated list)
  const subtopics = parseSubtopics(content)

  // Validate we got 5-8 subtopics
  if (subtopics.length < 3) {
    throw new Error('Insufficient subtopics generated')
  }

  return subtopics.slice(0, 8) // Return max 8
}

/**
 * Build prompt based on depth level
 */
function buildPrompt(
  topicName: string,
  parentPath: string,
  depth: number,
  newsContext: string | undefined
): string {
  const pathParts = parentPath.split('/').map(p => p.replace(/-/g, ' '))
  const contextChain = pathParts.join(' > ')

  let specificityGuide = ''

  if (depth <= 2) {
    specificityGuide = 'broad categories that are commonly covered in news'
  } else if (depth <= 5) {
    specificityGuide = 'specific domains or topics that have regular news coverage'
  } else {
    specificityGuide = 'very specific, narrow topics or recent developments with active news stories'
  }

  const prompt = `
You are organizing news topics hierarchically. The user is currently viewing: "${topicName}"

Topic path: ${contextChain} > ${topicName}
Depth level: ${depth}

Generate 5-8 relevant subtopics for "${topicName}" that are:
1. ${specificityGuide}
2. Newsworthy (have recent articles available)
3. Distinct from each other
4. Relevant to the parent topic path
5. Specific enough to have 10+ news articles but broad enough to have their own subtopics

${newsContext ? `Recent news context: ${newsContext}` : ''}

Return ONLY a JSON array of subtopic names, nothing else. Example format:
["Subtopic 1", "Subtopic 2", "Subtopic 3", "Subtopic 4", "Subtopic 5"]
`.trim()

  return prompt
}

/**
 * Parse subtopics from AI response
 */
function parseSubtopics(content: string): string[] {
  try {
    // Try to parse as JSON array first
    const trimmed = content.trim()

    // Remove markdown code blocks if present
    const cleaned = trimmed
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()

    const parsed = JSON.parse(cleaned)

    if (Array.isArray(parsed)) {
      return parsed.filter(item => typeof item === 'string' && item.length > 0)
    }
  } catch (e) {
    // If JSON parsing fails, try newline-separated
    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('[') && !line.startsWith(']'))
      .map(line => line.replace(/^[\d\-\*\.]+\s*/, '')) // Remove list markers
      .map(line => line.replace(/^["']|["']$/g, '')) // Remove quotes
      .filter(line => line.length > 2)

    if (lines.length >= 3) {
      return lines
    }
  }

  throw new Error('Failed to parse subtopics from AI response')
}
