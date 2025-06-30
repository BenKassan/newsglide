
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

    // Search for actual breaking news with better queries
    const queries = [
      'breaking news today -"trending news" -"news updates"',
      'latest political news today',
      'technology announcements today',
      'major events happening now'
    ];
    
    const allTopics = new Set<string>();
    
    // Try multiple searches to get diverse topics
    for (const query of queries) {
      try {
        const trendingUrl = 'https://api.search.brave.com/res/v1/news/search';
        const params = new URLSearchParams({
          q: query,
          count: '5',
          freshness: 'pd1',
          lang: 'en'
        });

        const response = await fetch(`${trendingUrl}?${params}`, {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': BRAVE_API_KEY
          }
        });

        if (!response.ok) continue;

        const data = await response.json();
        
        // Extract actual news topics from headlines
        data.results?.forEach((result: any) => {
          const headline = result.title || '';
          const description = result.description || '';
          
          // Skip if it's about news itself or is a newspaper name
          const skipWords = ['news', 'update', 'trending', 'breaking', 'times', 'post', 'gazette', 'journal', 'daily'];
          const lowerHeadline = headline.toLowerCase();
          if (skipWords.some(word => lowerHeadline.split(' ').includes(word))) {
            return;
          }
          
          // Method 1: Extract names and specific events
          // Look for patterns like "X announces Y", "X's Y", "X wins/loses"
          const patterns = [
            /^(.+?)\s+(?:announces|unveils|launches|reveals|introduces|proposes)/i,
            /^(.+?)'s\s+(.+?)(?:\s+(?:bill|plan|proposal|statement|announcement))/i,
            /^(.+?)\s+(?:wins|loses|defeats|beats|surpasses)/i,
            /^(.+?)\s+(?:arrested|charged|indicted|sued|fined)/i,
            /^(.+?)\s+(?:dies|dead|killed|injured)/i,
            /^(.+?)\s+(?:up|down|rises|falls|surges|plunges)\s+\d+/i,
          ];
          
          for (const pattern of patterns) {
            const match = headline.match(pattern);
            if (match && match[1]) {
              const topic = match[1].trim();
              if (topic.length > 5 && topic.length < 40 && !topic.includes('"')) {
                allTopics.add(topic);
              }
            }
          }
          
          // Method 2: Extract quoted important terms
          const quotedTerms = headline.match(/"([^"]+)"/g);
          if (quotedTerms) {
            quotedTerms.forEach(term => {
              const cleaned = term.replace(/"/g, '').trim();
              if (cleaned.length > 5 && cleaned.length < 40) {
                allTopics.add(cleaned);
              }
            });
          }
          
          // Method 3: Use the source's focus if headline parsing fails
          if (allTopics.size < 10 && result.meta_site) {
            // Extract the main subject from description if available
            const descMatch = description.match(/^([^.!?]+)/);
            if (descMatch) {
              const firstSentence = descMatch[1];
              const subject = firstSentence.split(/\s+(?:is|are|was|were|has|have)\s+/i)[0];
              if (subject && subject.length > 10 && subject.length < 50) {
                allTopics.add(subject.trim());
              }
            }
          }
        });
      } catch (searchError) {
        console.error('Search error for query:', query, searchError);
      }
    }

    // Convert to array and clean up
    let finalTopics = Array.from(allTopics)
      .filter(topic => {
        // Final filtering
        const lower = topic.toLowerCase();
        return !lower.includes('click here') && 
               !lower.includes('read more') &&
               !lower.includes('trending') &&
               !lower.includes('breaking news') &&
               !lower.match(/^(the|a|an)\s/i) && // Remove articles at start
               topic.split(' ').length >= 2; // At least 2 words
      })
      .slice(0, 4);

    // If we still don't have good topics, use very specific fallbacks
    if (finalTopics.length < 3) {
      finalTopics = [
        "Trump policy announcement",
        "Tech industry layoffs",
        "Climate summit 2025",
        "AI regulation debate"
      ];
    }

    console.log('Extracted topics:', finalTopics);

    return new Response(JSON.stringify({ 
      topics: finalTopics,
      lastUpdated: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Trending topics error:', error);
    
    // Return specific fallback topics
    return new Response(JSON.stringify({ 
      topics: [
        "Trump administration news",
        "Tech industry updates",
        "Global climate policy",
        "Economic indicators today"
      ],
      lastUpdated: new Date().toISOString(),
      fallback: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
