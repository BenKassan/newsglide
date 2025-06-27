
import { SynthesisRequest, NewsData } from '@/pages/Index';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function synthesizeNews(request: SynthesisRequest): Promise<NewsData> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/synthesize-news`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
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
