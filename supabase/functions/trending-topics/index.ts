
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
    
    // Process headlines into short topic suggestions
    const topics = [];
    const usedTopics = new Set<string>();

    if (data.results && data.results.length > 0) {
      // Shuffle results to get variety on refresh
      const shuffled = data.results.sort(() => Math.random() - 0.5);
      
      for (const result of shuffled) {
        if (topics.length >= 8) break; // Get more for variety
        
        let headline = result.title || '';
        
        // Skip weird or confusing headlines
        if (headline.match(/PORKY|PIGGY|WEIRD|BIZARRE/i) ||
            headline.length < 10) {
          continue;
        }
        
        // Extract the key topic (2-3 words max)
        let shortTopic = '';
        
        // Pattern 1: Person's name + key action
        const personMatch = headline.match(/^([A-Z][a-z]+(?: [A-Z][a-z]+)?)'?s?\s+(\w+)/);
        if (personMatch) {
          shortTopic = `${personMatch[1]} ${personMatch[2]}`;
        }
        
        // Pattern 2: Key subject before verb
        if (!shortTopic) {
          const subjectMatch = headline.match(/^([A-Z][A-Za-z]+(?: [A-Z][a-z]+)?)\s+(?:announces|launches|faces|wins|loses|plans|threatens|slows|rises|falls)/i);
          if (subjectMatch) {
            shortTopic = subjectMatch[1];
          }
        }
        
        // Pattern 3: Extract main noun phrases
        if (!shortTopic) {
          // Remove common words and take first 2-3 significant words
          const words = headline
            .replace(/\b(?:the|a|an|of|to|in|for|on|at|by|with|from)\b/gi, '')
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .trim()
            .split(/\s+/)
            .filter(word => word.length > 2);
          
          if (words.length >= 2) {
            shortTopic = words.slice(0, 2).join(' ');
          }
        }
        
        // Clean up and validate
        if (shortTopic) {
          shortTopic = shortTopic.trim();
          
          // Make sure it's not too long or too short
          if (shortTopic.length > 8 && shortTopic.length < 25) {
            // Avoid duplicates
            if (!usedTopics.has(shortTopic.toLowerCase())) {
              topics.push(shortTopic);
              usedTopics.add(shortTopic.toLowerCase());
            }
          }
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
          if (topics.length >= 8) return;
          
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

    // Return random 4 from our collection for variety on refresh
    const selectedTopics = topics.sort(() => Math.random() - 0.5).slice(0, 4);

    console.log('Generated short topics:', selectedTopics);

    // Only use generic fallbacks if we have NO topics
    const finalTopics = selectedTopics.length > 0 ? selectedTopics : [
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
