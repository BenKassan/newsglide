import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
};

// Track previously shown topics across requests (in-memory for this session)
interface RecentTopicsEntry {
  topics: Set<string>;
  lastAccessed: number;
}

const recentTopicsCache = new Map<string, RecentTopicsEntry>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Try to get from environment first, fallback to hardcoded for edge function
    const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY') || 'BSAyaUfUcyWgy1wwaHVRG8ZLEc2442z';
    
    if (!BRAVE_API_KEY) {
      console.error('NO BRAVE API KEY');
      throw new Error('Brave Search API key not configured');
    }

    // Get session ID from headers or generate one
    const sessionId = req.headers.get('x-session-id') || 'default';
    
    // Clean up old cache entries
    const keysToDelete: string[] = [];
    recentTopicsCache.forEach((value, key) => {
      if (Date.now() - value.lastAccessed > CACHE_DURATION) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => recentTopicsCache.delete(key));
    
    // Get or create recent topics set for this session
    let recentTopics = recentTopicsCache.get(sessionId);
    if (!recentTopics) {
      recentTopics = { topics: new Set<string>(), lastAccessed: Date.now() };
      recentTopicsCache.set(sessionId, recentTopics);
    }
    recentTopics.lastAccessed = Date.now();

    console.log('Fetching trending news...');

    // Define news categories with specific, newsworthy search patterns
    const categories = [
      { 
        name: 'politics', 
        queries: ['election results', 'legislation passed', 'presidential announcement', 'congressional vote', 'policy change', 'political scandal'] 
      },
      { 
        name: 'technology', 
        queries: ['tech company layoffs', 'product launch announcement', 'AI breakthrough', 'cybersecurity breach', 'startup funding', 'tech merger'] 
      },
      { 
        name: 'business', 
        queries: ['earnings report surprise', 'CEO resignation', 'merger acquisition', 'IPO announcement', 'bankruptcy filing', 'market crash rally'] 
      },
      { 
        name: 'world', 
        queries: ['summit meeting', 'natural disaster', 'international conflict', 'peace agreement', 'refugee crisis', 'diplomatic breakthrough'] 
      },
      { 
        name: 'science', 
        queries: ['scientific discovery', 'space mission launch', 'medical breakthrough', 'climate report', 'archaeological find', 'Nobel prize'] 
      },
      { 
        name: 'health', 
        queries: ['vaccine approval', 'disease outbreak', 'FDA drug approval', 'medical study results', 'healthcare policy', 'hospital crisis'] 
      },
      { 
        name: 'sports', 
        queries: ['championship game', 'player trade', 'sports injury', 'record broken', 'tournament results', 'coaching change'] 
      },
      { 
        name: 'entertainment', 
        queries: ['movie premiere', 'award winner', 'celebrity scandal', 'album release', 'festival announcement', 'streaming record'] 
      }
    ];

    // Shuffle categories for randomness
    const shuffledCategories = [...categories].sort(() => Math.random() - 0.5);
    
    // Select 4 different categories (one per suggestion)
    const selectedCategories = shuffledCategories.slice(0, 4);

    // Collect topics from multiple searches
    const allTopics = [];
    const seenTopicTypes = new Set<string>();
    
    for (const category of selectedCategories) {
      // Pick a random query from this category
      const randomQuery = category.queries[Math.floor(Math.random() * category.queries.length)];
      const timeQualifier = Math.random() > 0.5 ? 'today' : 'breaking';
      
      const searchUrl = 'https://api.search.brave.com/res/v1/news/search';
      const params = new URLSearchParams({
        q: `${randomQuery} ${timeQualifier}`,
        count: '15',
        freshness: 'pd1',
        lang: 'en'
      });

      try {
        const response = await fetch(`${searchUrl}?${params}`, {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': BRAVE_API_KEY
          }
        });

        if (!response.ok) {
          console.error(`Brave API error for ${category.name}:`, response.status);
          continue;
        }

        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          // Process each result
          for (const result of data.results) {
            const processed = processHeadline(result.title || '', result.description || '');
            if (processed && !isDuplicateTopic(processed, seenTopicTypes, recentTopics.topics)) {
              allTopics.push({
                title: processed.title,
                category: category.name,
                score: result.score || 0,
                topicType: processed.topicType
              });
              seenTopicTypes.add(processed.topicType);
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching ${category.name} news:`, error);
      }
    }

    // Select the best topics ensuring diversity
    const selectedTopics = selectBestTopics(allTopics, recentTopics.topics);
    
    // Add selected topics to recent cache
    selectedTopics.forEach(topic => {
      recentTopics.topics.add(topic.toLowerCase());
    });
    
    // Clean up cache if it gets too large
    if (recentTopics.topics.size > 100) {
      const topicsArray = Array.from(recentTopics.topics);
      recentTopics.topics = new Set(topicsArray.slice(-50));
    }

    console.log('Selected topics:', selectedTopics);

    return new Response(JSON.stringify({ 
      topics: selectedTopics,
      lastUpdated: new Date().toISOString(),
      sessionId: sessionId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    
    // Use more specific fallbacks based on time of day
    const hour = new Date().getHours();
    const timeBasedFallbacks = hour < 12 ? [
      "Morning Market Rally",
      "Tech Earnings Beat",
      "Senate Passes New Bill",
      "NASA Launch Today"
    ] : hour < 17 ? [
      "Afternoon Trading Surge",
      "Breaking: CEO Steps Down",
      "UN Climate Summit",
      "MLB Trade Deadline"
    ] : [
      "Evening: Election Results",
      "Netflix Hits Record",
      "Fed Rate Decision",
      "NBA Finals Tonight"
    ];
    
    return new Response(JSON.stringify({ 
      topics: timeBasedFallbacks,
      lastUpdated: new Date().toISOString(),
      fallback: true,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function processHeadline(headline: string, description: string): {title: string, topicType: string} | null {
  if (!headline || headline.length < 10) return null;
  
  // Skip website metadata patterns
  const metadataPatterns = [
    /^(latest|today'?s?|daily|live)\s+(news|updates?|headlines?|stories|coverage)$/i,
    /news\s*((&|and)\s*updates?)?$/i,
    /^\w+\s+news\s+for\s+\w+\s+\d+/i, // "Stock Market News for July 7"
    /^(realtime|real-time)\s+\w+\s+news/i,
    /^\w+\s+(news|market)\s*,\s*(realtime|quotes|charts)/i,
    /^the\s+in\s+/i, // "The in Financial"
    /^(financial|market|business)\s*,?\s*$/i // Single words or with trailing comma
  ];
  
  for (const pattern of metadataPatterns) {
    if (pattern.test(headline.trim())) {
      return null;
    }
  }
  
  let processed = headline;
  
  // Try to extract actual news from the title
  // First, remove news site prefixes
  processed = processed
    .replace(/^(Reuters|BBC|CNN|Fox|NBC|ABC|CBS|NPR|WSJ|Bloomberg|CNBC|Forbes|AP|UPI)\s*[-:|]\s*/i, '')
    .replace(/[-|]\s*(Reuters|BBC|CNN|Fox|NBC|ABC|CBS|NPR|WSJ|Bloomberg|CNBC|Forbes|AP|UPI)\s*$/i, '')
    .trim();
  
  // If we have a colon or dash, check if what comes after is more specific
  if (processed.includes(':') || processed.includes(' - ')) {
    const colonParts = processed.split(/[:-]/);
    if (colonParts.length >= 2) {
      const before = colonParts[0].trim();
      const after = colonParts.slice(1).join(':').trim();
      
      // If the after part looks like actual news (has a verb, specific info), use it
      if (after.length > 15 && hasNewsValue(after)) {
        processed = after;
      } else if (hasNewsValue(before)) {
        processed = before;
      }
    }
  }
  
  // Clean up but preserve important details
  processed = processed
    .replace(/\s*\|.*$/, '') // Remove everything after pipe
    .replace(/['"]/g, '') // Remove quotes
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/[.,;!?]+$/, '') // Remove trailing punctuation
    .trim();
  
  // Skip if too short or still looks like metadata
  if (processed.length < 15 || !hasNewsValue(processed)) {
    // Try to use description if available
    if (description && description.length > 20) {
      const descFirst = description.split(/[.!?]/)[0].trim();
      if (descFirst.length >= 15 && descFirst.length <= 60 && hasNewsValue(descFirst)) {
        processed = descFirst;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
  
  // Ensure proper length (20-45 chars for button display)
  if (processed.length > 45) {
    // Try to cut at natural break points
    const breakWords = [' as ', ' after ', ' amid ', ' over ', ' for ', ' with ', ' in ', ' on ', ' at '];
    let shortened = processed;
    
    for (const breakWord of breakWords) {
      const index = processed.toLowerCase().indexOf(breakWord);
      if (index > 20 && index < 40) {
        shortened = processed.substring(0, index);
        break;
      }
    }
    
    // If still too long, truncate at word boundary
    if (shortened.length > 45) {
      const words = shortened.split(' ');
      let result = '';
      for (const word of words) {
        if (result.length + word.length + 1 > 42) break;
        result += (result ? ' ' : '') + word;
      }
      shortened = result;
    }
    
    processed = shortened;
  }
  
  // Final cleanup
  processed = processed.trim();
  
  // Ensure it doesn't end with incomplete words
  const lastWord = processed.split(' ').pop()?.toLowerCase() || '';
  if (['to', 'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'for', 'in', 'on'].includes(lastWord) && processed.split(' ').length > 2) {
    processed = processed.split(' ').slice(0, -1).join(' ');
  }
  
  // Extract topic type for diversity checking
  const topicType = extractTopicType(processed);
  
  // Ensure proper capitalization
  processed = toTitleCase(processed);
  
  return processed.length >= 15 && processed.length <= 45 ? { title: processed, topicType } : null;
}

function hasNewsValue(text: string): boolean {
  // Check if text contains action words or specific information that indicates news
  const newsIndicators = [
    /\b(announces?|launch|launches|unveils?|reports?|signs?|passes|approves?|wins?|loses?|rises?|falls?|surges?|crashes?|breaks?|sets?|hits?|reaches?|records?|reveals?|discovers?|finds?|warns?|bans?|blocks?|sues?|files?|opens?|closes?|buys?|sells?|acquires?|merges?|resigns?|appoints?|elects?|defeats?|leads?|trails?|scores?|beats?|misses?)\b/i,
    /\b(up|down)\s+\d+%?\b/i, // "up 5%", "down 10"
    /\b\d+\s*(million|billion|thousand|hundred)\b/i, // numbers indicating scale
    /\b(CEO|president|minister|director|chief|leader|star|champion)\b/i, // notable people
    /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|today|yesterday|tomorrow)\b/i // time indicators
  ];
  
  return newsIndicators.some(pattern => pattern.test(text));
}

function extractTopicType(text: string): string {
  // Extract key topic indicators for diversity checking
  const lower = text.toLowerCase();
  
  // Look for key topic words
  const topicPatterns = [
    { pattern: /\b(stock|market|dow|nasdaq|s&p|trading|shares?|equity|equities)\b/i, type: 'stock_market' },
    { pattern: /\b(earnings?|revenue|profit|quarterly|results?|beat|miss)\b/i, type: 'earnings' },
    { pattern: /\b(election|vote|voting|campaign|candidate|poll)\b/i, type: 'election' },
    { pattern: /\b(covid|vaccine|pandemic|virus|outbreak)\b/i, type: 'pandemic' },
    { pattern: /\b(war|conflict|military|troops|invasion|peace)\b/i, type: 'conflict' },
    { pattern: /\b(climate|warming|carbon|emissions|renewable)\b/i, type: 'climate' },
    { pattern: /\b(ai|artificial intelligence|chatgpt|machine learning)\b/i, type: 'ai' },
    { pattern: /\b(layoff|jobs?|employment|hiring|fired)\b/i, type: 'employment' },
    { pattern: /\b(merger|acquisition|acquire|takeover|deal)\b/i, type: 'merger' },
    { pattern: /\b(crypto|bitcoin|ethereum|blockchain)\b/i, type: 'crypto' }
  ];
  
  for (const { pattern, type } of topicPatterns) {
    if (pattern.test(lower)) {
      return type;
    }
  }
  
  // If no specific pattern matches, use first significant word
  const words = lower.split(' ').filter(w => w.length > 3 && !['with', 'after', 'before', 'over'].includes(w));
  return words[0] || 'general';
}

function isDuplicateTopic(processed: {title: string, topicType: string}, seenTypes: Set<string>, recentTopics: Set<string>): boolean {
  // Check if we already have this topic type
  if (seenTypes.has(processed.topicType)) {
    return true;
  }
  
  // Check if too similar to recent topics
  const lower = processed.title.toLowerCase();
  for (const recent of recentTopics) {
    if (areSimilarTopics(lower, recent)) {
      return true;
    }
  }
  
  return false;
}

function toTitleCase(str: string): string {
  const smallWords = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
  
  return str.split(' ').map((word, index) => {
    // Always capitalize first word
    if (index === 0 || word.length === 0) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    
    // Keep acronyms (all caps words of 2-5 letters)
    if (word.length >= 2 && word.length <= 5 && word === word.toUpperCase()) {
      return word;
    }
    
    // Keep numbers as-is
    if (/^\d/.test(word)) {
      return word;
    }
    
    // Don't capitalize small words unless they're first
    if (smallWords.has(word.toLowerCase())) {
      return word.toLowerCase();
    }
    
    // Capitalize first letter, lowercase rest
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

function selectBestTopics(topics: Array<{title: string, category: string, score: number, topicType: string}>, recentTopics: Set<string>): string[] {
  // Group by category to ensure one from each
  const byCategory = new Map<string, typeof topics>();
  
  topics.forEach(topic => {
    if (!byCategory.has(topic.category)) {
      byCategory.set(topic.category, []);
    }
    byCategory.get(topic.category)!.push(topic);
  });
  
  const selected: string[] = [];
  const usedTopicTypes = new Set<string>();
  
  // Get best topic from each category
  for (const [category, categoryTopics] of byCategory) {
    if (selected.length >= 4) break;
    
    // Sort by score and filter by topic type diversity
    const available = categoryTopics
      .filter(t => !usedTopicTypes.has(t.topicType))
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    
    if (available.length > 0) {
      selected.push(available[0].title);
      usedTopicTypes.add(available[0].topicType);
    }
  }
  
  // If we couldn't get 4 different topics, add best remaining
  if (selected.length < 4) {
    const remaining = topics
      .filter(t => !selected.includes(t.title))
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    
    for (const topic of remaining) {
      if (selected.length >= 4) break;
      selected.push(topic.title);
    }
  }
  
  return selected.slice(0, 4);
}

function areSimilarTopics(topic1: string, topic2: string): boolean {
  // Extract key words (longer than 4 chars, not common words)
  const commonWords = new Set(['about', 'after', 'against', 'before', 'between', 'during', 'under', 'through', 'with', 'from']);
  
  const getKeyWords = (text: string) => {
    return text.split(/\s+/)
      .filter(word => word.length > 4 && !commonWords.has(word))
      .map(word => word.replace(/[^a-z0-9]/g, ''));
  };
  
  const words1 = new Set(getKeyWords(topic1));
  const words2 = new Set(getKeyWords(topic2));
  
  // Count common key words
  let common = 0;
  for (const word of words1) {
    if (words2.has(word)) common++;
  }
  
  // If more than 1 key word in common, consider similar
  return common >= 2;
}