
import { supabase } from "@/integrations/supabase/client";

export interface QnaRequest {
  question: string;
  context: any; // News data context
}

export interface QnaResponse {
  answer: string;
  tokens_used: number;
}

export async function askQuestion(request: QnaRequest): Promise<QnaResponse> {
  console.log('Calling Q&A function for question:', request.question);
  
  try {
    const { data, error } = await supabase.functions.invoke('news-qna', {
      body: {
        question: request.question,
        context: request.context
      }
    });

    if (error) {
      console.error('Q&A function error:', error);
      throw new Error(error.message || 'Failed to process question');
    }

    if (!data) {
      throw new Error('No response from Q&A service');
    }

    // Handle structured error responses
    if (data.error) {
      switch (data.code) {
        case 'RATE_LIMIT':
          throw new Error('Rate limit reached. Please wait a moment and try again.');
        case 'OPENAI':
          throw new Error('Analysis service temporarily unavailable. Please try again.');
        case 'CONFIG_ERROR':
          throw new Error('Service configuration error. Please contact support.');
        default:
          throw new Error(data.message || 'Failed to process question');
      }
    }

    return {
      answer: data.answer || 'Unable to generate response',
      tokens_used: data.tokens_used || 0
    };

  } catch (error: any) {
    console.error('Q&A service error:', error);
    throw error;
  }
}
