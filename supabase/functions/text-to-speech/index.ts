
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MORGAN_FREEMAN_VOICE_ID = "88H4L44SBHdJ7weJ17lW";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    
    const ELEVEN_LABS_API_KEY = Deno.env.get('ELEVEN_LABS_API_KEY');
    if (!ELEVEN_LABS_API_KEY) {
      throw new Error('11Labs API key not configured');
    }

    console.log('Generating speech with Morgan Freeman voice');
    console.log('Text length:', text.length);

    const truncatedText = text.substring(0, 5000);

    const elevenLabsUrl =
      `https://api.elevenlabs.io/v1/text-to-speech/${MORGAN_FREEMAN_VOICE_ID}/stream` +
      `?optimize_streaming_latency=0&output_format=mp3_44100_128`;

    // Always use Morgan Freeman voice
    const response = await fetch(
      elevenLabsUrl,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVEN_LABS_API_KEY,
        },
        body: JSON.stringify({
          text: truncatedText,
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('11Labs API error:', response.status, errorText);
      
      if (response.status === 401) {
        throw new Error('Invalid API key');
      } else if (response.status === 422) {
        throw new Error('Invalid voice ID or request format');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`11Labs API error: ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No audio stream returned by 11Labs');
    }

    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', 'audio/mpeg');
    headers.set('Cache-Control', 'no-store');

    return new Response(response.body, {
      headers,
    });

  } catch (error) {
    console.error('TTS error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
