
import { supabase } from "@/integrations/supabase/client";

export interface TTSResponse {
  audio: string;
  format: string;
}

export async function generateMorganFreemanSpeech(text: string): Promise<TTSResponse> {
  const { data, error } = await supabase.functions.invoke('text-to-speech', {
    body: { text }
  });

  if (error) {
    throw new Error(error.message || 'Failed to generate speech');
  }

  return data as TTSResponse;
}
