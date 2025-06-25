import OpenAI from 'openai';
import { getJson } from 'serpapi';

export interface TargetOutlet {
  name: string;
  type: 'News Agency' | 'National Newspaper' | 'Broadcast Media' | 'Online Media';
}

export interface SynthesisRequest {
  topic: string;
  targetOutlets: TargetOutlet[];
  freshnessHorizonHours?: number;
  targetWordCount?: number;
}

export interface NewsSource {
  id: string;
  outlet: string;
  type: string;
  url: string;
  headline: string;
  publishedAt: string;
  analysisNote: string;
}

export interface Disagreement {
  pointOfContention: string;
  details: string;
  likelyReason: string;
}

export interface NewsArticle {
  base: string;
  eli5: string;
  middleSchool: string;
  highSchool: string;
  undergrad: string;
  phd: string;
}

export interface SourceAnalysis {
  narrativeConsistency: {
    score: number;
    label: string;
  };
  publicInterest: {
    score: number;
    label: string;
  };
}

export interface NewsData {
  topic: string;
  headline: string;
  generatedAtUTC: string;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  topicHottness: 'High' | 'Medium' | 'Low';
  summaryPoints: string[];
  sourceAnalysis: SourceAnalysis;
  disagreements: Disagreement[];
  article: NewsArticle;
  keyQuestions: string[];
  sources: NewsSource[];
  missingSources: string[];
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedAt: string;
  outlet?: string;
  content?: string;
}

async function searchWeb(query: string, numResults: number = 6, domain?: string): Promise<SearchResult[]> {
  const apiKey = localStorage.getItem('search_api_key') || process.env.SEARCH_API_KEY;
  
  if (!apiKey) {
    console.warn('Search API key not configured. Continuing without web search.');
    return [];
  }

  try {
    const searchQuery = domain ? `${query} site:${domain}` : query;
    console.log('SerpParams ▶', searchQuery);
    
    const response = await getJson({
      engine: "google_news",
      tbm: "nws",  // Added news-specific parameter
      q: searchQuery,
      api_key: apiKey,
      num: numResults,
      hl: "en",
      gl: "us"
    });

    console.log('SerpAPI response length:', response.news_results?.length || 0);

    const results: SearchResult[] = [];
    
    if (response.news_results) {
      for (const item of response.news_results.slice(0, numResults)) {
        results.push({
          title: item.title || '',
          url: item.link || '',
          snippet: item.snippet || '',
          publishedAt: item.date || new Date().toISOString(),
          outlet: item.source || (domain ? domain.replace('.com', '') : '')
        });
      }
    }

    console.log(`Found ${results.length} search results for ${searchQuery}`);
    return results;
  } catch (error) {
    console.error('Search API error:', error);
    return [];
  }
}

// New helper function to search specific outlets
export async function searchOutlets(topic: string, outlets: {name: string; domain: string;}[]): Promise<Record<string, SearchResult[]>> {
  const result: Record<string, SearchResult[]> = {};
  
  for (const outlet of outlets) {
    console.log(`Searching ${outlet.name} (${outlet.domain}) for: ${topic}`);
    try {
      result[outlet.name] = await searchWeb(topic, 3, outlet.domain);
    } catch (error) {
      console.error(`Failed to search ${outlet.name}:`, error);
      result[outlet.name] = [];
    }
  }
  
  return result;
}

function getOpenAIClient(): OpenAI {
  const apiKey = localStorage.getItem('openai_api_key') || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please set it in localStorage or environment variables.');
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true // TODO: move to backend in production
  });
}

const searchWebSchema = {
  name: "search_web",
  description: "Run a real-time news search. If 'targets' is supplied, restrict search to those outlet domains.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "The search query for news articles" },
      num_results: { type: "integer", default: 6, description: "Number of results to return" },
      targets: {
        type: "array",
        items: { type: "string" },
        description: "Optional list of outlet domains, e.g. ['cnn.com','foxnews.com']"
      }
    },
    required: ["query"]
  }
};

