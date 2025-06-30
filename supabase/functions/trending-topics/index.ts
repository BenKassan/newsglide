
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
    
    // Process headlines into clear, specific topic suggestions
    const topics = [];
    const usedTopics = new Set<string>();

    if (data.results && data.results.length > 0) {
      // Shuffle results to get variety on refresh
      const shuffled = data.results.sort(() => Math.random() - 0.5);
      
      for (const result of shuffled) {
        if (topics.length >= 12) break; // Get more for better selection
        
        let headline = result.title || '';
        
        // Skip generic or unclear headlines
        if (headline.match(/live updates|breaking news|top stories|developing story/i) ||
            headline.length < 15) {
          continue;
        }
        
        // Extract clear, specific topics
        let topic = '';
        
        // Pattern 1: Extract person/entity + key action/issue
        // e.g., "Trump threatens tariffs" -> "Trump tariffs"
        const patterns = [
          // Person/Entity + action
          /^([A-Z][a-z]+(?: [A-Z][a-z]+)?)\s+(?:threatens?|announces?|faces?|wins?|loses?|plans?|proposes?|unveils?)\s+(.+?)(?:\s|$)/i,
          // Country/Company + issue
          /^((?:Canada|China|US|UK|EU|Apple|Google|Microsoft|Tesla|Meta|Amazon))\s+(.+?)(?:\s+(?:in|at|with|for)|$)/i,
          // Specific event/issue with context
          /^(.+?)\s+(?:trial|hearing|vote|election|deal|merger|lawsuit|investigation)\s+(?:for|of|in)\s+(.+)/i,
        ];
        
        for (const pattern of patterns) {
          const match = headline.match(pattern);
          if (match) {
            const entity = match[1].trim();
            const action = match[2].trim()
              .replace(/\b(?:the|a|an|to|in|at|on|for|with)\b/gi, '')
              .split(' ').slice(0, 2).join(' '); // Keep it short
            
            topic = `${entity} ${action}`;
            break;
          }
        }
        
        // Pattern 2: If no pattern matches, extract key proper nouns + context
        if (!topic) {
          // Look for capitalized entities (companies, people, places)
          const entities = headline.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
          const keyWords = headline.toLowerCase().match(/\b(?:scandal|crisis|deal|merger|election|trial|investigation|announcement|policy|tax|tariff|climate|ai|tech)\b/g) || [];
          
          if (entities.length > 0 && keyWords.length > 0) {
            topic = `${entities[0]} ${keyWords[0]}`;
          }
        }
        
        // Validate and clean up the topic
        if (topic) {
          topic = topic.trim()
            .replace(/\s+/g, ' ') // Remove extra spaces
            .replace(/[^\w\s]/g, '') // Remove special characters
            .substring(0, 25); // Max length
          
          // Ensure it's meaningful and not too short
          if (topic.split(' ').length >= 2 && topic.length > 10) {
            // Make sure it's clear what the topic is about
            const clarityWords = topic.toLowerCase().split(' ');
            const hasSubject = clarityWords.some(w => w.length > 3);
            const hasContext = clarityWords.length >= 2;
            
            if (hasSubject && hasContext && !usedTopics.has(topic.toLowerCase())) {
              topics.push(topic);
              usedTopics.add(topic.toLowerCase());
            }
          }
        }
      }
    }

    // If we still don't have enough good topics, add some clear current event examples
    const clearFallbacks = [
      "Trump tariff policy",
      "OpenAI GPT updates",
      "Climate summit 2025",
      "Tech layoffs 2025",
      "Fed interest rates",
      "Gaza ceasefire talks"
    ];

    // Mix in fallbacks if needed
    while (topics.length < 4 && clearFallbacks.length > 0) {
      topics.push(clearFallbacks.shift());
    }

    // Return random 4 from our collection for variety on refresh
    const selectedTopics = topics
      .filter(t => t && t.trim().length > 10) // Final validation
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);

    console.log('Generated clear topics:', selectedTopics);

    // If we couldn't extract enough good topics, try a different approach
    if (selectedTopics.length < 3) {
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
          if (selectedTopics.length >= 4) return;
          
          let headline = result.title || '';
          // Clean up as before
          headline = headline.replace(/\s*[-–—|]\s*[A-Z][A-Za-z\s&]+$/, '');
          headline = headline.replace(/\s*[-–—]\s*\w+\s+\d{1,2},?\s+\d{4}/, '');
          
          if (headline.length > 15 && headline.length < 60) {
            selectedTopics.push(headline);
          }
        });
      }
    }

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
