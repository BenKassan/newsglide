import { supabase } from '@/integrations/supabase/client'
import { OpenAIResponse } from '@shared/types/api.types'

export interface TargetOutlet {
  name: string
  type: 'News Agency' | 'National Newspaper' | 'Broadcast Media' | 'Online Media'
}

export interface SynthesisRequest {
  topic: string
  targetOutlets: TargetOutlet[]
  freshnessHorizonHours?: number
  targetWordCount?: number
  includePhdAnalysis?: boolean // Add this field
  articleFormat?: 'paragraphs' | 'bullets'
  readingLevel?: ArticleReadingLevel
}

export interface NewsSource {
  id: string
  outlet: string
  type: string
  url: string
  headline: string
  publishedAt: string
  analysisNote: string
}

export interface Disagreement {
  pointOfContention: string
  details: string
  likelyReason: string
}

export type ArticleReadingLevel = 'eli5' | 'high_school' | 'college' | 'phd'

export interface ExpandedArticlePart {
  title: string
  content: string
}

export interface NewsArticle {
  eli5: string
  high_school: string
  college: string
  phd: string | null
  expandedParts?: Partial<Record<ArticleReadingLevel, ExpandedArticlePart[]>>
}

export interface SourceAnalysis {
  narrativeConsistency: {
    score: number
    label: string
  }
  publicInterest: {
    score: number
    label: string
  }
}

export interface NewsData {
  topic: string
  headline: string
  generatedAtUTC: string
  confidenceLevel: 'High' | 'Medium' | 'Low'
  topicHottness: 'High' | 'Medium' | 'Low'
  summaryPoints: string[]
  sourceAnalysis: SourceAnalysis
  disagreements: Disagreement[]
  article: NewsArticle
  keyQuestions: string[]
  sources: NewsSource[]
  missingSources: string[]
  articleFormat?: 'paragraphs' | 'bullets'
  primaryReadingLevel?: ArticleReadingLevel
}

export interface QuestionRequest {
  question: string
  topic: string
  context: {
    headline: string
    summaryPoints: string[]
    sources: Array<{
      outlet: string
      headline: string
      url: string
    }>
    previousMessages?: Array<{ role: 'user' | 'assistant'; content: string }>
  }
}

interface MessageOutput {
  type: 'message'
  content: Array<{ text: string }>
}

function isMessageOutput(item: unknown): item is MessageOutput {
  return (
    typeof item === 'object' &&
    item !== null &&
    'type' in item &&
    (item as MessageOutput).type === 'message' &&
    'content' in item &&
    Array.isArray((item as MessageOutput).content)
  )
}

function safeJsonParse<T = unknown>(rawText: string): T {
  console.log('Attempting to parse JSON, length:', rawText.length)

  // Strip markdown code blocks first
  let cleaned = rawText.trim()

  // Remove markdown code blocks (```json...``` or ```...```)
  cleaned = cleaned.replace(/```(?:json)?\s*/gi, '').replace(/```$/g, '')

  // Find the first { and last } to extract JSON
  const jsonStart = cleaned.indexOf('{')
  const jsonEnd = cleaned.lastIndexOf('}')

  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1)
  }

  // First attempt: direct parse of cleaned text
  try {
    const parsed = JSON.parse(cleaned)
    console.log('JSON parse successful')
    return parsed
  } catch (directError) {
    console.log(
      'Direct parse failed:',
      directError instanceof Error ? directError.message : 'Unknown error'
    )
  }

  // Second attempt: repair truncated JSON
  try {
    let repaired = cleaned

    // Fix unterminated strings and close open structures
    let braceCount = 0
    let bracketCount = 0
    let inString = false
    let escapeNext = false
    let lastValidPosition = 0

    for (let i = 0; i < repaired.length; i++) {
      const char = repaired[i]

      if (escapeNext) {
        escapeNext = false
        continue
      }

      if (char === '\\') {
        escapeNext = true
        continue
      }

      if (char === '"' && !escapeNext) {
        inString = !inString
      }

      if (!inString) {
        if (char === '{') {
          braceCount++
        } else if (char === '}') {
          braceCount--
          if (braceCount === 0) {
            lastValidPosition = i + 1
          }
        } else if (char === ']') {
          bracketCount--
        }
      }
    }

    // Use content up to last valid closing brace if found
    if (lastValidPosition > 0) {
      repaired = repaired.slice(0, lastValidPosition)
    } else {
      // Close any unterminated string
      if (inString) {
        repaired += '"'
      }

      // Close open brackets and braces
      while (bracketCount > 0) {
        repaired += ']'
        bracketCount--
      }
      while (braceCount > 0) {
        repaired += '}'
        braceCount--
      }
    }

    // Remove trailing commas before closing brackets/braces
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1')

    const parsed = JSON.parse(repaired)
    console.log('JSON repair successful')
    return parsed
  } catch (repairError) {
    console.log(
      'JSON repair failed:',
      repairError instanceof Error ? repairError.message : 'Unknown error'
    )
  }

  // If all attempts fail, throw detailed error
  throw new Error(
    `JSON parsing failed after all repair attempts. Preview: ${rawText.slice(0, 200)}...`
  )
}

