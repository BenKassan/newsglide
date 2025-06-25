
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface SearchResult {
  title: string;
  url: string;
  outlet: string;
  publishedAt: string;
  content: string;
}

export async function searchOutlets(
  topic: string,
  domains: string[],
  perOutlet = 3
): Promise<Record<string, SearchResult[]>> {
  const apiKey = localStorage.getItem('search_api_key') || process.env.SEARCH_API_KEY;
  if (!apiKey) {
    console.warn('Search API key not configured for outlet search');
    return {};
  }

  const all: Record<string, SearchResult[]> = {};

  for (const domain of domains) {
    try {
      console.log(`Searching ${domain} for: ${topic}`);
      
      const url = `https://serpapi.com/search.json?engine=google_news&tbm=nws&hl=en&gl=us&q=${encodeURIComponent(`${topic} site:${domain}`)}&num=${perOutlet}&api_key=${apiKey}`;
      
      const resp = await fetch(url);
      const data = await resp.json();
      const hits = (data.news_results || []).slice(0, perOutlet);

      all[domain] = await Promise.all(
        hits.map(async (n: any) => {
          try {
            // Attempt to fetch and parse content
            const response = await fetch(n.link, { 
              signal: AbortSignal.timeout(10000),
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            const html = await response.text();
            const dom = new JSDOM(html, { url: n.link });
            const parsed = new Readability(dom.window.document).parse();
            
            return {
              title: n.title || '',
              url: n.link || '',
              outlet: n.source || domain,
              publishedAt: n.date || new Date().toISOString(),
              content: (parsed?.textContent || n.snippet || '').slice(0, 5000)
            };
          } catch (error) {
            // Fallback to snippet if content parsing fails
            console.warn(`Failed to parse content for ${n.link}:`, error);
            return {
              title: n.title || '',
              url: n.link || '',
              outlet: n.source || domain,
              publishedAt: n.date || new Date().toISOString(),
              content: (n.snippet || '').slice(0, 1000)
            };
          }
        })
      ).then(results => results.filter(Boolean));
      
      console.log(`Found ${all[domain].length} articles from ${domain}`);
    } catch (error) {
      console.error(`Error searching ${domain}:`, error);
      all[domain] = [];
    }
  }
  
  return all;
}
