
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
      console.error('NO BRAVE API KEY');
      throw new Error('Brave Search API key not configured');
    }

    console.log('Fetching trending news...');

    // Simple search for current news
    const searchUrl = 'https://api.search.brave.com/res/v1/news/search';
    const params = new URLSearchParams({
      q: 'latest', // Very simple query
      count: '15',
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
      console.error('Brave API error:', response.status);
      throw new Error(`Brave API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Got ${data.results?.length || 0} results`);
    
    // Super simple extraction - just clean up headlines
    const topics = [];
    
    if (data.results && data.results.length > 0) {
      for (let i = 0; i < Math.min(15, data.results.length); i++) {
        const result = data.results[i];
        let headline = result.title || '';
        
        // Skip if too short or is about news itself
        if (headline.length < 20 || 
            headline.match(/news update|top stories|live updates|breaking news/i)) {
          continue;
        }
        
        // Remove source (everything after - or |)
        headline = headline.split(/\s*[-|]\s*(?=[A-Z])[^-|]*$/)[0].trim();
        
        // Take first meaningful part (before colon/dash if exists)
        const parts = headline.split(/[:;]/);
        if (parts[0].length > 15) {
          headline = parts[0].trim();
        }
        
        // Shorten if too long - take first few words
        const words = headline.split(' ');
        if (words.length > 5) {
          headline = words.slice(0, 4).join(' ');
        }
        
        // Clean up
        headline = headline
          .replace(/['"]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        // Add if it's decent
        if (headline.length > 10 && headline.length < 40) {
          topics.push(headline);
        }
      }
    }

    console.log('Extracted topics:', topics);

    // Deduplicate
    const uniqueTopics = [...new Set(topics)];
    
    // If we have less than 4, that's OK - don't force fallbacks
    const finalTopics = uniqueTopics.slice(0, 4);
    
    // Only use fallbacks if we have ZERO topics
    if (finalTopics.length === 0) {
      console.log('No topics extracted, using fallbacks');
      return new Response(JSON.stringify({ 
        topics: [
          "Trump administration",
          "Tech industry news",
          "Climate policy 2025",
          "Global economy today"
        ],
        lastUpdated: new Date().toISOString(),
        fallback: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      topics: finalTopics,
      lastUpdated: new Date().toISOString(),
      count: finalTopics.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(JSON.stringify({ 
      topics: [
        "World news today",
        "Technology updates",
        "Political news",
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
