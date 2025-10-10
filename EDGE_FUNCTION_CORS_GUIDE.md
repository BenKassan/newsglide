# Edge Function CORS Configuration Guide

## Critical Issue: DELETE Method CORS Failure

### What Happened
The delete chat functionality appeared to work in code but failed silently in the browser with a CORS error:
```
Access to fetch at 'https://icwusduvaohosrvxlahh.supabase.co/functions/v1/chat-conversations?id=...'
from origin 'http://localhost:3000' has been blocked by CORS policy:
Method DELETE is not allowed by Access-Control-Allow-Methods in preflight response.
```

### Root Cause
**Missing `Access-Control-Allow-Methods` header in the edge function CORS configuration.**

The edge function had:
```typescript
// ❌ INCOMPLETE - Missing methods header
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

When the browser makes a DELETE request, it first sends a **preflight OPTIONS request** to check if DELETE is allowed. Without the `Access-Control-Allow-Methods` header, the server doesn't tell the browser which HTTP methods are permitted, causing the request to be blocked.

### The Fix
**Always include all HTTP methods your edge function supports:**

```typescript
// ✅ CORRECT - Complete CORS configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS', // ← CRITICAL
};
```

## CORS Checklist for All Edge Functions

When creating or modifying any Supabase Edge Function that will be called from the browser:

### 1. **Define Complete CORS Headers**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // or specific domain in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS', // List ALL methods
};
```

### 2. **Handle OPTIONS Requests (Preflight)**
```typescript
serve(async (req) => {
  // ALWAYS handle OPTIONS first
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ... rest of your code
});
```

### 3. **Include CORS Headers in ALL Responses**
```typescript
// Success response
return new Response(
  JSON.stringify(data),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);

// Error response
return new Response(
  JSON.stringify({ error: message }),
  {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  }
);
```

## Common CORS Mistakes to Avoid

### ❌ Mistake 1: Forgetting Methods Header
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  // Missing: 'Access-Control-Allow-Methods'
};
```
**Result:** DELETE, PUT, PATCH requests will fail

### ❌ Mistake 2: Not Handling OPTIONS
```typescript
serve(async (req) => {
  // No OPTIONS handler - preflight fails
  if (req.method === 'GET') { ... }
});
```
**Result:** All cross-origin requests will fail

### ❌ Mistake 3: Missing CORS in Error Responses
```typescript
catch (error) {
  return new Response(
    JSON.stringify({ error }),
    { status: 500 } // Missing corsHeaders!
  );
}
```
**Result:** Browser can't read error details

## Template for New Edge Functions

Use this template for all new AI Assistant edge functions:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// ✅ Complete CORS configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

serve(async (req) => {
  // ✅ Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Your logic here
    const result = { success: true };

    // ✅ Return with CORS headers
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);

    // ✅ Error response with CORS headers
    return new Response(
      JSON.stringify({ error: true, message: error.message }),
      {
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

## Debugging CORS Issues

If you encounter CORS errors:

1. **Check Browser Console** - Look for exact error message
2. **Verify Methods Header** - Ensure the HTTP method is listed
3. **Test with curl** - Bypass browser CORS checks:
   ```bash
   curl -X OPTIONS https://your-function-url \
     -H "Access-Control-Request-Method: DELETE" \
     -v
   ```
4. **Check Edge Function Logs** - In Supabase Dashboard
5. **Redeploy After Changes** - Always run:
   ```bash
   npx supabase functions deploy <function-name>
   ```

## Summary

**The Golden Rule:** If your edge function supports DELETE, PUT, or PATCH, you MUST include `'Access-Control-Allow-Methods'` in your CORS headers.

**Quick Check:** Before deploying any edge function, verify:
- ✅ `Access-Control-Allow-Methods` includes all HTTP methods
- ✅ OPTIONS request handler exists
- ✅ All responses include `...corsHeaders`
- ✅ Error responses include CORS headers

---

**Last Updated:** October 10, 2025
**Related Files:** `supabase/functions/chat-conversations/index.ts`
