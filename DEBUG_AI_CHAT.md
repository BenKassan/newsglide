# AI Chat Debugging Guide

## 1. First, Check Supabase Function Logs

Go to your Supabase Dashboard:
1. Navigate to **Functions** → **Logs**
2. Look for `chat-message` function logs
3. Check for any error messages (they'll be in red)

Common errors you might see:
- "Anthropic API key not configured" - API key not found
- "Claude API error" - Invalid API key or API issue
- Auth errors - User authentication issues

## 2. Verify Your API Key Format

Your Anthropic API key should:
- Start with `sk-ant-api03-`
- Be about 95 characters long
- Have no spaces or quotes around it

❌ Wrong formats:
- `"sk-ant-api03-..."` (has quotes)
- `sk-ant-api03-... ` (has trailing space)
- `your-api-key-here` (placeholder text)

✅ Correct format:
- `sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## 3. Redeploy Edge Functions After Setting API Key

**IMPORTANT**: You need to redeploy the edge functions after adding the API key!

Run these commands in your terminal:

```bash
cd /Users/elliotgreenbaum/NewsGlide\ Sep\ 2025

# Redeploy chat-message function
npx supabase functions deploy chat-message --no-verify-jwt

# Redeploy chat-conversations function
npx supabase functions deploy chat-conversations --no-verify-jwt
```

## 4. Test with a Debug Version

Let's create a simple test to verify the API key is working. Run this SQL in Supabase:

```sql
-- Check if your user has preferences
SELECT * FROM user_preferences
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE');

-- If no results, create one manually:
INSERT INTO user_preferences (
  user_id,
  default_reading_level,
  email_notifications,
  preferred_news_sources,
  interest_profile
)
SELECT
  id,
  'base',
  true,
  ARRAY[]::text[],
  '{"topics": {}, "categories": {}}'::jsonb
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE'
ON CONFLICT (user_id) DO NOTHING;
```

## 5. Check Browser Console

Open your browser's developer console (F12 or Cmd+Option+I) and look for:
1. Network tab → Filter by "chat-message"
2. Check the request status (should be 200)
3. Click on the request → Response tab
4. Look for any error messages

## 6. Test API Key Directly (Optional)

If you want to verify your API key works, you can test it directly:

```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_API_KEY_HERE" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Say hello"}]
  }'
```

If this returns an error, your API key might be invalid.

## 7. Common Issues and Solutions

### Issue: "Anthropic API key not configured"
**Solution**: Redeploy the edge functions after setting the API key (see step 3)

### Issue: 401 Unauthorized from Claude API
**Solution**: Your API key is invalid. Get a new one from https://console.anthropic.com/

### Issue: 500 Internal Server Error
**Solution**: Check Supabase function logs for specific error

### Issue: No response but no errors
**Solution**: The streaming might be failing. Check browser console for streaming errors

## 8. Nuclear Option - Fresh Deploy

If nothing else works, do a complete fresh deploy:

```bash
cd /Users/elliotgreenbaum/NewsGlide\ Sep\ 2025

# Delete and redeploy functions
npx supabase functions delete chat-message
npx supabase functions delete chat-conversations

# Wait 30 seconds

# Deploy fresh
npx supabase functions deploy chat-message --no-verify-jwt
npx supabase functions deploy chat-conversations --no-verify-jwt
```

## 9. What to Share If You Need More Help

If it's still not working, please share:
1. **Function logs**: Screenshot from Supabase Functions → Logs
2. **Browser console errors**: Screenshot of any red errors
3. **Network response**: Screenshot of the chat-message request response
4. **API key first 10 characters**: Just to verify format (e.g., "sk-ant-api")

## Important Notes

- You do NOT need a separate API key - one ANTHROPIC_API_KEY is enough
- The API key must be set as an environment variable, not in code
- Edge functions must be redeployed after adding/changing the API key
- The free tier of Claude API should work fine for testing