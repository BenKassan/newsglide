
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');
    
    if (!BRAVE_API_KEY) {
      throw new Error('Brave Search API key not configured');
    }

    // Get top news stories right now
    const searchUrl = 'https://api.search.brave.com/res/v1/news/search';
    const params = new URLSearchParams({
      q: 'breaking news', // Simple query
      count: '20', // Get more to have better selection
      freshness: 'pd1',
      lang: 'en'
    });

    const response = await fetch(`${searchUrl}?${params}`, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Brave Search error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Found ${data.results?.length || 0} news results`);
    
    // Simply take the most interesting headlines and clean them up
    const topics = [];
    
    if (data.results && data.results.length > 0) {
      for (const result of data.results) {
        if (topics.length >= 4) break;
        
        let headline = result.title || '';
        
        // Skip meta headlines about news itself
        if (headline.toLowerCase().includes('news roundup') ||
            headline.toLowerCase().includes('news update') ||
            headline.toLowerCase().includes('top stories') ||
            headline.toLowerCase().includes('headlines')) {
          continue;
        }
        
        // Remove source attribution (e.g., " - CNN", " | Reuters")
        headline = headline.replace(/\s*[-–—|]\s*[A-Z][A-Za-z\s&]+$/, '');
        
        // Remove date references
        headline = headline.replace(/\s*[-–—]\s*\w+\s+\d{1,2},?\s+\d{4}/, '');
        
        // Take the main subject (before colon if exists)
        if (headline.includes(':')) {
          const beforeColon = headline.split(':')[0].trim();
          if (beforeColon.length > 15) {
            headline = beforeColon;
          }
        }
        
        // Ensure it's substantial
        if (headline.length > 15 && headline.length < 60) {
          topics.push(headline);
        }
      }
    }

    // If we couldn't extract enough good topics, try a different approach
    if (topics.length < 3) {
      console.log('First attempt failed, trying alternative search');
      
      // Try searching for specific current events
      const altParams = new URLSearchParams({
        q: '"announces" OR "unveils" OR "launches" -news -update',
        count: '10',
        freshness: 'pd1',
        lang: 'en'
      });

      const altResponse = await fetch(`${searchUrl}?${altParams}`, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': BRAVE_API_KEY
        }
      });

      if (altResponse.ok) {
        const altData = await altResponse.json();
        
        altData.results?.forEach((result: any) => {
          if (topics.length >= 4) return;
          
          let headline = result.title || '';
          // Clean up as before
          headline = headline.replace(/\s*[-–—|]\s*[A-Z][A-Za-z\s&]+$/, '');
          headline = headline.replace(/\s*[-–—]\s*\w+\s+\d{1,2},?\s+\d{4}/, '');
          
          if (headline.length > 15 && headline.length < 60) {
            topics.push(headline);
          }
        });
      }
    }

    console.log('Final extracted topics:', topics);

    // Only use generic fallbacks if we have NO topics
    const finalTopics = topics.length > 0 ? topics : [
      "Search for any current topic",
      "Latest technology news",
      "Today's political updates", 
      "Recent business developments"
    ];

    return new Response(JSON.stringify({ 
      topics: finalTopics,
      lastUpdated: new Date().toISOString(),
      count: finalTopics.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Trending topics error:', error);
    
    return new Response(JSON.stringify({ 
      topics: [
        "Latest world news",
        "Technology updates", 
        "Political developments",
        "Business headlines"
      ],
      lastUpdated: new Date().toISOString(),
      fallback: true,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