export async function synthesizeNewsStreaming(
  request: SynthesisRequest,
  callbacks: {
    onSources?: (sources: NewsSource[]) => void;
    onContent?: (chunk: string) => void;
    onComplete?: (data: NewsData) => void;
    onError?: (error: Error) => void;
  },
  signal?: AbortSignal
): Promise<void> {
  try {
    console.log(`Starting streaming synthesis for: ${request.topic}`);
    const requestedFormat = request.articleFormat ?? 'paragraphs'
    const applyArticleFormat = (data: NewsData): NewsData => ({
      ...data,
      articleFormat: data.articleFormat ?? requestedFormat,
      primaryReadingLevel: data.primaryReadingLevel ?? (request.readingLevel ?? 'college'),
    })

    // Get Supabase URL from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const requestBody = {
      topic: request.topic,
      targetOutlets: request.targetOutlets,
      freshnessHorizonHours: Math.min(request.freshnessHorizonHours ?? 72, 72),
      includePhdAnalysis: request.includePhdAnalysis || false,
      targetWordCount: request.targetWordCount,
      articleFormat: request.articleFormat ?? 'paragraphs',
      readingLevel: request.readingLevel ?? 'college',
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/news-synthesis?stream=true`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(requestBody),
        signal,
      }
    );

    if (!response.ok) {
      throw new Error(`Streaming request failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body for streaming');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let contentBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          try {
            const event = JSON.parse(data);

            switch (event.type) {
              case 'sources':
                callbacks.onSources?.(event.data);
                break;

              case 'article_text':
                // New: Receive readable article text chunks
                callbacks.onContent?.(event.data);
                break;

              case 'content':
                // Legacy: Still accumulate JSON for final parsing
                contentBuffer += event.data;
                break;

              case 'done':
                console.log('🔵 [STREAMING DEBUG] Received done event');
                console.log('🔵 [STREAMING DEBUG] Event has data?', !!event.data);
                console.log('🔵 [STREAMING DEBUG] ContentBuffer length:', contentBuffer.length);
                console.log('🔵 [STREAMING DEBUG] Full event object:', JSON.stringify(event, null, 2));

                // New streaming format: complete NewsData sent with done event
                if (event.data) {
                  console.log('✅ [STREAMING DEBUG] Using new streaming format with event.data');
                  console.log('✅ [STREAMING DEBUG] NewsData preview:', {
                    topic: event.data.topic,
                    headline: event.data.headline,
                    sourcesCount: event.data.sources?.length
                  });
                  callbacks.onComplete?.(applyArticleFormat(event.data as NewsData));
                }
                // Legacy format: parse accumulated contentBuffer (only if it has content)
                else if (contentBuffer && contentBuffer.trim().length > 0) {
                  console.log('⚠️ [STREAMING DEBUG] Using legacy format, parsing contentBuffer');
                  try {
                    const newsData = safeJsonParse<NewsData>(contentBuffer);
                    callbacks.onComplete?.(applyArticleFormat(newsData));
                  } catch (parseError) {
                    console.error('❌ [STREAMING DEBUG] Failed to parse contentBuffer:', parseError);
                    callbacks.onError?.(new Error('Failed to parse article content'));
                  }
                }
                // No data in either format - this is an error
                else {
                  console.error('❌ [STREAMING DEBUG] Done event with NO data - triggering error');
                  console.error('❌ [STREAMING DEBUG] This will redirect to home page');
                  callbacks.onError?.(new Error('No article data received'));
                }
                break;

              case 'error':
                callbacks.onError?.(new Error(event.error));
                break;
            }
          } catch (e) {
            console.error('Failed to parse SSE event:', e);
          }
        }
      }
    }
  } catch (error) {
    console.error('Streaming error:', error);
    callbacks.onError?.(error as Error);
  }
}

