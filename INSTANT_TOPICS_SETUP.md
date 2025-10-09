# Instant Topic Generation Setup Guide

This guide explains how to deploy and initialize the instant topic generation system.

## 🏗️ Architecture Overview

The system uses **cache-first serving** for instant (<100ms) topic generation:

1. **Pre-generation**: Topics are generated ahead of time and stored in cache
2. **Instant serving**: When user clicks "Generate", serve from cache immediately
3. **Background refill**: After serving, automatically generate next set in background
4. **Progressive creativity**: AI becomes more creative as generation count increases

## 📋 Deployment Steps

### Step 1: Deploy Database Migrations

Run the migration to create cache tables:

```bash
cd newsglide
supabase db push
```

This creates:
- `discover_topic_cache` - Stores pre-generated topic sets
- `discover_generation_history` - Tracks all generations for duplicate prevention
- Helper functions for cache management

### Step 2: Deploy Edge Functions

Deploy the two new Edge Functions:

```bash
# Deploy topic generation function
supabase functions deploy generate-discover-topics

# Deploy cache seeding function
supabase functions deploy seed-topic-cache
```

### Step 3: Seed the Cache

Run the seeding script to pre-generate topics (generations 1-5 for all categories):

```bash
npm run seed-cache
```

Or manually:

```bash
npx tsx scripts/seed-topic-cache.ts
```

This will:
- Generate 5 sets for each of 21 categories = 105 cache entries
- Take approximately 3-5 minutes
- Cost ~$3-4 in OpenAI API calls
- Provide instant serving for the first 5 "Generate" clicks per category

## ⚡ Performance Characteristics

### Cache Hit (95% of requests)
- **Response time**: <50ms
- **User experience**: Instant, no loading
- **Cost**: Free (serving from database)

### Cache Miss (5% of requests)
- **Response time**: 1-2 seconds
- **User experience**: Fast generation
- **Cost**: ~$0.02-0.03 per generation
- **Model**: GPT-3.5-turbo (fast & cheap)

### Hover Prefetch
- Starts generation when user hovers over button
- By the time they click, generation is 50-80% complete
- Perceived latency: near-zero

## 🎨 Creativity Progression

The system automatically increases creativity over generations:

| Generation | Creativity Level | Model | Style |
|-----------|-----------------|-------|-------|
| 1-3 | 0.2-0.4 | GPT-3.5 | Mainstream topics |
| 4-6 | 0.5-0.7 | GPT-3.5 | Specific, emerging topics |
| 7-10 | 0.8-0.9 | GPT-4 | Creative, interdisciplinary |
| 11+ | 0.9-0.95 | GPT-4 | Cutting-edge, innovative |

## 🔄 Cache Maintenance

### Automatic Refill
- When a cache entry is consumed, background refill triggers automatically
- Maintains 1-2 sets ahead of user
- Non-blocking, user never waits

### Manual Refresh
To manually refresh the cache (e.g., daily cron job):

```bash
curl -X POST https://your-project.supabase.co/functions/v1/seed-topic-cache \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"generations_count": 5, "parallel": true}'
```

### Monitoring Cache Status

Check cache health:

```sql
-- See cache coverage per category
SELECT
  category_name,
  COUNT(*) as cached_sets,
  SUM(CASE WHEN is_consumed THEN 1 ELSE 0 END) as consumed,
  SUM(CASE WHEN NOT is_consumed THEN 1 ELSE 0 END) as available
FROM discover_topic_cache
GROUP BY category_name
ORDER BY available ASC;

-- See generation history
SELECT
  category_name,
  MAX(generation_number) as max_generation,
  COUNT(*) as total_generations
FROM discover_generation_history
GROUP BY category_name
ORDER BY max_generation DESC;
```

## 💰 Cost Estimates

### Initial Seeding
- 21 categories × 5 generations = 105 API calls
- Cost: ~$3-4 one-time
- Run weekly/monthly as needed

### Ongoing Usage
- Most requests: Free (cache hits)
- Cache misses: ~$0.02-0.03 per generation
- Expected monthly cost: $100-150 for moderate traffic

### Cost Optimization Tips
1. Seed cache during off-peak hours
2. Use GPT-3.5-turbo for generations 1-6 (cheaper)
3. Only switch to GPT-4 for high creativity (gen 7+)
4. Monitor cache hit rate and adjust pre-generation count

## 🐛 Troubleshooting

### Cache Not Working
```bash
# Check if cache tables exist
psql $DATABASE_URL -c "\dt discover_*"

# Verify cache has entries
psql $DATABASE_URL -c "SELECT COUNT(*) FROM discover_topic_cache;"
```

### Edge Functions Not Responding
```bash
# Check function logs
supabase functions logs generate-discover-topics

# Test function directly
curl -X POST https://your-project.supabase.co/functions/v1/generate-discover-topics \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"category_name": "Technology News", "generation_number": 1}'
```

### Slow Generation
- Check OpenAI API status
- Verify internet connectivity
- Consider switching to GPT-3.5-turbo (faster)
- Enable hover prefetch for perceived speed

## 🚀 Next Steps

After deployment:

1. ✅ Run migration
2. ✅ Deploy Edge Functions
3. ✅ Seed cache with initial topics
4. 📊 Monitor performance and cache hit rates
5. 🔄 Set up daily/weekly cache refresh cron job
6. 💰 Monitor OpenAI API costs

## 📞 Support

If you encounter issues:
- Check Supabase dashboard logs
- Review OpenAI API usage dashboard
- Verify environment variables are set correctly
- Check network connectivity and API keys
