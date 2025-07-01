
import { supabase } from "@/integrations/supabase/client";

export interface TTSResponse {
  audio: string;
  format: string;
  voiceId?: string;
}

export async function generateMorganFreemanSpeech(text: string): Promise<TTSResponse> {
  try {
    console.log('Calling TTS service with text length:', text.length);
    
    const { data, error } = await supabase.functions.invoke('text-to-speech', {
      body: { text }
    });

    if (error) {
      console.error('TTS Edge Function Error:', error);
      throw new Error(error.message || 'Failed to generate speech');
    }

    if (data?.error) {
      console.error('TTS API Error:', data.error, data.details);
      throw new Error(data.error || 'Text-to-speech service error');
    }

    if (!data?.audio) {
      throw new Error('No audio data received from text-to-speech service');
    }

    console.log('TTS service successful, audio data length:', data.audio.length);
    return data as TTSResponse;
  } catch (error) {
    console.error('TTS Service Error:', error);
    throw error;
  }
}
