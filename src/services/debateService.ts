import { supabase } from "@/integrations/supabase/client";

export interface DebateExchange {
  speaker: string;
  text: string;
  tone: 'aggressive' | 'calm' | 'analytical' | 'passionate';
}

export interface DebateResponse {
  exchanges: DebateExchange[];
  summary: string;
}

export interface GenerateDebateRequest {
  topic: string;
  newsContext: {
    headline: string;
    summaryPoints: string[];
    article: string;
  };
  participant1Id: string;
  participant2Id: string;
}

export async function generateDebate(
  request: GenerateDebateRequest
): Promise<DebateResponse> {
  console.log('Calling debate generation for:', request.participant1Id, 'vs', request.participant2Id);
  
  const { data, error } = await supabase.functions.invoke('generate-debate', {
    body: request
  });

  if (error) {
    console.error('Debate generation error:', error);
    throw new Error(error.message || 'Failed to generate debate');
  }

  if (data.error) {
    throw new Error(data.message || 'Debate generation failed');
  }

  return data as DebateResponse;
}

export async function saveDebateToHistory(
  userId: string,
  topic: string,
  participant1: string,
  participant2: string,
  debateContent: DebateResponse
): Promise<void> {
  try {
    const { error } = await supabase
      .from('debate_history')
      .insert({
        user_id: userId,
        topic,
        participant_1: participant1,
        participant_2: participant2,
        debate_content: debateContent
      });

    if (error) {
      console.error('Failed to save debate:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error saving debate to history:', error);
    // Don't throw - we don't want to fail the whole operation if history fails
  }
}

export async function getDebateHistory(userId: string, limit = 10): Promise<any[]> {
  const { data, error } = await supabase
    .from('debate_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch debate history:', error);
    return [];
  }

  return data || [];
}