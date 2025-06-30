
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

    // Search for trending news
    const trendingUrl = 'https://api.search.brave.com/res/v1/news/search';
    const params = new URLSearchParams({
      q: 'trending news today breaking',
      count: '10',
      freshness: 'pd1', // Past day
      lang: 'en'
    });

    const response = await fetch(`${trendingUrl}?${params}`, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Brave Search error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract unique topics from headlines
    const topics = new Set<string>();
    const commonWords = ['the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'is', 'it', 'as'];
    
    data.results?.forEach((result: any) => {
      // Extract potential topic phrases from headlines
      const headline = result.title;
      
      // Look for quoted phrases, company names, or key terms
      const quotedPhrases = headline.match(/"([^"]+)"/g) || [];
      const capitalizedPhrases = headline.match(/[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*/g) || [];
      
      [...quotedPhrases, ...capitalizedPhrases].forEach(phrase => {
        const cleaned = phrase.replace(/['"]/g, '').trim();
        if (cleaned.length > 3 && cleaned.length < 40 && !commonWords.includes(cleaned.toLowerCase())) {
          topics.add(cleaned);
        }
      });
    });

    // Convert to array and take top 4
    const trendingTopics = Array.from(topics)
      .slice(0, 8) // Get more than 4 to filter
      .filter(topic => {
        // Filter out generic terms
        const lower = topic.toLowerCase();
        return !lower.includes('news') && 
               !lower.includes('update') && 
               !lower.includes('breaking') &&
               topic.split(' ').length <= 4; // Max 4 words
      })
      .slice(0, 4)
      .map(topic => `${topic} news today`);

    // Fallback topics if we don't get enough
    const fallbackTopics = [
      "AI technology news",
      "Stock market today",
      "Climate change updates",
      "Tech industry news"
    ];

    const finalTopics = trendingTopics.length >= 2 
      ? trendingTopics 
      : [...trendingTopics, ...fallbackTopics].slice(0, 4);

    return new Response(JSON.stringify({ 
      topics: finalTopics,
      lastUpdated: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Trending topics error:', error);
    
    // Return fallback topics on error
    return new Response(JSON.stringify({ 
      topics: [
        "Technology news today",
        "Business news updates", 
        "World news today",
        "Science breakthroughs"
      ],
      lastUpdated: new Date().toISOString(),
      fallback: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
