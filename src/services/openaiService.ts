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

export interface NewsData {
  topic: string;
  headline: string;
  generatedAtUTC: string;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  summaryPoints: string[];
  disagreements: Disagreement[];
  article: NewsArticle;
  keyQuestions: string[];
  sources: NewsSource[];
  missingSources: string[];
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
  const systemPrompt = `SYSTEM: You are NewsSynth, an expert intelligence analyst and journalist. Your mission is to synthesize complex topics from multiple news sources into a single, deeply researched, unbiased, and rigorously fact-checked brief. You must differentiate between primary news agencies and other media, analyze discrepancies, and structure the narrative logically. You will only return valid JSON.

TASK:

1️⃣ **Source Triage & Analysis:**
   - Fetch the most recent, relevant story on the Topic from each outlet defined in TargetOutlets. The type field (e.g., 'News Agency', 'National Newspaper', 'Broadcast Media') is critical.
   - For each source, extract the URL, headline, publication timestamp, and author(s).
   - Neutrally characterize each source's role in this specific story (e.g., "Reuters provided on-the-ground facts," "The New York Times offered deeper analysis and background," "Fox News focused on the political reaction"). This is for analytical context.
   - If a source is inaccessible, add it to missingSources.

2️⃣ **Structured Fact Extraction & Triangulation:**
   - Deconstruct the stories into granular factual statements: names, titles, locations, dates, statistics, direct quotes, and policy details.
   - A fact is "verified" only if it is corroborated by at least TWO sources. Prioritize facts from 'News Agency' sources (like Reuters, AP) as the foundational baseline.
   - Create a detailed log of discrepancies. For each, don't just state the difference; hypothesize a reason for it (e.g., "Conflict in numbers may be due to different reporting times," or "One source quotes an official, the other an anonymous aide").

3️⃣ **Narrative Blueprinting:**
   - Before writing, create an internal outline for the article based on this structure:
     a. **Executive Summary:** The 3-4 most critical takeaways.
     b. **Background:** What context is essential for a new reader to understand the story?
     c. **Key Developments:** The core events that just happened. What, where, when?
     d. **Primary Actors:** Who are the key individuals or groups, and what are their roles/stances?
     e. **Broader Implications:** Why does this story matter? What are the potential consequences (economic, political, social)?
     f. **Open Questions:** What remains unknown or is a point of major speculation?

4️⃣ **Article Synthesis & In-depth Writing:**
   - Using the blueprint, write a comprehensive, neutral article aiming for the TargetWordCount.
   - Weave the verified facts into the blueprint's narrative structure. The goal is a deep, explanatory analysis, not just a list of events.
   - Cite every factual statement meticulously (e.g., [S1, S3]).
   - Attribute all direct quotes to both the person and the sources that reported it (e.g., "The plan is 'bold and necessary' [S2]," stated the Treasury Secretary).

5️⃣ **Audience Adaptation & Integrity Check:**
   - Rewrite the detailed base article for the five comprehension levels (eli5 to phd).
   - **Critical Rule:** The narrative structure (background, key events, implications) and all core facts MUST be preserved in every version. The phd version should be more analytical and use more specialized terminology, while the eli5 version uses simple analogies.
   - Remove inline citations for eli5 and middleSchool levels.

6️⃣ **Final JSON Output:**
   - Generate a single, valid JSON object, including the new analytical fields. Ensure no explanatory text exists outside the JSON.

Return only the JSON object with this structure:
{
  "topic": string,
  "headline": string,
  "generatedAtUTC": string,
  "confidenceLevel": "High" | "Medium" | "Low",
  "summaryPoints": string[],
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
FreshnessHorizonHours: ${request.freshnessHorizonHours || 48}
TargetWordCount: ${request.targetWordCount || 1000}`;

  try {
    const openai = getOpenAIClient();
    console.log('Calling OpenAI with topic:', request.topic);
    
    const completion = await openai.chat.completions.create({
      model: "o3-2025-04-16", // Using the o3 reasoning model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent, factual output
      max_tokens: 4000
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    console.log('OpenAI response received:', response.substring(0, 200) + '...');

    // Parse the JSON response
    const newsData = JSON.parse(response) as NewsData;
    
    // Validate the response structure
    if (!newsData.topic || !newsData.article || !newsData.sources) {
      throw new Error('Invalid response structure from OpenAI');
    }

    return newsData;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw new Error(`Failed to synthesize news: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