export async function synthesizeNews(
  request: SynthesisRequest,
  signal?: AbortSignal
): Promise<NewsData> {
  const maxRetries = 2
  let retryCount = 0

  const normalizedRequest: SynthesisRequest = {
    ...request,
    targetWordCount: request.targetWordCount ?? 400,
    articleFormat: request.articleFormat ?? 'paragraphs',
    readingLevel: request.readingLevel ?? 'college',
  }

  while (retryCount <= maxRetries) {
    try {
      console.log(
        `Calling Supabase Edge Function for topic: ${normalizedRequest.topic} (attempt ${retryCount + 1})`
      )

      // Check if request was cancelled
      if (signal?.aborted) {
        throw new Error('Request cancelled')
      }

      // Call Supabase Edge Function with 30 second timeout (increased from 20s)
      const { data, error } = await supabase.functions.invoke('news-synthesis', {
        body: {
          topic: normalizedRequest.topic,
          targetOutlets: normalizedRequest.targetOutlets,
          freshnessHorizonHours: Math.min(normalizedRequest.freshnessHorizonHours ?? 72, 72),
          includePhdAnalysis: normalizedRequest.includePhdAnalysis || false,
          targetWordCount: normalizedRequest.targetWordCount,
          articleFormat: normalizedRequest.articleFormat,
          readingLevel: normalizedRequest.readingLevel,
        },
      })

      if (error) {
        console.error('Supabase function error:', error)

        // Try to parse the error response if it's a FunctionsHttpError
        if (error.message?.includes('Edge Function returned a non-2xx status code')) {
          // Check if it's a configuration error (503)
          if (error.message?.includes('503')) {
            throw new Error('News synthesis service is not properly configured. Please contact support.')
          }
          // For other 5xx errors, retry if we haven't exhausted attempts
          if (retryCount < maxRetries) {
            console.log(`Server error detected, retrying in ${(retryCount + 1) * 2} seconds...`)
            await new Promise((resolve) => setTimeout(resolve, (retryCount + 1) * 2000))
            retryCount++
            continue
          }
          throw new Error('Service temporarily unavailable. Please try again in a few moments.')
        }

        throw new Error(error.message || 'Failed to call news synthesis function')
      }

      if (!data) {
        if (retryCount < maxRetries) {
          console.log('No data returned, retrying...')
          await new Promise((resolve) => setTimeout(resolve, 2000))
          retryCount++
          continue
        }
        throw new Error('No data returned from news synthesis function')
      }

      // Handle structured error responses from the edge function
      if (data.error) {
        console.error('Edge function returned structured error:', data)

        // Handle specific error codes with user-friendly messages
        switch (data.code) {
          case 'NO_SOURCES':
            throw new Error(
              'No current news articles found for this topic. This might be a very niche topic or you may need to use different search terms.'
            )

          case 'INSUFFICIENT_SOURCES':
            throw new Error(
              'No reliable sources found for this keyword. Try rephrasing or using a narrower topic.'
            )

          case 'RATE_LIMIT':
            if (retryCount < maxRetries) {
              console.log('Rate limit hit, retrying...')
              await new Promise((resolve) => setTimeout(resolve, 3000))
              retryCount++
              continue
            }
            throw new Error('Rate limit reached. Please wait a moment and try again.')

          case 'OPENAI':
            throw new Error(
              'Analysis service temporarily unavailable. Please try again in a few moments.'
            )

          case 'PARSE_ERROR':
            throw new Error('Analysis failed due to response format issues. Please try again.')

          case 'CONFIG_ERROR':
            throw new Error(
              'Search service configuration error. Please make sure search API keys are properly configured.'
            )

          case 'TIMEOUT':
            throw new Error(
              'The analysis is taking longer than expected. Please try again or use a simpler search term.'
            )

          case 'TOKEN_LIMIT':
            throw new Error(
              'The analysis request was too complex. Please try a simpler or more specific topic.'
            )

          default:
            throw new Error(data.message || 'Analysis failed. Please try again.')
        }
      }

      console.log('Response received from Edge Function')

      // Parse response with improved error handling
      let outputText = ''

      if (data.output && Array.isArray(data.output)) {
        const messageOutput = data.output.find(isMessageOutput)

        if (
          messageOutput &&
          messageOutput.content &&
          messageOutput.content[0] &&
          messageOutput.content[0].text
        ) {
          outputText = messageOutput.content[0].text
        }
      }

      // Fallback to legacy structure
      if (!outputText && data.output_text) {
        outputText = data.output_text
      }

      if (!outputText) {
        console.error('No output text found in response:', data)
        throw new Error('No output text in response')
      }

      console.log('Output text length:', outputText.length)

      // Use the safe JSON parser
      let newsData: NewsData
      try {
        newsData = safeJsonParse(outputText)
      } catch (parseError) {
        console.error('[OPENAI] Parse error:', parseError)
        throw new Error(`Failed to parse chat response JSON: ${(parseError as Error).message || 'Unknown error'}`)
      }

      // Validate that we have real sources (all should have actual URLs now)
      if (!newsData.sources || !Array.isArray(newsData.sources) || newsData.sources.length < 3) {
        throw new Error(
          'No current news sources found for this topic. Try a different search term.'
        )
      }

      // Validate that sources have proper URLs (they should be real now)
      const validSources = newsData.sources.filter(
        (source) => source.url && source.url.startsWith('http') && source.outlet && source.headline
      )

      if (validSources.length < 3) {
        throw new Error(
          'No reliable current news sources found for this topic. Try rephrasing your search.'
        )
      }

      // Validate and clean the data - now with real sources
      const validated: NewsData = {
        topic: newsData.topic || normalizedRequest.topic,
        headline: (newsData.headline || `Current News: ${normalizedRequest.topic}`).substring(0, 100),
        generatedAtUTC: newsData.generatedAtUTC || new Date().toISOString(),
        confidenceLevel: newsData.confidenceLevel || 'Medium',
        topicHottness: newsData.topicHottness || 'Medium',
        summaryPoints: Array.isArray(newsData.summaryPoints)
          ? newsData.summaryPoints.slice(0, 5).map((p) => String(p).substring(0, 300))
          : ['Analysis based on current news sources'],
        sourceAnalysis: {
          narrativeConsistency: {
            score: newsData.sourceAnalysis?.narrativeConsistency?.score || 5,
            label: newsData.sourceAnalysis?.narrativeConsistency?.label || 'Medium',
          },
          publicInterest: {
            score: newsData.sourceAnalysis?.publicInterest?.score || 5,
            label: newsData.sourceAnalysis?.publicInterest?.label || 'Medium',
          },
        },
        disagreements: Array.isArray(newsData.disagreements)
          ? newsData.disagreements.slice(0, 3)
          : [],
        article: {
          college: newsData.article?.college || newsData.article?.base || 'Analysis based on current news sources.',
          high_school: newsData.article?.high_school || 'Clear explanation tailored for curious teens.',
          eli5: newsData.article?.eli5 || 'Simple explanation based on news.',
          phd: newsData.article?.phd ?? null,
          expandedParts: newsData.article?.expandedParts ?? {},
        },
        keyQuestions: Array.isArray(newsData.keyQuestions)
          ? newsData.keyQuestions.slice(0, 5)
          : ['What are the key developments?'],
        sources: validSources.slice(0, 8).map((s, i) => ({
          id: s.id || `source_${i + 1}`,
          outlet: s.outlet || 'Unknown',
          type: s.type || 'Online Media',
          url: s.url, // These are now real URLs from search results
          headline: String(s.headline || 'No headline').substring(0, 100),
          publishedAt: s.publishedAt || new Date().toISOString(),
          analysisNote: String(s.analysisNote || 'Current news source').substring(0, 150),
        })),
        missingSources: Array.isArray(newsData.missingSources) ? newsData.missingSources : [],
        articleFormat: newsData.articleFormat || normalizedRequest.articleFormat || 'paragraphs',
        primaryReadingLevel: newsData.primaryReadingLevel || normalizedRequest.readingLevel || 'college',
      }

      console.log(
        `Successfully synthesized news with ${validated.sources.length} real current sources`
      )
      return validated
    } catch (error) {
      console.error(`Synthesis attempt ${retryCount + 1} failed:`, error)

      // Check if error is due to request cancellation
      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message === 'Request cancelled')
      ) {
        throw error // Don't retry for user-initiated cancellations
      }

      if (retryCount >= maxRetries) {
        console.error('All retry attempts exhausted')
        throw error // Re-throw the error so the UI can handle it properly
      }

      // Wait before retry for non-specific errors
      await new Promise((resolve) => setTimeout(resolve, 2000))
      retryCount++
    }
  }

  // This should never be reached
  throw new Error('Unexpected end of retry loop')
}

