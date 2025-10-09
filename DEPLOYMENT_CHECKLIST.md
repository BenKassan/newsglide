# Deployment Checklist

## Pre-Implementation Checklist

Before implementing any new feature, ensure:

### 1. Dependencies
- [ ] All npm packages are installed: `npm install`
- [ ] No version conflicts in package.json
- [ ] Run `npm list` to verify dependency tree

### 2. Import Paths
- [ ] Use consistent import paths across all files
- [ ] Prefer `@shared/lib/supabase` for Supabase client
- [ ] Prefer `@features/auth` for auth context
- [ ] Run TypeScript check: `npm run typecheck`

### 3. Browser Compatibility
- [ ] Check caniuse.com for new Web APIs
- [ ] Add polyfills for features not supported in target browsers
- [ ] Test in multiple browsers (Chrome, Firefox, Safari, Edge)

### 4. Database Changes
- [ ] Create migration file with proper timestamp
- [ ] Run migration locally: `npx supabase migration up`
- [ ] Verify columns exist: `npx supabase db dump`
- [ ] Update TypeScript types: `npm run generate-types`

### 5. Edge Functions
- [ ] Test edge function locally: `npx supabase functions serve`
- [ ] Deploy edge function: `npx supabase functions deploy function-name`
- [ ] Verify function is accessible

### 6. Environment Variables
- [ ] All required env vars are set in `.env.local`
- [ ] Document any new env vars in `.env.example`
- [ ] Verify env vars are loaded correctly

## Post-Implementation Verification

After implementing a feature:

### 1. Type Safety
```bash
npm run typecheck
```

### 2. Linting
```bash
npm run lint
```

### 3. Build Test
```bash
npm run build
```

### 4. Local Testing
- [ ] Test all new functionality
- [ ] Test existing functionality (regression)
- [ ] Check browser console for errors
- [ ] Check network tab for failed requests

### 5. Database Verification
```bash
# Check if migrations are applied
npx supabase migration list

# Verify table structure
npx supabase db dump | grep user_preferences
```

## Common Import Conventions

### Supabase Client
```typescript
// ✅ Correct
import { supabase } from '@/integrations/supabase/client'

// ❌ Avoid (these paths don't exist)
import { supabase } from '@shared/lib/supabase'
import { supabase } from '@/lib/supabase'
```

### Auth Context
```typescript
// ✅ Correct
import { useAuth } from '@features/auth'

// ❌ Avoid (this path doesn't exist)
import { useAuth } from '@shared/contexts/AuthContext'
```

### Services
```typescript
// ✅ Correct
import { personalizationService } from '@/services/personalizationService'
```

## Common Import Errors and Fixes

### Error: "Failed to resolve import '@shared/lib/supabase'"
**Fix**: Use `@/integrations/supabase/client` instead

### Error: "Failed to resolve import '@shared/contexts/AuthContext'"
**Fix**: Use `@features/auth` instead

### Error: "crypto.randomUUID is not a function"
**Fix**: Import and use `generateUUID` from `@/utils/polyfills`

## Error Prevention Scripts

### 1. Pre-commit Hook (add to package.json)
```json
{
  "scripts": {
    "pre-commit": "npm run typecheck && npm run lint"
  }
}
```

### 2. Migration Check Script
```bash
#!/bin/bash
# check-migrations.sh
echo "Checking database migrations..."
npx supabase migration list | grep -E "(applied|pending)"
```

## Browser Compatibility Utilities

### Add to src/utils/polyfills.ts
```typescript
// Polyfill for crypto.randomUUID
if (!crypto.randomUUID) {
  crypto.randomUUID = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}
```

## Troubleshooting Guide

### Issue: "Cannot find module" error
1. Check import path matches tsconfig paths
2. Verify file exists at the path
3. Run `npm install` if external package
4. Clear build cache: `rm -rf node_modules/.vite`

### Issue: "Column does not exist" error
1. Check migration files in supabase/migrations
2. Run migrations: `npx supabase migration up`
3. Verify in Supabase dashboard

### Issue: "Edge function not found"
1. Check function exists in supabase/functions
2. Deploy function: `npx supabase functions deploy [name]`
3. Check function logs in Supabase dashboard

### Issue: "Type error" after database changes
1. Regenerate types: `npm run generate-types`
2. Restart TypeScript server in VSCode
3. Check for type conflicts

---

# 🚀 Instant Topic Generation - Deployment Checklist

## Pre-Deployment

### Environment Variables
- [ ] `OPENAI_API_KEY` set in Supabase secrets
- [ ] `SUPABASE_URL` configured
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured
- [ ] `SUPABASE_ANON_KEY` configured

Verify with: `supabase secrets list`

## Deployment Steps

### 1. Database Migration
```bash
cd newsglide
supabase db push
```
- [ ] Migration completed successfully
- [ ] Tables created: `discover_topic_cache`, `discover_generation_history`
- [ ] Helper functions created (4 total)
- [ ] RLS policies enabled

### 2. Edge Functions
```bash
supabase functions deploy generate-discover-topics
supabase functions deploy seed-topic-cache
```
- [ ] Both functions deployed without errors
- [ ] Test call to generate-discover-topics succeeds
- [ ] Functions appear in Supabase dashboard

### 3. Seed Initial Cache
```bash
npm run seed-cache
```
- [ ] Seeding completed (~105 cache entries expected)
- [ ] All 21 categories have 5 sets each
- [ ] No errors in output
- [ ] Duration: 3-5 minutes

### 4. Deploy Frontend
```bash
npm run build
# Deploy to hosting provider
```
- [ ] Build successful
- [ ] No TypeScript errors
- [ ] Deployed to production

## Post-Deployment Verification

### Test Instant Generation
1. [ ] Visit Discover page
2. [ ] Hover over "Generate New Topics" button (feels responsive)
3. [ ] Click button - topics appear instantly (<100ms)
4. [ ] Click again - still instant
5. [ ] Click 5+ times to exhaust cache
6. [ ] Real-time generation works (1-2 seconds)
7. [ ] Topics are unique (no duplicates)

### Monitor Performance
```sql
-- Check cache status
SELECT COUNT(*) FROM discover_topic_cache WHERE NOT is_consumed;
-- Should be: ~100+

-- Check per-category coverage
SELECT category_name, COUNT(*) as available_sets
FROM discover_topic_cache
WHERE NOT is_consumed
GROUP BY category_name;
-- Should show: 4-5 sets per category
```

### Monitor Costs
- [ ] Check OpenAI usage dashboard
- [ ] First day cost: ~$5-10 expected
- [ ] Monitor for unexpected spikes

## Success Criteria ✅

After 24 hours:
- [ ] Cache hit rate >90%
- [ ] Average response time <100ms
- [ ] Zero duplicate topics reported
- [ ] OpenAI costs within budget
- [ ] No P0/P1 bugs
- [ ] Positive user feedback on speed

## Troubleshooting

### Cache Not Populating
```bash
# Re-run seeding
npm run seed-cache

# Check logs
supabase functions logs seed-topic-cache
```

### Slow Generation
- Check OpenAI status: https://status.openai.com
- Verify Edge Function logs for errors
- Test hover prefetch is working

### Duplicate Topics
```sql
-- Check for duplicates in history
SELECT category_name, unnest(topic_names) as topic, COUNT(*)
FROM discover_generation_history
GROUP BY category_name, topic
HAVING COUNT(*) > 1;
```

## Support
- OpenAI: https://help.openai.com
- Supabase: https://supabase.com/support

---

**Status: Ready for Deployment** ✨

Expected result: Instant (<100ms) topic generation with infinite unique topics!