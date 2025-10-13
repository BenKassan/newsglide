# Testing Personalization System - Complete Guide

**Purpose:** Verify that all personalization and tracking features are working correctly after fix deployment
**Time Required:** 15-20 minutes
**Prerequisites:** Database schema deployed via `FIX_PERSONALIZATION_SYSTEM.sql`

---

## 🎯 Testing Objectives

1. ✅ Verify interaction tracking works (no 500 errors)
2. ✅ Verify saved articles work (no 406 errors)
3. ✅ Verify interest profile updates correctly
4. ✅ Verify engagement analytics calculate properly
5. ✅ Verify circuit breaker pattern works correctly

---

## 📋 Pre-Testing Checklist

### Before Starting Tests

- [ ] Run `FIX_PERSONALIZATION_SYSTEM.sql` in Supabase Dashboard
- [ ] Verify all tables created successfully (see completion message)
- [ ] Refresh your application (hard reload: Cmd+Shift+R)
- [ ] Open browser developer console (F12)
- [ ] Clear console (Cmd+K)

---

## 🧪 Test Suite

### Test 1: Article View Tracking

**Objective:** Verify `view` interaction is recorded

**Steps:**
1. Navigate to NewsGlide homepage
2. Generate a new article (e.g., "artificial intelligence news")
3. Check console for: `✅ Interaction tracked: view`
4. Verify in Supabase Dashboard:
   ```sql
   SELECT * FROM article_interactions
   WHERE action_type = 'view'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

**Expected Results:**
- ✅ Console shows "Interaction tracked: view"
- ✅ Database shows new row with action_type = 'view'
- ✅ Metadata includes device type and viewport dimensions
- ❌ NO 500 errors
- ❌ NO circuit breaker warnings

**If Failed:**
- Check Supabase logs for edge function errors
- Verify `article_interactions` table exists
- Check RLS policies allow your user_id

---

### Test 2: Reading Tracking (Scroll Depth)

**Objective:** Verify `read` interaction after engagement

**Steps:**
1. Stay on the article from Test 1
2. Scroll down through >50% of the article
3. Wait 10 seconds
4. Navigate away or close tab
5. Check database:
   ```sql
   SELECT action_type, scroll_depth, duration_seconds
   FROM article_interactions
   WHERE action_type IN ('view', 'read')
   ORDER BY created_at DESC
   LIMIT 10;
   ```

**Expected Results:**
- ✅ Both `view` and `read` events recorded
- ✅ `scroll_depth` >= 0.5
- ✅ `duration_seconds` > 0
- ✅ Console shows "Interaction tracked: read"

**Trigger Conditions:**
- Duration > 30 seconds OR
- Scroll depth > 50%

---

### Test 3: Reading Level Change Tracking

**Objective:** Verify level switching is tracked

**Steps:**
1. Generate an article
2. Switch from "Base" to "ELI5" using the toggle
3. Check console for: `✅ Interaction tracked: reading_level_change`
4. Verify in database:
   ```sql
   SELECT action_type, reading_level, metadata
   FROM article_interactions
   WHERE action_type = 'reading_level_change'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

**Expected Results:**
- ✅ Event recorded with correct `reading_level`
- ✅ `metadata.previousLevel` shows old level
- ✅ No console errors

---

### Test 4: Interest Profile Updates

**Objective:** Verify user preferences are learned from interactions

**Steps:**
1. Read an article about "machine learning" (scroll >50%, wait >30s)
2. Save the article if possible (extra weight)
3. Check user_preferences:
   ```sql
   SELECT interest_profile
   FROM user_preferences
   WHERE user_id = auth.uid();
   ```

**Expected Results:**
```json
{
  "topics": {
    "machine": 0.1,
    "learning": 0.1
  },
  "categories": {},
  "engagement": {
    "clicks": 1,
    "reads": 1,
    "saves": 0  // or 1 if you saved
  }
}
```

**Weight Rules:**
- Read: +0.1 per keyword
- Save: +0.2 per keyword
- Max: 1.0 per keyword

---

### Test 5: Saved Articles (406 Fix Verification)

**Objective:** Verify saved_articles table works correctly

**Steps:**
1. Generate an article
2. Click "Save" button (if UI exists)
3. Check console - should see NO 406 errors
4. Verify in database:
   ```sql
   SELECT id, topic, created_at
   FROM saved_articles
   WHERE user_id = auth.uid()
   ORDER BY created_at DESC;
   ```

**Expected Results:**
- ✅ Article saved successfully
- ✅ No 406 errors in console
- ✅ Database row created
- ✅ Reload page shows article still saved

