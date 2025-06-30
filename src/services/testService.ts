
import { SynthesisRequest } from "@/types/news";
import { synthesizeNews } from "./newsSynthesis";

export async function testCurrentNewsSynthesis(): Promise<void> {
  const testRequest: SynthesisRequest = {
    topic: 'artificial intelligence news today 2025',
    targetOutlets: [
      { name: 'Reuters', type: 'News Agency' },
      { name: 'CNN', type: 'Broadcast Media' },
      { name: 'TechCrunch', type: 'Online Media' },
      { name: 'The New York Times', type: 'National Newspaper' }
    ],
    freshnessHorizonHours: 48,
    targetWordCount: 1000
  };

  try {
    console.log('Testing synthesis with current news request:', testRequest);
    const result = await synthesizeNews(testRequest);
    console.log('Test successful!');
    console.log('Found sources:', result.sources.map(s => ({
      outlet: s.outlet,
      publishedAt: s.publishedAt,
      headline: s.headline.substring(0, 80) + '...'
    })));
    console.log('Topic hottness:', result.topicHottness);
    console.log('Summary points:', result.summaryPoints);
  } catch (error) {
    console.error('Test failed:', error);
  }
}
