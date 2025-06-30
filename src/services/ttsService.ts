
import { supabase } from "@/integrations/supabase/client";

export interface TTSRequest {
  text: string;
  voiceId: string;
  modelId?: string;
}

export interface TTSResponse {
  audio: string;
  format: string;
  voiceId: string;
  characterCount: number;
}

export const generateSpeech = async (request: TTSRequest): Promise<TTSResponse> => {
  const { data, error } = await supabase.functions.invoke('text-to-speech', {
    body: request
  });

  if (error) {
    console.error('TTS service error:', error);
    throw new Error(error.message || 'Failed to generate speech');
  }

  if (data.error) {
    throw new Error(data.message || 'TTS generation failed');
  }

  return data;
};

export const playAudioFromBase64 = (base64Audio: string): HTMLAudioElement => {
  const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
  return audio;
};