**Common Issues:**
- 406 error → RLS policy too restrictive
- Duplicate error → UNIQUE constraint working correctly

---

### Test 6: Source Click Tracking

**Objective:** Verify source link clicks are tracked

**Steps:**
1. On an article, click a news source link
2. Check console for: `✅ Interaction tracked: source_click`
3. Verify in database:
   ```sql
   SELECT action_type, source_outlet, created_at
   FROM article_interactions
   WHERE action_type = 'source_click'
   AND user_id = auth.uid()
   ORDER BY created_at DESC
   LIMIT 5;
   ```

**Expected Results:**
- ✅ Event recorded with correct `source_outlet`
- ✅ Console shows success message

---

### Test 7: Abandon Tracking (Quick Exit)

**Objective:** Verify quick abandons are tracked as negative signals

**Steps:**
1. Generate an article
2. **Immediately** close or navigate away (< 10 seconds)
3. Check database:
   ```sql
   SELECT action_type, duration_seconds, metadata
   FROM article_interactions
   WHERE action_type = 'abandon'
   AND user_id = auth.uid()
   ORDER BY created_at DESC
   LIMIT 5;
   ```

**Expected Results:**
- ✅ `abandon` event recorded
- ✅ `duration_seconds` < 10
- ✅ `metadata.negative_signal` = true

---

### Test 8: Engagement Score Calculation

**Objective:** Verify analytics view calculates correctly

**Steps:**
1. Complete several interactions on the same article:
   - View it
   - Read it (scroll + time)
   - Click a source
   - Maybe view debate
2. Query engagement summary:
   ```sql
   SELECT
     topic,
     view_count,
     read_count,
     source_clicks,
     engagement_score
   FROM article_engagement_summary
   WHERE user_id = auth.uid()
   ORDER BY engagement_score DESC;
   ```

**Expected Formula:**
```
engagement_score = MIN(100,
  (reads × 30) +
  (saves × 20) +
  (avg_duration / 10) +
  (max_scroll × 20) +
  (source_clicks × 10) +
  (debate_views × 10)
)
```

**Expected Results:**
- ✅ Score > 0 for engaged articles
- ✅ Higher engagement → higher score
- ✅ Max score capped at 100

---

### Test 9: Circuit Breaker Pattern

**Objective:** Verify circuit breaker prevents console spam

**Steps (Simulated Failure):**
1. **Before deploying schema**, generate an article
2. Observe console:
   - Error 1: `Tracking error 1/3`
   - Error 2: `Tracking error 2/3`
   - Error 3: `⚠️ Interaction tracking temporarily disabled...`
3. Generate another article
4. Observe: No more errors (circuit OPEN)
5. Wait 60 seconds
6. Generate another article
7. Observe: `🔄 Attempting to resume...` (HALF_OPEN)

**Expected Behavior:**
- ✅ First 3 errors logged
- ✅ After 3, circuit opens with clear warning
- ✅ Warning explains the fix (see PERSONALIZATION_ERRORS_ANALYSIS.md)
- ✅ No spam while circuit is open
- ✅ Automatic retry after 60 seconds

**After Fix Deployed:**
1. Hard reload page (Cmd+Shift+R)
2. Generate article
3. Observe: `✅ Interaction tracked: view`
4. Circuit breaker automatically returns to CLOSED state

---

### Test 10: Multiple Session Tracking

**Objective:** Verify sessions are tracked separately

**Steps:**
1. Generate and read Article A
2. Close tab
3. Open new tab, generate and read Article B
4. Query database:
   ```sql
   SELECT topic, action_type, created_at
   FROM article_interactions
   WHERE user_id = auth.uid()
   ORDER BY created_at DESC
   LIMIT 20;
   ```

**Expected Results:**
- ✅ Both articles tracked
- ✅ Timestamps show correct sequence
- ✅ Each article has its own interaction chain

---

## 📊 Analytics Queries

### Most Engaged Topics
```sql
SELECT
  topic,
  engagement_score,
  read_count,
  avg_read_time
FROM article_engagement_summary
WHERE user_id = auth.uid()
ORDER BY engagement_score DESC
LIMIT 10;
```

### Abandonment Rate Analysis
```sql
SELECT
  topic,
  abandon_count,
  view_count,
  ROUND(abandon_count::numeric / NULLIF(view_count, 0), 2) as abandon_rate
FROM article_engagement_summary
WHERE user_id = auth.uid()
  AND view_count > 0
ORDER BY abandon_rate DESC;
```

