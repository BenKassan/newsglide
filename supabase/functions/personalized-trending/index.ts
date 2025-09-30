import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import OpenAI from 'https://esm.sh/openai@4.20.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      throw new Error('User ID required for personalized trending topics');
    }

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    const braveApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY') || 'BSAyaUfUcyWgy1wwaHVRG8ZLEc2442z';

    console.log('Fetching personalized trending topics for user:', userId);

    // 1. Get user preferences and survey data
    const { data: prefs, error: prefsError } = await supabase
      .from('user_preferences')
      .select('survey_responses, liked_recommendations, recommendation_history')
      .eq('user_id', userId)
      .single();

    if (prefsError) {
      console.error('Error fetching user preferences:', prefsError);
      throw new Error('Could not fetch user preferences');
    }

    // 2. Get user's recent search history
    const { data: searchHistory, error: historyError } = await supabase
      .from('search_history')
      .select('topic, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (historyError) {
      console.error('Error fetching search history:', historyError);
    }

    // 3. Extract user profile for personalization
    const surveyResponses = prefs?.survey_responses || {};
    const interests = surveyResponses.topicInterests || [];
    const goals = surveyResponses.goals || [];
    const style = surveyResponses.newsConsumption || 'balanced';
    const recentSearches = searchHistory?.map(h => h.topic) || [];
    const likedTopics = prefs?.liked_recommendations || [];

    // Get recently shown topics to avoid repeats
    const recentlyShown = new Set<string>();
    const history = prefs?.recommendation_history || [];

    // Get last 50 recommendations from history
    history.slice(-10).forEach((session: any) => {
      if (session.recommendations) {
        session.recommendations.forEach((rec: string) => {
          recentlyShown.add(rec.toLowerCase());
        });
      }
    });

    console.log('User profile:', {
      interests: interests.length,
      goals: goals.length,
      recentSearches: recentSearches.length,
      recentlyShown: recentlyShown.size
    });

    // 4. Fetch current trending topics from Brave
    let currentTrending: string[] = [];
    try {
      const trendingQuery = interests.length > 0
        ? `${interests[0]} breaking news today`
        : 'breaking news today';

      const response = await fetch(
        `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(trendingQuery)}&count=20&freshness=pd1`,
        {
          headers: {
            'Accept': 'application/json',
            'X-Subscription-Token': braveApiKey
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        currentTrending = data.results
          ?.slice(0, 15)
          .map((r: any) => r.title)
          .filter(Boolean) || [];
      }
    } catch (error) {
      console.error('Brave API error:', error);
    }

    // 5. Use OpenAI to generate personalized, specific topics
    const systemPrompt = `You are an expert news curator who generates highly personalized, specific, and timely news topics. Your topics must be:
1. SPECIFIC - Include concrete details like company names, numbers, dates
2. TIMELY - Focus on current events happening now or very recently
3. SEARCHABLE - Users must be able to find articles about these topics
4. CONCISE - 20-50 characters for button display
5. DIVERSE - Cover different aspects of user interests

Bad example: "AI Updates"
Good example: "OpenAI GPT-5 enterprise pricing"
Good example: "Tesla Q4 earnings beat forecast"
Good example: "Senate votes on AI regulation"`;

    const userPrompt = `Generate 10 highly personalized trending news topics for this user:

USER PROFILE:
- Primary Interests: ${interests.join(', ') || 'General news'}
- Usage Goals: ${goals.join(', ') || 'Staying informed'}
- Content Style: ${style}
- Recent Searches: ${recentSearches.slice(0, 5).join(', ') || 'None yet'}
- Liked Topics: ${likedTopics.slice(0, 3).join(', ') || 'None yet'}

CURRENT TRENDING TOPICS (for context):
${currentTrending.slice(0, 10).join('\n')}

AVOID THESE RECENTLY SHOWN TOPICS:
${Array.from(recentlyShown).slice(0, 20).join(', ')}

REQUIREMENTS:
1. Make each topic SPECIFIC with concrete details (names, numbers, events)
2. Ensure topics are CURRENT and happening now
3. Blend user interests with breaking news
4. Keep topics 20-50 characters
5. Make topics clearly searchable
6. Vary topics across different aspects of their interests
7. Avoid any topics similar to recently shown ones

Return ONLY a JSON array of topic strings, nothing else.

Example format:
["Senate passes AI safety bill", "Tesla stock jumps 12% on earnings", "New quantum chip breakthrough"]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 500,
    });

    const content = completion.choices[0].message.content || '[]';

    // Parse the response
    let personalizedTopics: string[] = [];
    try {
      // Try to parse as JSON array directly
      personalizedTopics = JSON.parse(content);
    } catch {
      // Fallback: extract topics from text
      const matches = content.match(/"([^"]+)"/g);
      if (matches) {
        personalizedTopics = matches.map(m => m.slice(1, -1));
      }
    }

    // Filter and validate topics
    personalizedTopics = personalizedTopics
      .filter(topic => {
        if (!topic || topic.length < 15 || topic.length > 60) return false;

        // Check similarity with recently shown
        const topicLower = topic.toLowerCase();
        for (const recent of recentlyShown) {
          if (calculateSimilarity(topicLower, recent) > 0.7) {
            return false; // Too similar to recent topic
          }
        }

        return true;
      })
      .slice(0, 4); // Take top 4

    // If we don't have enough topics, add some interest-based fallbacks
    if (personalizedTopics.length < 4) {
      const fallbacks = generateFallbackTopics(interests, currentTrending, recentlyShown);
      personalizedTopics = [...personalizedTopics, ...fallbacks].slice(0, 4);
    }

    // 6. Store in recommendation history
    if (personalizedTopics.length > 0) {
      const updatedHistory = [...history, {
        timestamp: new Date().toISOString(),
        recommendations: personalizedTopics,
        sessionId: crypto.randomUUID(),
        type: 'trending'
      }].slice(-20); // Keep last 20 sessions

      await supabase
        .from('user_preferences')
        .update({ recommendation_history: updatedHistory })
        .eq('user_id', userId);
    }

    console.log('Generated personalized topics:', personalizedTopics);

    return new Response(
      JSON.stringify({
        topics: personalizedTopics,
        personalized: true,
        lastUpdated: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Personalized trending error:', error);

    // Return error with fallback suggestion
    return new Response(
      JSON.stringify({
        error: error.message,
        fallback: true,
        topics: [
          "Breaking: Major tech earnings",
          "Global markets react to news",
          "Latest policy developments",
          "Scientific breakthrough today"
        ]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  }
});

function calculateSimilarity(str1: string, str2: string): number {
  // Simple word-based similarity check
  const words1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 3));

  let common = 0;
  for (const word of words1) {
    if (words2.has(word)) common++;
  }

  const total = Math.max(words1.size, words2.size);
  return total > 0 ? common / total : 0;
}

function generateFallbackTopics(
  interests: string[],
  currentTrending: string[],
  recentlyShown: Set<string>
): string[] {
  const fallbacks: string[] = [];

  // Try to extract specific topics from trending that match interests
  for (const trend of currentTrending) {
    if (fallbacks.length >= 4) break;

    // Clean and shorten the headline
    let topic = trend
      .replace(/^(Reuters|BBC|CNN|Bloomberg|AP)[\s:-]+/i, '')
      .replace(/\s*\|.*$/, '')
      .trim();

    if (topic.length > 50) {
      topic = topic.substring(0, 47) + '...';
    }

    // Check if it matches user interests
    const topicLower = topic.toLowerCase();
    const matchesInterest = interests.some(interest =>
      topicLower.includes(interest.toLowerCase().split(' ')[0])
    );

    // Check if not recently shown
    let isRecent = false;
    for (const recent of recentlyShown) {
      if (calculateSimilarity(topicLower, recent) > 0.6) {
        isRecent = true;
        break;
      }
    }

    if (matchesInterest && !isRecent && topic.length >= 15) {
      fallbacks.push(topic);
    }
  }

  // If still not enough, add generic time-based topics
  if (fallbacks.length < 4) {
    const hour = new Date().getHours();
    const timeTopics = hour < 12 ? [
      "Morning market movements",
      "Overnight tech developments"
    ] : hour < 17 ? [
      "Midday policy updates",
      "Breaking business news"
    ] : [
      "Evening market close analysis",
      "Today's top developments"
    ];

    fallbacks.push(...timeTopics);
  }

  return fallbacks.slice(0, 4);
}
