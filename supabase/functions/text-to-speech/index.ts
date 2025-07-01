
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use a reliable default voice that should work on free tier
// This is Adam's voice - deep and authoritative like Morgan Freeman
const MORGAN_FREEMAN_VOICE_ID = "pNInz6obpgDQGcFmaJgB";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    
    const ELEVEN_LABS_API_KEY = Deno.env.get('ELEVEN_LABS_API_KEY');
    if (!ELEVEN_LABS_API_KEY) {
      console.error('Missing ELEVEN_LABS_API_KEY environment variable');
      throw new Error('11Labs API key not configured - please set ELEVEN_LABS_API_KEY in Supabase secrets');
    }

    console.log('Generating speech with voice ID:', MORGAN_FREEMAN_VOICE_ID);
    console.log('Text length:', text?.length || 0);
    console.log('First 50 chars:', text?.substring(0, 50) || 'No text provided');

    // Add request validation
    if (!text || text.trim().length === 0) {
      throw new Error('No text provided for speech synthesis');
    }

    // Limit text length to prevent quota issues
    const limitedText = text.substring(0, 2500); // Reduced from 5000 to save credits
    console.log('Processing text length:', limitedText.length);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${MORGAN_FREEMAN_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVEN_LABS_API_KEY,
        },
        body: JSON.stringify({
          text: limitedText,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.5,
            use_speaker_boost: true
          }
        })
      }
    );

    console.log('Eleven Labs API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Eleven Labs API error details:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      // More specific error messages
      if (response.status === 401) {
        throw new Error('Invalid Eleven Labs API key - please check your ELEVEN_LABS_API_KEY');
      } else if (response.status === 422) {
        throw new Error(`Invalid voice ID: ${MORGAN_FREEMAN_VOICE_ID} - this voice may not exist or you may not have access`);
      } else if (response.status === 429) {
        throw new Error('Eleven Labs rate limit exceeded - please try again in a few moments');
      } else if (response.status === 402) {
        throw new Error('Eleven Labs quota exceeded - please check your subscription or try shorter text');
      }
      
      throw new Error(`Eleven Labs API error (${response.status}): ${errorText}`);
    }

    const audioData = await response.arrayBuffer();
    console.log('Audio data size:', audioData.byteLength, 'bytes');
    
    const base64Audio = btoa(
      new Uint8Array(audioData)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    console.log('Successfully generated audio, base64 length:', base64Audio.length);
    
    return new Response(
      JSON.stringify({ 
        audio: base64Audio,
        format: 'mp3',
        voiceId: MORGAN_FREEMAN_VOICE_ID
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('TTS function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check Supabase function logs for more information'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
