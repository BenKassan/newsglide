# Fix for AI Chat 500 Error

## Problem Identified
The AI chat is returning a 500 Internal Server Error because the `ANTHROPIC_API_KEY` environment variable is not set in your Supabase edge functions.

## Solution: Set the ANTHROPIC_API_KEY in Supabase

### Step-by-Step Instructions:

1. **Get an Anthropic API Key** (if you don't have one):
   - Go to: https://console.anthropic.com/
   - Sign up or log in
   - Navigate to API Keys section
   - Create a new API key
   - Copy the key (starts with `sk-ant-api...`)

2. **Add the API Key to Supabase**:
   - Go to your Supabase Dashboard: https://supabase.com/dashboard/project/icwusduvaohosrvxlahh/settings/functions
   - Click on the **"Functions"** section in the left sidebar
   - Look for **"Edge Function Secrets"** or **"Environment Variables"** section
   - Click **"Add new secret"** or **"+ New secret"**
   - Add the following:
     - **Name**: `ANTHROPIC_API_KEY`
     - **Value**: `[paste your Anthropic API key here]`
   - Click **Save** or **Add**

3. **Verify the Edge Function is Deployed**:
   Run these commands in your terminal:
   ```bash
   cd "/Users/elliotgreenbaum/NewsGlide Sep 2025"

   # Deploy the chat-message function (this will use the new API key)
   supabase functions deploy chat-message --no-verify-jwt
   ```

4. **Test the Chat**:
   - Refresh your browser at http://localhost:8083/ai-chat (or wherever your app is running)
   - Try sending a message
   - It should now work!

## Alternative: Local Testing (Optional)
If you want to test locally first, you can run:
```bash
# Create a .env file for local functions
echo "ANTHROPIC_API_KEY=your_api_key_here" > supabase/.env.local

# Serve functions locally
supabase functions serve --env-file supabase/.env.local
```

## Verification
After setting the API key, the edge function logs should show:
- "Anthropic API key found: sk-ant-api..."
- "Claude API call successful, starting stream..."

Instead of the current error:
- "ANTHROPIC_API_KEY not found in environment"

## Important Notes
- The API key must be set as a **secret/environment variable** in Supabase, not in your local .env file
- The key should start with `sk-ant-api`
- Edge functions automatically have access to secrets you set in the Supabase dashboard
- You may need to wait 1-2 minutes after setting the secret for it to propagate

## Still Having Issues?
Check the edge function logs:
```bash
supabase functions logs chat-message --tail
```

This will show you real-time logs to help debug any remaining issues.