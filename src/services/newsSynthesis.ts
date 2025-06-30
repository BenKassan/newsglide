
import { supabase } from "@/integrations/supabase/client";
import { SynthesisRequest, NewsData } from "@/types/news";
import { isMessageOutput, safeJsonParse } from "@/utils/jsonParser";

export async function synthesizeNews(request: SynthesisRequest): Promise<NewsData> {
  const maxRetries = 2;
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      console.log(`Calling Supabase Edge Function for topic: ${request.topic} (attempt ${retryCount + 1})`);
      
      // Call Supabase Edge Function with 30 second timeout (increased from 20s)
      const { data, error } = await supabase.functions.invoke('news-synthesis', {
        body: {
          topic: request.topic,
          targetOutlets: request.targetOutlets,
          freshnessHorizonHours: request.freshnessHorizonHours || 48
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        
        // Try to parse the error response if it's a FunctionsHttpError
        if (error.message?.includes('Edge Function returned a non-2xx status code')) {
          // For 5xx errors, retry if we haven't exhausted attempts
          if (retryCount < maxRetries) {
            console.log(`Server error detected, retrying in ${(retryCount + 1) * 2} seconds...`);
            await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 2000));
            retryCount++;
            continue;
          }
          throw new Error('Service temporarily unavailable. Please try again in a few moments.');
        }
        
        throw new Error(error.message || 'Failed to call news synthesis function');
      }

      if (!data) {
        if (retryCount < maxRetries) {
          console.log('No data returned, retrying...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          retryCount++;
          continue;
        }
        throw new Error('No data returned from news synthesis function');
      }

      // Handle structured error responses from the edge function
      if (data.error) {
        console.error('Edge function returned structured error:', data);
        
        // Handle specific error codes with user-friendly messages
        switch (data.code) {
          case 'NO_SOURCES':
            throw new Error('No current news articles found for this topic. This might be a very niche topic or you may need to use different search terms.');
          
          case 'INSUFFICIENT_SOURCES':
            throw new Error('No reliable sources found for this keyword. Try rephrasing or using a narrower topic.');
          
          case 'RATE_LIMIT':
            if (retryCount < maxRetries) {
              console.log('Rate limit hit, retrying...');
              await new Promise(resolve => setTimeout(resolve, 3000));
              retryCount++;
              continue;
            }
            throw new Error('Rate limit reached. Please wait a moment and try again.');
          
          case 'OPENAI':
            throw new Error('Analysis service temporarily unavailable. Please try again in a few moments.');
          
          case 'PARSE_ERROR':
            throw new Error('Analysis failed due to response format issues. Please try again.');
          
          case 'CONFIG_ERROR':
            throw new Error('Search service configuration error. Please make sure search API keys are properly configured.');
            
          case 'TIMEOUT':
            throw new Error('The analysis is taking longer than expected. Please try again or use a simpler search term.');
          
          case 'TOKEN_LIMIT':
            throw new Error('The analysis request was too complex. Please try a simpler or more specific topic.');
          
          default:
            throw new Error(data.message || 'Analysis failed. Please try again.');
        }
      }

      console.log('Response received from Edge Function');

      // Parse response with improved error handling
      let outputText = '';
      
      if (data.output && Array.isArray(data.output)) {
        const messageOutput = data.output.find(isMessageOutput);
        
        if (messageOutput && messageOutput.content && messageOutput.content[0] && messageOutput.content[0].text) {
          outputText = messageOutput.content[0].text;
        }
      }
      
      // Fallback to legacy structure
      if (!outputText && data.output_text) {
        outputText = data.output_text;
      }

      if (!outputText) {
        console.error('No output text found in response:', data);
        throw new Error('No output text in response');
      }

      console.log('Output text length:', outputText.length);

      // Use the safe JSON parser
      let newsData: NewsData;
      try {
        newsData = safeJsonParse(outputText);
      } catch (parseError) {
        console.error('All JSON parsing strategies failed:', parseError);
        throw new Error(`Failed to parse news data: ${parseError.message}`);
      }

      // Validate that we have real sources (all should have actual URLs now)
      if (!newsData.sources || !Array.isArray(newsData.sources) || newsData.sources.length < 3) {
        throw new Error('No current news sources found for this topic. Try a different search term.');
      }

      // Validate that sources have proper URLs (they should be real now)
      const validSources = newsData.sources.filter(source => 
        source.url && 
        source.url.startsWith('http') &&
        source.outlet && 
        source.headline
      );

      if (validSources.length < 3) {
        throw new Error('No reliable current news sources found for this topic. Try rephrasing your search.');
      }

      // Validate and clean the data - now with real sources
      const validated: NewsData = {
        topic: newsData.topic || request.topic,
        headline: (newsData.headline || `Current News: ${request.topic}`).substring(0, 100),
        generatedAtUTC: newsData.generatedAtUTC || new Date().toISOString(),
        confidenceLevel: newsData.confidenceLevel || 'Medium',
        topicHottness: newsData.topicHottness || 'Medium',
        summaryPoints: Array.isArray(newsData.summaryPoints) 
          ? newsData.summaryPoints.slice(0, 5).map(p => String(p).substring(0, 150))
          : ['Analysis based on current news sources'],
        sourceAnalysis: {
          narrativeConsistency: {
            score: newsData.sourceAnalysis?.narrativeConsistency?.score || 5,
            label: newsData.sourceAnalysis?.narrativeConsistency?.label || 'Medium'
          },
          publicInterest: {
            score: newsData.sourceAnalysis?.publicInterest?.score || 5,
            label: newsData.sourceAnalysis?.publicInterest?.label || 'Medium'
          }
        },
        disagreements: Array.isArray(newsData.disagreements) 
          ? newsData.disagreements.slice(0, 3)
          : [],
        article: {
          base: newsData.article?.base || 'Analysis based on current news sources.',
          eli5: newsData.article?.eli5 || 'Simple explanation based on news.',
          phd: newsData.article?.phd || 'Advanced technical analysis based on news sources.'
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
          analysisNote: String(s.analysisNote || 'Current news source').substring(0, 150)
        })),
        missingSources: Array.isArray(newsData.missingSources) 
          ? newsData.missingSources 
          : []
      };

      console.log(`Successfully synthesized news with ${validated.sources.length} real current sources`);
      return validated;

    } catch (error) {
      console.error(`Synthesis attempt ${retryCount + 1} failed:`, error);
      
      if (retryCount >= maxRetries) {
        console.error('All retry attempts exhausted');
        throw error; // Re-throw the error so the UI can handle it properly
      }
      
      // Wait before retry for non-specific errors
      await new Promise(resolve => setTimeout(resolve, 2000));
      retryCount++;
    }
  }

  // This should never be reached
  throw new Error('Unexpected end of retry loop');
}
