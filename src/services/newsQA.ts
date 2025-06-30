
import { supabase } from "@/integrations/supabase/client";
import { QuestionRequest } from "@/types/news";
import { isMessageOutput } from "@/utils/jsonParser";

export async function askQuestion(request: QuestionRequest): Promise<string> {
  try {
    console.log(`Asking question about ${request.topic}: ${request.question}`);
    
    const { data, error } = await supabase.functions.invoke('news-qa', {
      body: request
    });

    if (error) {
      console.error('Q&A function error:', error);
      throw new Error(error.message || 'Failed to get answer');
    }

    if (!data || data.error) {
      throw new Error(data?.message || 'Failed to process question');
    }

    // Extract answer from response
    if (data.answer) {
      return data.answer;
    }

    // Legacy format support
    if (data.output && Array.isArray(data.output)) {
      const messageOutput = data.output.find(isMessageOutput);
      if (messageOutput?.content?.[0]?.text) {
        return messageOutput.content[0].text;
      }
    }

    throw new Error('Invalid response format');
  } catch (error) {
    console.error('Question error:', error);
    throw error;
  }
}
