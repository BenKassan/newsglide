
// OpenAI Responses API type definitions
export interface OpenAIResponseOutputItem {
  type: string;
  id?: string;
  status?: string;
}

export interface OpenAIMessageContent {
  type: string;
  text: string;
  annotations?: Array<{
    type: string;
    start_index: number;
    end_index: number;
    url?: string;
    title?: string;
  }>;
}

export interface OpenAIMessageOutput extends OpenAIResponseOutputItem {
  type: 'message';
  role: string;
  content: OpenAIMessageContent[];
}

export interface OpenAIWebSearchCall extends OpenAIResponseOutputItem {
  type: 'web_search_call';
  action?: string;
  query?: string;
  domains?: string[];
}

export interface OpenAIResponse {
  output?: OpenAIResponseOutputItem[];
  output_text?: string; // Legacy fallback
}

// Type guard functions
export function isMessageOutput(item: OpenAIResponseOutputItem): item is OpenAIMessageOutput {
  return item.type === 'message' && 'content' in item;
}

export function isWebSearchCall(item: OpenAIResponseOutputItem): item is OpenAIWebSearchCall {
  return item.type === 'web_search_call';
}
