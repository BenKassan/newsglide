
import { SynthesisRequest, NewsData } from '@/pages/Index';
import { supabase } from '@/integrations/supabase/client';

export async function synthesizeNews(request: SynthesisRequest): Promise<NewsData> {
  try {
    const { data, error } = await supabase.functions.invoke('synthesize-news', {
      body: request,
    });

    if (error) {
      throw new Error(error.message || 'Failed to synthesize news');
    }

    return data;
  } catch (error) {
    console.error('News synthesis error:', error);
    
    // Return error response in expected format
    return {
      topic: request.topic,
      headline: `Unable to fetch current news for "${request.topic}"`,
      generatedAtUTC: new Date().toISOString(),
      confidenceLevel: 'Low',
      topicHottness: 'Low',
      summaryPoints: [
        'Failed to retrieve news articles',
        error instanceof Error ? error.message : 'Unknown error',
        'Please try again or contact support'
      ],
      sourceAnalysis: {
        narrativeConsistency: { score: 0, label: 'Error' },
        publicInterest: { score: 0, label: 'Error' }
      },
      disagreements: [],
      article: {
        base: 'Unable to generate article due to error.',
        eli5: 'Something went wrong.',
        middleSchool: 'An error occurred.',
        highSchool: 'The system encountered an error.',
        undergrad: 'System error during processing.',
        phd: 'Critical system failure.'
      },
      keyQuestions: [
        'Is the service available?',
        'Should we retry with different parameters?',
        'Is this a temporary issue?'
      ],
      sources: [],
      missingSources: request.targetOutlets.map(o => o.name)
    };
  }
}