export async function askQuestion(request: QuestionRequest): Promise<string> {
  try {
    console.log(`Asking question about ${request.topic}: ${request.question}`)

    const { data, error } = await supabase.functions.invoke('news-qa', {
      body: request,
    })

    if (error) {
      console.error('Q&A function error:', error)
      throw new Error(error.message || 'Failed to get answer')
    }

    if (!data || data.error) {
      throw new Error(data?.message || 'Failed to process question')
    }

    // Extract answer from response
    if (data.answer) {
      return data.answer
    }

    // Legacy format support
    if (data.output && Array.isArray(data.output)) {
      const messageOutput = data.output.find(isMessageOutput)
      if (messageOutput?.content?.[0]?.text) {
        return messageOutput.content[0].text
      }
    }

    throw new Error('Invalid response format')
  } catch (error) {
    console.error('Question error:', error)
    throw error
  }
}

export async function testCurrentNewsSynthesis(): Promise<void> {
  const testRequest: SynthesisRequest = {
    topic: 'artificial intelligence news today 2025',
    targetOutlets: [
      { name: 'Reuters', type: 'News Agency' },
      { name: 'CNN', type: 'Broadcast Media' },
      { name: 'TechCrunch', type: 'Online Media' },
      { name: 'The New York Times', type: 'National Newspaper' },
    ],
    freshnessHorizonHours: 72,
    targetWordCount: 1000,
    articleFormat: 'paragraphs',
  }

  try {
    console.log('Testing synthesis with current news request:', testRequest)
    const result = await synthesizeNews(testRequest)
    console.log('Test successful!')
    console.log(
      'Found sources:',
      result.sources.map((s) => ({
        outlet: s.outlet,
        publishedAt: s.publishedAt,
        headline: s.headline.substring(0, 80) + '...',
      }))
    )
    console.log('Topic hottness:', result.topicHottness)
    console.log('Summary points:', result.summaryPoints)
  } catch (error) {
    console.error('Test failed:', error)
  }
}

