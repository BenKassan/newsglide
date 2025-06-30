
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
    console.log('Brave Search results count:', data.results?.length || 0);
    
    // Extract topics more reliably
    const topics = new Set<string>();

    data.results?.slice(0, 10).forEach((result: any) => {
      const headline = result.title || '';
      console.log('Processing headline:', headline);
      
      // Method 1: Look for proper nouns (2-4 consecutive capitalized words)
      const properNouns = headline.match(/(?:[A-Z][a-z]+ ){1,3}[A-Z][a-z]+/g) || [];
      
      // Method 2: Extract company/person names before common words
      const beforeKeywords = headline.match(/(.+?)(?:\s+(?:says|announces|launches|reveals|reports|faces|wins|loses))/i);
      
      // Method 3: Get first significant phrase
      const firstPhrase = headline.split(/[,\-–—:]/)[0].trim();
      
      // Add extracted topics
      properNouns.forEach(noun => {
        if (noun.length > 5 && noun.length < 30) {
          topics.add(noun.trim());
        }
      });
      
      if (beforeKeywords && beforeKeywords[1]) {
        const topic = beforeKeywords[1].trim();
        if (topic.length > 5 && topic.length < 30) {
          topics.add(topic);
        }
      }
      
      // Use headline segments as last resort
      if (topics.size < 4 && firstPhrase.length > 5 && firstPhrase.length < 40) {
        topics.add(firstPhrase);
      }
    });

    // If we still don't have enough, use simplified headlines
    if (topics.size < 4) {
      data.results?.slice(0, 4).forEach((result: any) => {
        const simplified = result.title
          .replace(/['"]/g, '')
          .replace(/\s*[-–—:].*/g, '') // Remove everything after dash/colon
          .trim();
        if (simplified.length > 10 && simplified.length < 40) {
          topics.add(simplified);
        }
      });
    }

    const trendingTopics = Array.from(topics)
      .slice(0, 4)
      .map(topic => {
        // Don't add "news today" if it already contains news-related words
        const lower = topic.toLowerCase();
        if (lower.includes('news') || lower.includes('update') || lower.includes('report')) {
          return topic;
        }
        return topic;
      });

    console.log('Extracted topics:', trendingTopics);

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

    console.log('Final topics:', finalTopics);

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