### Reading Preferences
```sql
SELECT
  reading_level,
  COUNT(*) as changes
FROM article_interactions
WHERE user_id = auth.uid()
  AND action_type = 'reading_level_change'
GROUP BY reading_level
ORDER BY changes DESC;
```

### Source Trust Patterns
```sql
SELECT
  source_outlet,
  COUNT(*) as clicks
FROM article_interactions
WHERE user_id = auth.uid()
  AND action_type = 'source_click'
GROUP BY source_outlet
ORDER BY clicks DESC
LIMIT 10;
```

### Interest Profile Evolution
```sql
SELECT
  user_id,
  interest_profile,
  updated_at
FROM user_preferences
WHERE user_id = auth.uid();
```

---

## 🐛 Troubleshooting

### Still Seeing 500 Errors?

**Check:**
1. Database schema deployed?
   ```sql
   SELECT * FROM information_schema.tables
   WHERE table_name = 'article_interactions';
   ```

2. RLS policies correct?
   ```sql
   SELECT * FROM pg_policies
   WHERE tablename = 'article_interactions';
   ```

3. Edge function deployed?
   - Check Supabase Dashboard → Functions → track-interaction

4. Supabase logs
   - Dashboard → Logs → Edge Functions
   - Look for actual error message

---

### Still Seeing 406 Errors?

**Check:**
1. saved_articles table exists?
   ```sql
   SELECT * FROM information_schema.tables
   WHERE table_name = 'saved_articles';
   ```

2. Query the table directly:
   ```sql
   SELECT * FROM saved_articles
   WHERE user_id = auth.uid();
   ```

3. If error persists, check RLS:
   ```sql
   SELECT * FROM pg_policies
   WHERE tablename = 'saved_articles';
   ```

---

### Circuit Breaker Won't Reset?

**Force Reset:**
1. Hard reload page (Cmd+Shift+R)
2. Check status in console:
   ```javascript
   import { getTrackingStatus } from '@/services/articleInteractionService';
   console.log('Circuit breaker status:', getTrackingStatus());
   ```

3. If stuck OPEN:
   - Wait full 60 seconds
   - Generate new article
   - Should attempt retry

---

### Interest Profile Not Updating?

**Check:**
1. Did you actually complete a `read` (>30s or >50% scroll)?
2. Check edge function logs for errors
3. Verify column exists:
   ```sql
   SELECT column_name
   FROM information_schema.columns
   WHERE table_name = 'user_preferences'
   AND column_name = 'interest_profile';
   ```

4. Check current value:
   ```sql
   SELECT interest_profile
   FROM user_preferences
   WHERE user_id = auth.uid();
   ```

---

## ✅ Success Criteria

### All Tests Pass If:

- [ ] No 500 errors on track-interaction
- [ ] No 406 errors on saved_articles
- [ ] Console shows "✅ Interaction tracked" messages
- [ ] Database has interaction records
- [ ] Interest profile updates with keywords
- [ ] Engagement scores calculate correctly
- [ ] Circuit breaker prevents error spam
- [ ] All analytics queries return data

### System is Fully Functional When:

1. **Console is clean** during normal use
2. **Database accumulates** interaction data
3. **Analytics queries** return meaningful insights
4. **Circuit breaker** only activates if real problems exist
5. **User experience** is smooth and uninterrupted

---

## 🎉 Next Steps After Testing

### If All Tests Pass:

1. **Monitor Production**
   - Watch for any new error patterns
   - Check interaction data accumulation
   - Verify performance is good

2. **Enable Features**
   - Build personalized recommendations
   - Create engagement dashboards
   - Implement A/B testing

3. **Iterate**
   - Add more interaction types as needed
   - Refine engagement score formula
   - Improve analytics queries

### If Tests Fail:

1. **Document the failure** in a GitHub issue
2. **Check Supabase logs** for root cause
3. **Review** PERSONALIZATION_ERRORS_ANALYSIS.md
4. **Ask for help** if needed

---

## 📞 Getting Help

If you encounter issues:

1. **Check Documentation:**
   - `PERSONALIZATION_ERRORS_ANALYSIS.md` - Error details and root causes
   - `FIX_PERSONALIZATION_SYSTEM.sql` - Database schema
   - `scripts/deploy-with-validation.sh` - Deployment script

2. **Collect Information:**
   - Browser console screenshot
   - Supabase logs (Dashboard → Logs)
   - SQL query results showing the issue
   - Step-by-step reproduction

3. **Common Solutions:**
   - Hard reload (Cmd+Shift+R)
   - Re-run FIX_PERSONALIZATION_SYSTEM.sql
   - Verify user is authenticated
   - Check RLS policies match user_id

---

*Testing Guide - Generated 2025-10-12*
