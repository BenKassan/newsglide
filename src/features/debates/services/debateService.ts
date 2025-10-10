import { supabase } from '@/integrations/supabase/client'
import { DebateHistory } from '@shared/types/api.types'
import { DEBATE_PERSONAS } from '../data/debatePersonas'
import { fetchMultiplePersonImages } from './wikipediaImageService'

export interface DebateExchange {
  speaker: string
  text: string
  tone: 'aggressive' | 'calm' | 'analytical' | 'passionate'
}

export interface DebateResponse {
  exchanges: DebateExchange[]
  summary: string
  participant1Avatar?: string
  participant2Avatar?: string
}

export interface GenerateDebateRequest {
  topic: string
  newsContext: {
    headline: string
    summaryPoints: string[]
    article: string
  }
  participant1Name: string
  participant2Name: string
}

export async function generateDebate(request: GenerateDebateRequest): Promise<DebateResponse> {
  console.log(
    'Calling debate generation for:',
    request.participant1Name,
    'vs',
    request.participant2Name
  )

  // Fetch images in parallel with debate generation
  const [debateResult, imageMap] = await Promise.all([
    supabase.functions.invoke('generate-debate', {
      body: request,
    }),
    fetchMultiplePersonImages([request.participant1Name, request.participant2Name]),
  ])

  const { data, error } = debateResult

  if (error) {
    console.error('Debate generation error:', error)
    throw new Error(error.message || 'Failed to generate debate')
  }

  if (data.error) {
    throw new Error(data.message || 'Debate generation failed')
  }

  // Attach fetched avatar URLs to response
  const debateResponse = data as DebateResponse
  debateResponse.participant1Avatar = imageMap.get(request.participant1Name) || null
  debateResponse.participant2Avatar = imageMap.get(request.participant2Name) || null

  console.log('Fetched avatars:', {
    participant1: debateResponse.participant1Avatar,
    participant2: debateResponse.participant2Avatar,
  })

  return debateResponse
}

export async function saveDebateToHistory(
  userId: string,
  topic: string,
  participant1: string,
  participant2: string,
  debateContent: DebateResponse
): Promise<void> {
  try {
    const { error } = await supabase.from('debate_history').insert({
      user_id: userId,
      topic,
      participant_1: participant1,
      participant_2: participant2,
      debate_content: debateContent,
    })

    if (error) {
      console.error('Failed to save debate:', error)
      throw error
    }
  } catch (error) {
    console.error('Error saving debate to history:', error)
    // Don't throw - we don't want to fail the whole operation if history fails
  }
}

export interface DebateHistoryItem {
  id: string
  user_id: string
  topic: string
  participant_1: string
  participant_2: string
  debate_content: DebateResponse
  created_at: string
}

export async function getDebateHistory(userId: string, limit = 10): Promise<DebateHistoryItem[]> {
  const { data, error } = await supabase
    .from('debate_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to fetch debate history:', error)
    return []
  }

  return data || []
}