export async function synthesizeNews(request: SynthesisRequest): Promise<NewsData> {
  const systemPrompt = `SYSTEM: You are NewsSynth, an expert intelligence analyst and journalist. 

**IMPORTANT: When you need specific outlets (CNN, Fox, BBC, NYT, WSJ) call search_web with the 'targets' array set to their domains: ['cnn.com', 'foxnews.com', 'bbc.com', 'nytimes.com', 'wsj.com']**

If you need fresh information, call the search_web function with the exact query you want. Your mission is to synthesize complex topics from multiple news sources into a single, deeply researched, unbiased, and rigorously fact-checked brief. You must differentiate between primary news agencies and other media, analyze discrepancies, and structure the narrative logically. You will only return valid JSON.

TASK:

1️⃣ **Source Triage & Analysis:**
   - Use the search_web function to fetch the most recent, relevant story on the Topic from each outlet defined in TargetOutlets. The type field (e.g., 'News Agency', 'National Newspaper', 'Broadcast Media') is critical.
   - For each source, extract the URL, headline, publication timestamp, and author(s).
   - Neutrally characterize each source's role in this specific story (e.g., "Reuters provided on-the-ground facts," "The New York Times offered deeper analysis and background," "Fox News focused on the political reaction"). This is for analytical context.
   - If a source is inaccessible, add it to missingSources.
   - To ensure up-to-the-minute relevance, your initial search for articles must prioritize the last 3 days; if no significant news is found in that period, you must report that fact and then default to older, historical articles.

2️⃣ **Source Weighting & Prioritization (Hyper-Recency Check):**
   After fetching the articles, you must categorize and prioritize them based on age before doing anything else:

   - **Priority 1 (Primary Truth - Last 24 Hours)**: These articles define the current reality. The main narrative, headline, and summary points MUST be derived directly from this group.
   
   - **Priority 2 (Immediate Context - 2-7 Days Old)**: Use these articles ONLY to provide direct context for the events of the last 24 hours or to corroborate facts. If a Priority 2 article contradicts a Priority 1 article, you MUST favor the information from Priority 1.
   
   - **Priority 3 (Historical Context - Older than 7 days, if any slipped through)**: These articles are considered potentially unreliable and outdated. Do NOT use them for any facts about the current situation. They can only be used for deep background (e.g., "This policy reverses a decision made last year..."), and you MUST explicitly state that the information is historical.

3️⃣ **CRITICAL: Timeline and Status Check:**
   - Sort ALL articles you've found strictly by their publication date, from oldest to most recent.
   - Identify the 'Current Reality': Pinpoint the single most recent, significant event from that timeline. This becomes your 'ground truth'.
   - Invalidate Old Information: Explicitly ignore any facts, titles, or scenarios from older articles that are now incorrect because of this new reality.
   - Write from the Present: Anchor the entire article to this 'current reality'.

4️⃣ **Structured Fact Extraction & Triangulation:**
   - Deconstruct the stories into granular factual statements: names, titles, locations, dates, statistics, direct quotes, and policy details.
   - A fact is "verified" only if it is corroborated by at least TWO sources AND is not contradicted by more recent information.
   - Create a detailed log of discrepancies in the 'disagreements' field. For each, hypothesize a reason for it. The severity and number of these discrepancies will directly inform your Narrative Consistency Score.

5️⃣ **Narrative Blueprinting:**
   - Before writing, create an internal outline for the article based on this structure: Executive Summary, Current Status, How We Got Here, Primary Actors, Broader Implications, and Open Questions.

6️⃣ **Article Synthesis & In-depth Writing:**
   - Using the blueprint, write a comprehensive, neutral article.
   - ALWAYS lead with the current reality and work backward chronologically for context.
   - Meticulously cite and attribute all facts and quotes.

7️⃣ **Audience Adaptation & Integrity Check:**
   - Rewrite the detailed base article for the five comprehension levels (eli5 to phd), preserving the core facts and "current reality first" structure.

8️⃣ **Analytical Scoring (THE SOLUTION):**
   - Based on your comprehensive analysis, you MUST generate the following analytical scores and labels. This is not optional.
   
   - **a. Topic Hottness:** Assign a simple label ("High", "Medium", or "Low") based on the overall media attention. This should be directly correlated with the Public Interest Score below.
   
   - **b. Narrative Consistency Score (out of 10):** Quantify the level of agreement across all analyzed sources. Base this score directly on the number and severity of the discrepancies you identified in step 4.
       - **Scoring Guide:**
           - **10 (Identical):** All sources report the same facts and narrative without conflict. No entries in 'disagreements' list.
           - **7-9 (High Consistency):** Minor differences in secondary details but the core narrative is aligned. A few minor 'disagreements'.
           - **4-6 (Some Variance):** Core narrative is consistent, but notable discrepancies exist in key facts or framing (as identified in your 'disagreements' list).
           - **1-3 (Low Consistency):** Significant contradictions on fundamental aspects of the story. Multiple major 'disagreements'.
       - **Label:** You must also provide a qualitative label for the score: "Identical", "High Consistency", "Some Variance", or "Low Consistency".

   - **c. Public Interest Score (out of 10):** Estimate the current media attention on this topic based on the recency and breadth of source coverage.
       - **Scoring Guide:**
           - **9-10 (Very High):** The top headline on nearly all major news agencies within the last 24-48 hours.
           - **7-8 (High):** Covered prominently by most major outlets.
           - **4-6 (Medium):** Covered by several outlets, but not as the lead story, or is being followed by specialized media.
           - **1-3 (Low):** Minimal, niche, or older coverage.
       - **Label:** You must also provide a qualitative label for the score: "Very High", "High", "Medium", or "Low".

9️⃣ **Final JSON Output (THE DELIVERY MECHANISM):**
   - Generate a single, valid JSON object containing all the data from the previous steps. Ensure no explanatory text exists outside the JSON. This object is your only output.

Return only the JSON object with this structure:
{
  "topic": string,
  "headline": string,
  "generatedAtUTC": string,
  "confidenceLevel": "High" | "Medium" | "Low",
  "topicHottness": "High" | "Medium" | "Low",
  "summaryPoints": string[],
  "sourceAnalysis": {
    "narrativeConsistency": {
      "score": number,
      "label": string
    },
    "publicInterest": {
      "score": number,
      "label": string
    }
  },
  "disagreements": Array<{pointOfContention: string, details: string, likelyReason: string}>,
  "article": {
    "base": string,
    "eli5": string,
    "middleSchool": string,
    "highSchool": string,
    "undergrad": string,
    "phd": string
  },
  "keyQuestions": string[],
  "sources": Array<{id: string, outlet: string, type: string, url: string, headline: string, publishedAt: string, analysisNote: string}>,
  "missingSources": string[]
}`;

  const userPrompt = `Topic: ${request.topic}
TargetOutlets: ${JSON.stringify(request.targetOutlets)}
FreshnessHorizonHours: ${request.freshnessHorizonHours || 168}
TargetWordCount: ${request.targetWordCount || 1000}`;

  try {
    const openai = getOpenAIClient();
    console.log('Calling OpenAI with topic:', request.topic);
    
    const firstCall = await openai.chat.completions.create({
      model: "gpt-4.1-2025-04-14",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      tools: [{ type: "function", function: searchWebSchema }],
      tool_choice: "auto",
      temperature: 0.2,
      max_completion_tokens: 4000
    });

    let response = firstCall.choices[0]?.message?.content;

    // Handle tool calls
    if (firstCall.choices[0]?.finish_reason === "tool_calls") {
      const toolCalls = firstCall.choices[0].message.tool_calls;
      const messages: any[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
        firstCall.choices[0].message
      ];

      // Process each tool call
      for (const toolCall of toolCalls || []) {
        if (toolCall.function.name === "search_web") {
          try {
            const { query, num_results = 6, targets } = JSON.parse(toolCall.function.arguments);
            console.log(`Tool call: searching for "${query}"${targets ? ` with targets: ${targets.join(', ')}` : ''}`);
            
            let searchResults;
            
            if (Array.isArray(targets) && targets.length > 0) {
              // Search specific outlets
              const outlets = targets.map((domain: string) => ({
                name: domain.replace('.com', '').toUpperCase(),
                domain: domain
              }));
              const outletResults = await searchOutlets(query, outlets);
              
              // Flatten results for GPT
              searchResults = Object.entries(outletResults).flatMap(([outlet, results]) => 
                results.map(result => ({
                  ...result,
                  outlet: outlet
                }))
              );
            } else {
              // Generic search
              searchResults = await searchWeb(query, num_results);
            }
            
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(searchResults)
            });
          } catch (parseError) {
            console.error('Error parsing tool call arguments:', parseError);
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({ 
                status: "error", 
                reason: "Failed to parse search parameters",
                error: parseError instanceof Error ? parseError.message : 'Unknown error'
              })
            });
          }
        }
      }

      // Make the second call with search results
      const secondCall = await openai.chat.completions.create({
        model: "gpt-4.1-2025-04-14",
        messages,
        temperature: 0.2,
        max_completion_tokens: 4000
      });

      response = secondCall.choices[0]?.message?.content;
    }
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    console.log('OpenAI response received:', response.substring(0, 200) + '...');

    // Parse the JSON response
    const newsData = JSON.parse(response) as NewsData;
    
    // Validate the response structure
    if (!newsData.topic || !newsData.article || !newsData.sources || !newsData.sourceAnalysis) {
      throw new Error('Invalid response structure from OpenAI');
    }

    return newsData;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw new Error(`Failed to synthesize news: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
