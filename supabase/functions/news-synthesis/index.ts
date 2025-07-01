import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Request queuing to prevent overload
const MAX_CONCURRENT_SYNTHESES = 5;
let currentSyntheses = 0;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if we're at capacity
  if (currentSyntheses >= MAX_CONCURRENT_SYNTHESES) {
    return new Response(JSON.stringify({
      error: 'Service is busy, please try again in a moment'
    }), {
      status: 503,
      headers: { ...corsHeaders, 'Retry-After': '5' }
    });
  }

  currentSyntheses++;
  const startTime = Date.now();

  try {
    const { topic } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create cache key
    const cacheKey = `news_${topic.toLowerCase().replace(/\s+/g, '_')}_2h`;
    
    // Check cache first (within last 2 hours)
    const { data: cachedResult } = await supabase
      .from('news_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (cachedResult) {
      console.log('Returning cached result for:', topic);
      
      // Update hit count
      await supabase
        .from('news_cache')
        .update({ hit_count: (cachedResult.hit_count || 0) + 1 })
        .eq('id', cachedResult.id);

      return new Response(JSON.stringify(cachedResult.news_data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-cache-hit': 'true' }
      });
    }

    // If not cached, proceed with synthesis
    console.log('No cache found, generating fresh content for:', topic);
    
    const BRAVE_API_KEY = Deno.env.get('BRAVE_SEARCH_API_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!BRAVE_API_KEY || !OPENAI_API_KEY) {
      throw new Error('Missing required API keys');
    }

    // Search for real news articles
    console.log('Searching for real news about:', topic);
    const searchResponse = await fetch(
      `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(topic)}&count=5&freshness=1d`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': BRAVE_API_KEY,
        }
      }
    );

    if (!searchResponse.ok) {
      throw new Error(`Brave Search API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    console.log('Brave Search found', searchData.results?.length || 0, 'articles');

    if (!searchData.results || searchData.results.length === 0) {
      throw new Error('No recent news articles found for this topic');
    }

    const articles = searchData.results.slice(0, 5);
    console.log('Found', articles.length, 'articles');

    // OpenAI synthesis logic
    console.log('Calling OpenAI to synthesize real articles...');
    
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a professional news synthesizer. Create a comprehensive news summary based on real articles. Return ONLY valid JSON with this exact structure:
            {
              "headline": "Main headline summarizing the key story",
              "topic": "${topic}",
              "summary": "2-3 paragraph executive summary of the key developments",
              "articles": [
                {
                  "title": "Article title",
                  "summary": "2-sentence summary of this specific article",
                  "source": "Source name",
                  "url": "Article URL",
                  "publishedAt": "ISO date string"
                }
              ],
              "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
              "analysis": "Professional analysis paragraph connecting the stories"
            }`
          },
          {
            role: 'user',
            content: `Synthesize these real news articles about "${topic}":\n\n${articles.map((article: any, i: number) => 
              `Article ${i + 1}:\nTitle: ${article.title}\nDescription: ${article.description}\nSource: ${article.source}\nURL: ${article.url}\nPublished: ${article.age}\n`
            ).join('\n')}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    console.log('OpenAI API response received');

    if (!openaiData.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    const content = openaiData.choices[0].message.content.trim();
    console.log('Attempting to parse JSON, length:', content.length);

    let newsData;
    try {
      newsData = JSON.parse(content);
      console.log('JSON parse successful');
    } catch (parseError) {
      console.error('JSON parse failed:', parseError);
      console.log('Raw content:', content);
      throw new Error('Failed to parse OpenAI response as JSON');
    }

    console.log('Successfully synthesized news with', newsData.articles?.length || 0, 'real sources');

    // Cache the result
    await supabase
      .from('news_cache')
      .insert({
        cache_key: cacheKey,
        topic: topic,
        news_data: newsData,
        hit_count: 0
      });

    // Log performance
    const duration = Date.now() - startTime;
    await supabase
      .from('performance_logs')
      .insert({
        operation: 'news_synthesis',
        duration,
        user_id: null // Edge function doesn't have user context
      });

    return new Response(JSON.stringify(newsData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-cache-hit': 'false' }
    });

  } catch (error) {
    console.error('News synthesis error:', error);
    
    // Log error performance
    const duration = Date.now() - startTime;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    await supabase
      .from('performance_logs')
      .insert({
        operation: 'news_synthesis_error',
        duration,
        user_id: null
      });

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } finally {
    currentSyntheses--;
  }
});
