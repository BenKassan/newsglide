import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import OpenAI from 'https://esm.sh/openai@4.20.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SurveyResponses {
  fieldOfInterest: string[]
  role: string
  topicInterests: string[]
  newsConsumption: string
  goals: string[]
  geographicInterest?: string
  timeAvailability?: string
  preferredPerspectives?: string[]
  updateFrequency?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { surveyResponses, includeCurrentEvents = true } = await req.json()

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    })

    // Build a comprehensive prompt based on survey responses
    const userProfile = buildUserProfile(surveyResponses)
    
    // Get current trending topics for context (optional)
    let trendingContext = ""
    if (includeCurrentEvents) {
      const braveApiKey = Deno.env.get('BRAVE_API_KEY')
      if (braveApiKey) {
        const trendingTopics = await fetchTrendingTopics(braveApiKey)
        trendingContext = `\n\nCurrent trending topics for context: ${trendingTopics.join(', ')}`
      }
    }

    const systemPrompt = `You are an expert news curator who creates personalized topic recommendations based on user preferences. Generate specific, current, and actionable news search topics that align with the user's interests and goals.`

    const userPrompt = `Based on this user profile, generate 10-15 highly personalized news topic recommendations:

User Profile:
${userProfile}${trendingContext}

Requirements:
1. Make recommendations specific and searchable (not generic)
2. Include a mix of breaking news and evergreen topics in their fields
3. Tailor complexity to their preferred news consumption style
4. Consider their professional role and goals
5. Include both mainstream and niche topics within their interests
6. Make topics timely and relevant to current events when possible
7. Vary the scope based on their geographic interests

Format: Return a JSON array of strings, each being a specific news topic recommendation. Focus on actionable search queries rather than broad categories.

Example format:
[
  "OpenAI's latest GPT model features and enterprise applications",
  "Climate tech startups securing Series A funding in 2025",
  "Quantum computing breakthroughs in drug discovery"
]`

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    })

    const content = response.choices[0].message.content
    let recommendations: string[]

    try {
      const parsed = JSON.parse(content || '{}')
      recommendations = parsed.recommendations || parsed.topics || Object.values(parsed).flat()
    } catch (error) {
      // Fallback parsing if JSON format isn't perfect
      recommendations = content?.split('\n')
        .filter(line => line.trim().startsWith('"') || line.includes('-'))
        .map(line => line.replace(/^["'\-\*\d\.]+\s*/, '').replace(/["',]+$/, '').trim())
        .filter(line => line.length > 10) || []
    }

    // Ensure we have good recommendations
    if (recommendations.length < 5) {
      recommendations = generateFallbackRecommendations(surveyResponses)
    }

    // Store recommendation history if user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await storeRecommendationHistory(supabase, user.id, recommendations, surveyResponses)
      }
    }

    return new Response(
      JSON.stringify({ 
        recommendations: recommendations.slice(0, 15),
        generated: true 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error generating topics:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate personalized topics',
        recommendations: generateFallbackRecommendations({} as SurveyResponses)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  }
})

function buildUserProfile(responses: SurveyResponses): string {
  const parts = []
  
  if (responses.fieldOfInterest?.length) {
    parts.push(`Primary fields of interest: ${responses.fieldOfInterest.join(', ')}`)
  }
  
  if (responses.role) {
    parts.push(`Professional role: ${responses.role}`)
  }
  
  if (responses.topicInterests?.length) {
    parts.push(`Specific topic interests: ${responses.topicInterests.join(', ')}`)
  }
  
  if (responses.newsConsumption) {
    parts.push(`Preferred content style: ${responses.newsConsumption}`)
  }
  
  if (responses.goals?.length) {
    parts.push(`Information goals: ${responses.goals.join(', ')}`)
  }
  
  if (responses.geographicInterest) {
    parts.push(`Geographic focus: ${responses.geographicInterest}`)
  }
  
  if (responses.timeAvailability) {
    parts.push(`Reading time preference: ${responses.timeAvailability}`)
  }
  
  if (responses.preferredPerspectives?.length) {
    parts.push(`Preferred perspectives: ${responses.preferredPerspectives.join(', ')}`)
  }
  
  return parts.join('\n')
}

async function fetchTrendingTopics(braveApiKey: string): Promise<string[]> {
  try {
    const response = await fetch(
      'https://api.search.brave.com/res/v1/news/search?q=trending+today&count=10',
      {
        headers: {
          'X-Subscription-Token': braveApiKey,
          'Accept': 'application/json',
        },
      }
    )
    
    if (response.ok) {
      const data = await response.json()
      return data.results
        ?.slice(0, 5)
        .map((result: any) => result.title)
        .filter(Boolean) || []
    }
  } catch (error) {
    console.error('Error fetching trending topics:', error)
  }
  return []
}

async function storeRecommendationHistory(
  supabase: any, 
  userId: string, 
  recommendations: string[],
  surveyResponses: SurveyResponses
) {
  try {
    // Update recommendation history
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('recommendation_history')
      .eq('user_id', userId)
      .single()

    const history = prefs?.recommendation_history || []
    history.push({
      timestamp: new Date().toISOString(),
      recommendations,
      surveyResponses,
      sessionId: crypto.randomUUID()
    })

    // Keep only last 10 recommendation sessions
    const updatedHistory = history.slice(-10)

    await supabase
      .from('user_preferences')
      .update({ 
        recommendation_history: updatedHistory,
        survey_responses: surveyResponses,
        onboarding_completed: true
      })
      .eq('user_id', userId)
  } catch (error) {
    console.error('Error storing recommendation history:', error)
  }
}

function generateFallbackRecommendations(responses: SurveyResponses): string[] {
  const fallbacks: Record<string, string[]> = {
    technology: [
      'Latest developments in artificial intelligence and machine learning',
      'Cybersecurity threats and data privacy regulations 2025',
      'Tech startup funding rounds and IPO announcements',
      'Open source software trends and major project updates',
      'Cloud computing innovations and enterprise adoption'
    ],
    business: [
      'Global market analysis and economic indicators',
      'Corporate mergers and acquisitions news',
      'Supply chain disruptions and solutions',
      'Remote work policies and workplace transformation',
      'Sustainable business practices and ESG investing'
    ],
    science: [
      'Climate change research and environmental breakthroughs',
      'Space exploration missions and discoveries',
      'Medical research advances and clinical trials',
      'Renewable energy technology developments',
      'Quantum computing research progress'
    ],
    default: [
      'Breaking news in technology and innovation',
      'Global economic trends and market updates',
      'Scientific discoveries and research breakthroughs',
      'Climate action and environmental policies',
      'Healthcare advances and public health updates'
    ]
  }

  const primaryField = responses.fieldOfInterest?.[0]?.toLowerCase() || 'default'
  const fieldRecommendations = fallbacks[primaryField] || fallbacks.default
  
  // Add some topic-specific recommendations if available
  const topicSpecific: string[] = []
  if (responses.topicInterests?.includes('ai-ml')) {
    topicSpecific.push('Generative AI applications in enterprise')
  }
  if (responses.topicInterests?.includes('climate-change')) {
    topicSpecific.push('Carbon capture technology breakthroughs')
  }
  if (responses.topicInterests?.includes('cryptocurrency')) {
    topicSpecific.push('Cryptocurrency regulation updates 2025')
  }
  
  return [...topicSpecific, ...fieldRecommendations].slice(0, 10)
}