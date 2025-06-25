
import OpenAI from 'openai';
import { searchOutlets } from '../helpers/searchOutlets';

export interface TargetOutlet {
  name: string;
  type: string;
}

export interface NewsData {
  headline: string;
  article: {
    base: string;
    eli5: string;
    middleSchool: string;
    highSchool: string;
    undergrad: string;
    phd: string;
  };
  summaryPoints: string[];
  keyQuestions: string[];
  sources: Array<{
    id: string;
    outlet: string;
    url: string;
    headline: string;
    publishedAt: string;
    type: string;
    analysisNote: string;
  }>;
  missingSources: string[];
  disagreements: Array<{
    pointOfContention: string;
    details: string;
    likelyReason: string;
  }>;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  generatedAtUTC: string;
  topicHottness: string;
  sourceAnalysis: {
    narrativeConsistency: {
      score: number;
      label: string;
    };
    publicInterest: {
      score: number;
      label: string;
    };
  };
}

interface SearchWebOptions {
  topic: string;
  targetOutlets: TargetOutlet[];
  freshnessHorizonHours: number;
  targetWordCount: number;
}

// Generic search function for backward compatibility
async function searchWeb(query: string, numResults = 6) {
  const apiKey = localStorage.getItem('search_api_key') || process.env.SEARCH_API_KEY;
  if (!apiKey) {
    console.warn('Search API key not configured');
    return [];
  }

  try {
    const url = `https://serpapi.com/search.json?engine=google_news&tbm=nws&hl=en&gl=us&q=${encodeURIComponent(query)}&num=${numResults}&api_key=${apiKey}`;
    const resp = await fetch(url);
    const data = await resp.json();
    const hits = (data.news_results || []).slice(0, numResults);

    return hits.map((n: any) => ({
      title: n.title || '',
      url: n.link || '',
      snippet: n.snippet || '',
      publishedAt: n.date || new Date().toISOString()
    }));
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

const searchWebSchema = {
  name: "search_web",
  description: "Run a real-time news search. If 'targets' is supplied, restrict search to those outlet domains.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string" },
      num_results: { type: "integer", default: 6 },
      targets: {
        type: "array",
        items: { type: "string" },
        description: "Optional list of outlet domains, e.g. ['cnn.com','nytimes.com']"
      }
    },
    required: ["query"]
  }
};

export async function synthesizeNews(options: SearchWebOptions): Promise<NewsData> {
  const apiKey = localStorage.getItem('openai_api_key');
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });

  const systemPrompt = `If you need specific outlets (CNN, Fox, BBC, NYT, WSJ) call search_web with the targets array set to their domains.

You are a professional news analyst tasked with synthesizing news coverage across multiple sources to create a comprehensive, unbiased report. Your goal is to provide balanced analysis that helps readers understand the full scope of a news topic.

CRITICAL: You must return ONLY valid JSON in exactly this format:
{
  "headline": "string",
  "article": {
    "base": "string",
    "eli5": "string", 
    "middleSchool": "string",
    "highSchool": "string",
    "undergrad": "string",
    "phd": "string"
  },
  "summaryPoints": ["string"],
  "keyQuestions": ["string"],
  "sources": [{"id": "string", "outlet": "string", "url": "string", "headline": "string", "publishedAt": "string", "type": "string", "analysisNote": "string"}],
  "missingSources": ["string"],
  "disagreements": [{"pointOfContention": "string", "details": "string", "likelyReason": "string"}],
  "confidenceLevel": "High|Medium|Low",
  "generatedAtUTC": "string",
  "topicHottness": "string",
  "sourceAnalysis": {
    "narrativeConsistency": {"score": number, "label": "string"},
    "publicInterest": {"score": number, "label": "string"}
  }
}

Write different reading levels for the same core information. Include analysis of source disagreements and confidence levels.`;

  const userPrompt = `Analyze news coverage for: "${options.topic}"

Target outlets: ${options.targetOutlets.map(o => o.name).join(', ')}
Freshness: ${options.freshnessHorizonHours} hours
Target length: ${options.targetWordCount} words

Provide comprehensive analysis with source citations and balanced perspective.`;

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  try {
    const firstResponse = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages,
      tools: [{ type: "function", function: searchWebSchema }],
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 4000
    });

    const firstChoice = firstResponse.choices[0];
    
    if (firstChoice.finish_reason === "tool_calls" && firstChoice.message.tool_calls) {
      messages.push(firstChoice.message);

      for (const call of firstChoice.message.tool_calls) {
        try {
          const { query, num_results = 6, targets } = JSON.parse(call.function.arguments);
          console.log('Tool call:', { query, num_results, targets });

          let payload;
          if (Array.isArray(targets) && targets.length) {
            payload = await searchOutlets(query, targets, Math.min(num_results, 3));
          } else {
            payload = await searchWeb(query, num_results);
          }

          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(payload)
          });
        } catch (error) {
          console.error('Tool call error:', error);
          messages.push({
            role: "tool", 
            tool_call_id: call.id,
            content: JSON.stringify({ error: "Search failed" })
          });
        }
      }

      const secondResponse = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages,
        temperature: 0.7,
        max_tokens: 4000
      });

      const content = secondResponse.choices[0].message.content;
      if (!content) {
        throw new Error('No content in second response');
      }

      return JSON.parse(content);
    } else {
      const content = firstChoice.message.content;
      if (!content) {
        throw new Error('No content in first response');
      }

      return JSON.parse(content);
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(`Failed to synthesize news: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
