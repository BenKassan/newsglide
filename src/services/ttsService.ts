import { supabase } from "@/integrations/supabase/client";

export interface TTSResponse {
  audio: string;
  format: string;
}

export interface TTSRequest {
  text: string;
  voiceId?: string;
}

// Fast TTS generation with text limits
export async function generateSpeech(request: TTSRequest): Promise<TTSResponse> {
  const { data, error } = await supabase.functions.invoke('text-to-speech', {
    body: { 
      text: request.text.substring(0, 3000) // Limit for faster generation
    }
  });

  if (error) {
    throw new Error(error.message || 'Failed to generate speech');
  }

  return {
    audio: data.audio,
    format: data.format || 'mp3'
  };
}

// Keep legacy function for compatibility
export async function generateMorganFreemanSpeech(text: string): Promise<TTSResponse> {
  return generateSpeech({ text });
}

// Background TTS with caching potential
export async function generateBackgroundSpeech(text: string): Promise<TTSResponse | null> {
  try {
    return await generateSpeech({ 
      text: text.substring(0, 2000) // Even shorter for background
    });
  } catch (error) {
    console.warn('Background TTS failed:', error);
    return null;
  }
}
