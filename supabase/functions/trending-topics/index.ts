
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache for 10-minute intervals with topic rotation
const topicCache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Major news outlets to target
const MAJOR_OUTLETS = [
  'site:cnn.com',
  'site:wsj.com', 
  'site:reuters.com',
  'site:nytimes.com',
  'site:bbc.com',
  'site:apnews.com'
];

function convertHeadlineToTopic(headline) {
  // Remove source attribution (everything after - or |)
  let topic = headline.split(/\s*[-|]\s*(?=[A-Z])[^-|]*$/)[0].trim();
  
  // Remove quotes and clean up
  topic = topic.replace(/['"]/g, '').replace(/\s+/g, ' ').trim();
  
  // Take first meaningful part (before colon if exists)
  const parts = topic.split(':');
  if (parts[0].length > 15) {
    topic = parts[0].trim();
  }
  
  // Extract key subjects and concepts for news-style titles
  topic = topic
    .replace(/^(?:breaking|exclusive|update|latest):\s*/i, '')
    .replace(/announces?\s+(?:new\s+)?/i, '')
    .replace(/according to\s+.*$/i, '')
    .replace(/reports?\s+(?:that\s+)?/i, '')
    .replace(/says?\s+(?:that\s+)?/i, '')
    .replace(/\s+amid\s+.*$/i, '')
    .replace(/\s+following\s+.*$/i, '')
    .replace(/\s+after\s+.*$/i, '');
  
  // Extract the core subject (2-4 key words)
  const words = topic.split(' ').filter(word => word.length > 0);
  let finalWords = [];
  
  for (let i = 0; i < Math.min(4, words.length); i++) {
    const word = words[i];
    // Skip common filler words but keep important ones
    if (!word.match(/^(the|a|an|is|are|was|were|has|have|will|would|could|should)$/i)) {
      finalWords.push(word);
    } else if (finalWords.length === 0 && word.match(/^(the)$/i)) {
      // Keep "the" if it's at the start and makes sense
      finalWords.push(word);
    }
  }
  
  // Ensure we have at least 2 meaningful words
  if (finalWords.length < 2 && words.length >= 2) {
    finalWords = words.slice(0, 3);
  }
  
  // Create proper title case
  const titleCase = finalWords.map((word, index) => {
    // Capitalize first word and important words
    if (index === 0 || !word.match(/^(and|or|but|for|nor|so|yet|at|by|in|of|on|to|up|as|is|are)$/i)) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    return word.toLowerCase();
  }).join(' ');
  
  return titleCase.trim();
}

async function fetchMajorOutletNews(braveApiKey) {
  const allTopics = [];
  
  // Fetch from multiple major outlets
  for (const outlet of MAJOR_OUTLETS) {
    try {
      const searchUrl = 'https://api.search.brave.com/res/v1/news/search';
      const params = new URLSearchParams({
        q: outlet,
        count: '10',
        freshness: 'pd1', // Past day
        lang: 'en'
      });

      const response = await fetch(`${searchUrl}?${params}`, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': braveApiKey
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          for (const result of data.results.slice(0, 8)) {
            const headline = result.title;
            
            if (!headline || headline.length < 25) continue;
            
            // Skip meta news content
            if (headline.match(/breaking news|live updates|top stories|news roundup/i)) {
              continue;
            }
            
            const topic = convertHeadlineToTopic(headline);
            
            // Only include substantial topics
            if (topic.length > 12 && topic.length < 50) {
              allTopics.push({
                topic,
                outlet: outlet.replace('site:', ''),
                headline: headline.substring(0, 80),
                timestamp: new Date().toISOString()
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(`Failed to fetch from ${outlet}:`, error);
    }
  }
  
  return allTopics;
}

function getCachedTopics(cacheKey, refresh = false) {
  const cached = topicCache.get(cacheKey);
  
  if (!cached || (Date.now() - cached.timestamp) > CACHE_DURATION) {
    return null; // Cache expired
  }
  
  if (refresh && cached.allTopics && cached.allTopics.length > 4) {
    // Return different topics from same batch for refresh
    const shuffled = [...cached.allTopics].sort(() => Math.random() - 0.5);
    
    // Get the last displayed topics to avoid duplicates
    const lastDisplayed = cached.lastDisplayed || [];
    let differentTopics = [];
    
    // Try to find topics that weren't displayed last time
    for (const item of shuffled) {
      if (!lastDisplayed.includes(item.topic) && differentTopics.length < 4) {
        differentTopics.push(item.topic);
      }
    }
    
    // If we don't have enough different topics, fill with any available
    if (differentTopics.length < 4) {
      for (const item of shuffled) {
        if (!differentTopics.includes(item.topic) && differentTopics.length < 4) {
          differentTopics.push(item.topic);
        }
      }
    }
    
    // Update the cache with the newly displayed topics
    cached.lastDisplayed = differentTopics;
    topicCache.set(cacheKey, cached);
    
    return {
      topics: differentTopics,
      lastUpdated: cached.lastUpdated,
      refresh: true,
      count: differentTopics.length
    };
  }
  
  return cached.response;
}

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

    // Parse request for refresh parameter
    const body = await req.json().catch(() => ({}));
    const isRefresh = body.refresh === true;
    
    console.log(`Fetching trending news... (refresh: ${isRefresh})`);

    // Check cache first
    const cacheKey = 'trending-topics';
    const cached = getCachedTopics(cacheKey, isRefresh);
    
    if (cached) {
      console.log('Returning cached topics');
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch fresh data from major outlets
    const allTopics = await fetchMajorOutletNews(BRAVE_API_KEY);
    
    console.log(`Fetched ${allTopics.length} topics from major outlets`);
    
    if (allTopics.length === 0) {
      console.log('No topics found, using fallbacks');
      return new Response(JSON.stringify({ 
        topics: [
          "Biden administration news",
          "Technology earnings",
          "Climate change policy",
          "Federal Reserve updates"
        ],
        lastUpdated: new Date().toISOString(),
        fallback: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Deduplicate and prioritize
    const uniqueTopics = [];
    const seenTopics = new Set();
    
    for (const item of allTopics) {
      const normalized = item.topic.toLowerCase();
      if (!seenTopics.has(normalized)) {
        seenTopics.add(normalized);
        uniqueTopics.push(item);
      }
    }
    
    // Take best 8 topics for rotation, show first 4
    const bestTopics = uniqueTopics.slice(0, 8);
    const displayTopics = bestTopics.slice(0, 4).map(t => t.topic);
    
    const response = {
      topics: displayTopics,
      lastUpdated: new Date().toISOString(),
      count: displayTopics.length
    };
    
    // Cache the result with all topics for rotation
    topicCache.set(cacheKey, {
      response,
      allTopics: bestTopics,
      timestamp: Date.now(),
      lastUpdated: response.lastUpdated
    });
    
    console.log('Cached fresh topics:', displayTopics);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(JSON.stringify({ 
      topics: [
        "Global news updates",
        "Technology sector",
        "Political developments", 
        "Economic indicators"
      ],
      lastUpdated: new Date().toISOString(),
      fallback: true,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
