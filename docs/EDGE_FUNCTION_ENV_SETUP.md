# Edge Function Environment Variables Setup

## Problem Diagnosis
The 502 error was caused by missing environment variables in the Supabase Edge Function. The function needs API keys to:
1. Search for news articles (Brave or Serper API)
2. Synthesize the news content (OpenAI API)

## Required Environment Variables

You need to set these environment variables in your Supabase Dashboard:

### 1. OPENAI_API_KEY (Required)
- **Purpose**: Used to synthesize news articles using GPT-4
- **How to get**:
  1. Go to https://platform.openai.com/api-keys
  2. Create a new API key
  3. Copy the key (starts with `sk-`)

### 2. Search API (At least one required)

#### Option A: BRAVE_SEARCH_API_KEY
- **Purpose**: Search for recent news articles
- **How to get**:
  1. Go to https://brave.com/search/api/
  2. Sign up for an API account
  3. Generate an API key
- **Cost**: Free tier available (2000 queries/month)

#### Option B: SERPER_API_KEY
- **Purpose**: Alternative search for news articles
- **How to get**:
  1. Go to https://serper.dev/
  2. Sign up for an account
  3. Generate an API key
- **Cost**: Free tier available (2500 queries/month)

## How to Set Environment Variables in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/dligacdippwxeppogmzq

2. Navigate to: **Edge Functions** → **news-synthesis** → **Secrets**

3. Add the following secrets:
   ```
   OPENAI_API_KEY=sk-your-openai-api-key-here
   BRAVE_SEARCH_API_KEY=your-brave-api-key-here
   ```
   OR
   ```
   OPENAI_API_KEY=sk-your-openai-api-key-here
   SERPER_API_KEY=your-serper-api-key-here
   ```

4. Click **Save**

5. The Edge Function will automatically use the new environment variables

## Improvements Made

### Better Error Handling
- Added upfront environment variable checking
- Returns 503 status code for configuration errors
- Provides clear error messages indicating which API keys are missing
- Logs environment status for debugging

### Client-Side Updates
- Added specific handling for 503 configuration errors
- Shows user-friendly message when service is not configured
- Maintains retry logic for temporary errors

## Testing the Fix

After setting the environment variables:

1. Try searching for a news topic in the app
2. Check the browser console for any errors
3. If you still see errors, check:
   - The API keys are valid and active
   - The API keys have available quota
   - The Supabase Edge Function logs for specific error messages

## Monitoring

To view Edge Function logs:
1. Go to Supabase Dashboard
2. Navigate to Edge Functions → news-synthesis
3. Click on "Logs" to see real-time function logs
4. Look for "Environment check" logs to verify API keys are detected

## Troubleshooting

If you continue to see errors after setting environment variables:

1. **"OpenAI API key not configured"**: OPENAI_API_KEY is missing or invalid
2. **"No search API configured"**: Neither BRAVE_SEARCH_API_KEY nor SERPER_API_KEY is set
3. **Rate limit errors**: Your API quota may be exhausted
4. **Timeout errors**: The topic might be too complex or APIs are slow

## Cost Considerations

- **OpenAI**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens (GPT-4o-mini)
- **Brave Search**: Free tier: 2000 queries/month, then $5/month for 5000 queries
- **Serper**: Free tier: 2500 queries/month, then $50/month for 5000 queries

## Security Notes

- Never commit API keys to version control
- Use Supabase Secrets for all sensitive keys
- Rotate API keys regularly
- Monitor usage to detect any anomalies