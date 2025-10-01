# Testing AI Improvements Locally

This guide helps you test the AI improvements made to reduce "AI-ey" sounding content.

## Quick Start

### 1. Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Or using npm
npm install -g supabase
```

### 2. Set Up Environment Variables

```bash
# Copy the example env file
cp supabase/functions/.env.local.example supabase/functions/.env.local

# Edit it with your API keys
# At minimum, you need:
# - OPENAI_API_KEY
# - BRAVE_SEARCH_API_KEY (or SERPER_API_KEY)
```

### 3. Start Supabase Locally

```bash
# Start Supabase (database, auth, storage, etc.)
supabase start

# Note the anon key from the output - you'll need it!
```

### 4. Serve Edge Functions

```bash
# In a new terminal, serve the edge functions with your environment variables
supabase functions serve --env-file ./supabase/functions/.env.local
```

### 5. Update Frontend Environment

Create or update `.env.local` in the root directory:

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon-key-from-supabase-start>
```

### 6. Run the Frontend

```bash
# In another terminal
npm run dev
```

## Testing the Improvements

### Method 1: Use the Web App

1. Open http://localhost:5173
2. Search for any news topic
3. Observe the generated content for:
   - Natural language flow
   - Absence of phrases like "It's important to note", "Moreover", etc.
   - Varied sentence structures
   - Conversational tone

### Method 2: Use the Test Script

1. Update the `ANON_KEY` in `test-ai-improvements.js`
2. Run the test script:

```bash
node test-ai-improvements.js
```

This will test:
- News synthesis with quality checks
- Q&A responses for natural tone
- Debate generation with authentic speech patterns

### Method 3: Direct API Testing

```bash
# Test news synthesis
curl -X POST http://localhost:54321/functions/v1/news-synthesis \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"topic": "AI regulation debate"}'

# Test Q&A
curl -X POST http://localhost:54321/functions/v1/news-qa \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "AI regulation",
    "question": "What are the main concerns?",
    "context": {
      "headline": "New AI Regulations Proposed",
      "summaryPoints": ["Point 1", "Point 2", "Point 3"],
      "sources": []
    }
  }'
```

## What's Changed

### 1. **Temperature Settings**
- News synthesis: 0.2 → 0.7
- Q&A: 0.5 → 0.7
- Debates: 0.8 → 0.85

### 2. **Prompt Engineering**
- Added specific phrases to avoid
- Included style examples (good vs bad)
- Removed rigid word count requirements
- Emphasized natural, conversational tone

### 3. **Post-Processing**
- `cleanAIPhrasings()` function removes common AI phrases
- Automatically applied to all generated content

### 4. **Model Options**
- Comments added for easy testing of gpt-4-turbo or gpt-4o
- Current: gpt-4o-mini (cost-effective)
- Upgrade path clearly documented

## A/B Testing

To compare old vs new behavior:

1. Temporarily revert a change (e.g., set temperature back to 0.2)
2. Generate content with topic A
3. Restore the improvement
4. Generate content with topic A again
5. Compare the outputs side-by-side

## Monitoring Quality

Look for these improvements:
- ✅ No "Furthermore", "Moreover", "In conclusion"
- ✅ Varied paragraph lengths (not all 3-4 sentences)
- ✅ Natural transitions between ideas
- ✅ Conversational tone in Q&A
- ✅ Authentic speech patterns in debates
- ✅ Headlines that grab attention
- ✅ ELI5 explanations that actually sound simple

## Troubleshooting

### Edge Functions Not Working
```bash
# Check if Supabase is running
supabase status

# Check logs
supabase functions logs
```

### Environment Variables Not Loading
- Ensure `.env.local` is in `supabase/functions/` directory
- Check file permissions
- Verify API keys are correct

### Still Sounds AI-ey?
1. Try increasing temperature further (up to 0.9)
2. Test with gpt-4-turbo for comparison
3. Add more phrases to the `cleanAIPhrasings()` function

## Next Steps

After testing, if satisfied with improvements:
1. Deploy to staging/production
2. Monitor user feedback
3. A/B test with real users
4. Adjust temperature and prompts based on results