// Get or create a session ID for tracking shown topics
function getSessionId(): string {
  const key = 'news-forge-session-id';
  let sessionId = localStorage.getItem(key);
  
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(key, sessionId);
  }
  
  return sessionId;
}

export async function fetchTrendingTopics(userId?: string): Promise<string[]> {
  try {
    // Try personalized trending topics first if user is authenticated
    if (userId) {
      try {
        console.log('Fetching personalized trending topics for user:', userId);

        const { data, error } = await supabase.functions.invoke('personalized-trending', {
          body: { userId }
        });

        if (!error && data?.topics && data.topics.length > 0) {
          console.log('Got personalized topics:', data.topics);
          return data.topics;
        }

        console.warn('Personalized trending failed, falling back to generic:', error);
      } catch (personalizedError) {
        console.warn('Personalized trending error, falling back to generic:', personalizedError);
      }
    }

    // Fallback to generic trending topics
    const sessionId = getSessionId();
    const timestamp = Date.now();
    console.log(`Fetching generic trending topics at ${timestamp} for session ${sessionId}...`);

    const { data, error } = await supabase.functions.invoke('trending-topics', {
      body: { timestamp },
      headers: {
        'x-session-id': sessionId
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    console.log('Trending response:', data);

    // Check if we got real topics or fallbacks
    if (data?.fallback) {
      console.warn('Got fallback topics - edge function may be failing');
      console.warn('Fallback reason:', data?.error || 'Unknown');
    }

    // Validate topics
    const topics = data?.topics || [];
    const validTopics = topics.filter(
      (t: string) =>
        t &&
        typeof t === 'string' &&
        t.length > 5 &&
        !t.includes('undefined') &&
        !t.match(/trial\s+trial|news\s+news/i)
    );

    return validTopics.length > 0
      ? validTopics
      : ['Technology News', 'Political Updates', 'Business Today', 'World Events'];
  } catch (error) {
    console.error('fetchTrendingTopics failed:', error);
    return ['Latest News', 'Tech Updates', 'Politics Today', 'Business News'];
  }
}
