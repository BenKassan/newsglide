import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const config = {
    STRIPE_SECRET_KEY: Deno.env.get('STRIPE_SECRET_KEY') ? 'Set (hidden)' : 'NOT SET',
    STRIPE_WEBHOOK_SECRET: Deno.env.get('STRIPE_WEBHOOK_SECRET') ? 
      `Set (${Deno.env.get('STRIPE_WEBHOOK_SECRET')?.substring(0, 10)}...)` : 'NOT SET',
    STRIPE_PRICE_ID: Deno.env.get('STRIPE_PRICE_ID') || 'NOT SET',
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') ? 'Set' : 'NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'Set' : 'NOT SET',
  };

  return new Response(JSON.stringify({ config }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});