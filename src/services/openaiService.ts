
import OpenAI from 'openai';

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

function sanitizeJsonString(jsonString: string): string {
  // Remove any leading/trailing whitespace
  let cleaned = jsonString.trim();
  
  // Fix common JSON issues
  cleaned = cleaned
    // Fix unescaped quotes within strings (basic attempt)
    .replace(/([^\\])"([^"]*?[^\\])"([^,}\]])/g, '$1\\"$2\\"$3')
    // Remove control characters that break JSON
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Fix newlines within string values
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  
  return cleaned;
}

function extractJsonFromResponse(response: string): string {
  // Try to find JSON object boundaries
  const jsonStart = response.indexOf('{');
  const jsonEnd = response.lastIndexOf('}');
  
  if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
    throw new Error('No valid JSON object found in response');
  }
  
  return response.substring(jsonStart, jsonEnd + 1);
}

function parseJsonSafely(jsonString: string): any {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.log('Initial JSON parse failed, attempting sanitization...');
    
    // Try sanitizing first
    const sanitized = sanitizeJsonString(jsonString);
    try {
      return JSON.parse(sanitized);
    } catch (sanitizedError) {
      console.log('Sanitized JSON parse also failed, trying to extract JSON...');
      
      // Try extracting just the JSON part
      const extracted = extractJsonFromResponse(sanitized);
      return JSON.parse(extracted);
    }
  }
}

function getOpenAIClient(): OpenAI {
  const apiKey = localStorage.getItem('openai_api_key') || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please set it in localStorage or environment variables.');
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true // Only for development - move to backend in production
  });
}

export async function synthesizeNews(request: SynthesisRequest): Promise<NewsData> {
  const systemPrompt = `SYSTEM: You are NewsSynth, an expert intelligence analyst and journalist. Your mission is to synthesize complex topics from multiple news sources into a single, deeply researched, unbiased, and rigorously fact-checked brief. You must differentiate between primary news agencies and other media, analyze discrepancies, and structure the narrative logically. 

CRITICAL: You will return ONLY valid JSON. All string values must be properly escaped with backslashes before quotes and newlines. No explanatory text before or after the JSON.

TASK:

1️⃣ **Source Triage & Analysis:**
   - Fetch the most recent, relevant story on the Topic from each outlet defined in TargetOutlets. The type field (e.g., 'News Agency', 'National Newspaper', 'Broadcast Media') is critical.
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
   - ENSURE ALL QUOTES AND STRING VALUES ARE PROPERLY ESCAPED FOR JSON.

7️⃣ **Audience Adaptation & Integrity Check:**
   - Rewrite the detailed base article for the five comprehension levels (eli5 to phd), preserving the core facts and "current reality first" structure.
   - ENSURE ALL STRING VALUES ARE PROPERLY ESCAPED FOR JSON.

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
   - Generate a single, valid JSON object containing all the data from the previous steps. 
   - CRITICAL: Ensure all string values are properly escaped for JSON (quotes, newlines, backslashes).
   - Return ONLY the JSON object, no explanatory text before or after.

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
    
    const resp = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      tools: [{ type: 'web_search_preview' }],
      temperature: 0.1,
      max_tokens: 4000
    });

    const response = resp.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response content from OpenAI');
    }

    console.log('OpenAI response received, length:', response.length);
    console.log('Response preview:', response.substring(0, 500) + '...');

    // Use safe JSON parsing
    const newsData = parseJsonSafely(response) as NewsData;
    
    // Validate the response structure
    if (!newsData.topic || !newsData.article || !newsData.sources || !newsData.sourceAnalysis) {
      console.error('Invalid response structure:', Object.keys(newsData));
      throw new Error('Invalid response structure from OpenAI - missing required fields');
    }

    console.log('Successfully parsed news data for topic:', newsData.topic);
    return newsData;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      console.error('JSON parsing error - this may be due to unescaped characters in the response');
    }
    throw new Error(`Failed to synthesize news: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
