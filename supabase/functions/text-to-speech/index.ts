
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId, modelId = "eleven_monolingual_v1" } = await req.json();
    
    const ELEVEN_LABS_API_KEY = Deno.env.get('ELEVEN_LABS_API_KEY');
    if (!ELEVEN_LABS_API_KEY) {
      throw new Error('11Labs API key not configured');
    }

    console.log('Generating speech for voice:', voiceId);
    console.log('Text length:', text.length);

    // Call 11Labs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVEN_LABS_API_KEY,
        },
        body: JSON.stringify({
          text: text.substring(0, 5000), // Ensure we don't exceed limits
          model_id: modelId,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.5,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('11Labs API error:', response.status, errorText);
      
      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('Invalid API key');
      } else if (response.status === 422) {
        throw new Error('Invalid voice ID or request format');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`11Labs API error: ${errorText}`);
    }

    // Get audio data
    const audioData = await response.arrayBuffer();
    
    // Convert to base64
    const base64Audio = btoa(
      new Uint8Array(audioData)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    return new Response(
      JSON.stringify({ 
        audio: base64Audio,
        format: 'mp3',
        voiceId: voiceId,
        characterCount: text.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('TTS error:', error);
    return new Response(
      JSON.stringify({ 
        error: true, 
        message: error.message,
        code: error.code || 'TTS_ERROR'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
