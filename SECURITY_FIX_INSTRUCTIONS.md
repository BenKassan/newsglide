# Security Fix Instructions - Manual Application Required

**Status:** Migration system has conflicts. Apply security fix via SQL Editor instead.

---

## ✅ What I've Done

1. **Repaired migration history** - Synced local and remote migration states
2. **Created security fix migration** - All 13 functions updated with search_path protection
3. **Identified manual steps needed** - Migration conflicts require SQL Editor approach

---

## 🎯 How to Apply Security Fixes (5 Minutes)

### Step 1: Open Supabase SQL Editor

Go to: **https://supabase.com/dashboard/project/icwusduvaohosrvxlahh/sql/new**

### Step 2: Copy the Security Fix SQL

The complete SQL is in: `supabase/migrations/20251011_fix_function_search_path.sql`

**Quick way:**
```bash
cat "supabase/migrations/20251011_fix_function_search_path.sql" | pbcopy
```
This copies the entire SQL to your clipboard.

### Step 3: Paste and Run

1. Paste the SQL into the SQL Editor
2. Click "Run" button
3. Wait ~10 seconds for all functions to update
4. You should see "Success" messages

### Step 4: Verify It Worked

Run this verification query in SQL Editor:

```sql
SELECT
  p.proname as function_name,
  CASE
    WHEN 'search_path' = ANY(SELECT split_part(unnest(p.proconfig), '=', 1))
    THEN '✅ SECURED'
    ELSE '❌ VULNERABLE'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.prokind = 'f'
ORDER BY function_name;
```

**Expected result:** All functions should show "✅ SECURED"

---

## 📋 Complete Security Checklist

### Automated (Done by Me)
- [x] Identified all vulnerable functions
- [x] Created security fix migration
- [x] Repaired migration history
- [x] Documented all manual steps

### Manual (You Need to Do)

#### 1. Apply Function Security Fixes (5 min) - JUST EXPLAINED ABOVE
- [ ] Open SQL Editor
- [ ] Run security fix SQL
- [ ] Verify with check query
- [ ] All functions show ✅ SECURED

#### 2. Check PostgreSQL Version (2 min) - HIGH PRIORITY
- [ ] Open SQL Editor: https://supabase.com/dashboard/project/icwusduvaohosrvxlahh/sql/new
- [ ] Run: `SELECT version();`
- [ ] Record version: __________________
- [ ] If < PostgreSQL 15.8, go to Settings → Infrastructure → Upgrade Database

#### 3. Enable Leaked Password Protection (3 min) - HIGH PRIORITY
- [ ] Go to Auth Settings: https://supabase.com/dashboard/project/icwusduvaohosrvxlahh/auth/settings
- [ ] Find "Password Protection" section
- [ ] Toggle ON: "Check passwords against known breaches"
- [ ] Test with password "password123" - should be rejected

#### 4. Check OTP Expiry (2 min) - MEDIUM PRIORITY
- [ ] Same Auth Settings page
- [ ] Find "OTP Configuration" or "Email Auth" section
- [ ] Check expiry time: __________ seconds/minutes
- [ ] If > 30 minutes, change to 15 minutes (900 seconds)

---

## 🚨 Common Issues

### "Migration conflicts" error
**Solution:** Use SQL Editor approach above (bypasses migration system)

### "Permission denied" when running SQL
**Solution:** Make sure you're logged into the correct Supabase project

### Can't find Auth settings
**Solution:** Try Auth → Policies → Security Rules, or contact Supabase support

### SQL runs but no output
**Solution:** That's expected for CREATE OR REPLACE statements. Run verification query to confirm.

---

## ✅ Success Criteria

All security fixes are complete when:

1. ✅ Verification query shows all functions "✅ SECURED"
2. ✅ PostgreSQL version is 15.8+ or 16.x/17.x
3. ✅ Leaked password protection enabled and tested
4. ✅ OTP expiry ≤ 15 minutes

---

## 📊 What Gets Fixed

This security update protects against **search path injection attacks** in 13 functions:

1. increment_search_count
2. handle_new_user_minimal
3. handle_updated_at
4. delete_old_cache_entries
5. update_discover_topics_updated_at
6. get_subtopics
7. is_cache_valid
8. get_next_cached_topics
9. mark_cache_consumed
10. get_previous_topic_names
11. get_next_generation_number
12. update_conversation_timestamp
13. generate_conversation_title

**Impact:** Zero application changes needed. Functions maintain same signatures and behavior, just with added security.

---

## 📚 Reference Documents

- **Detailed steps:** `SECURITY_ACTIONS_REQUIRED.md`
- **Complete SQL:** `supabase/migrations/20251011_fix_function_search_path.sql`
- **Summary:** `SECURITY_IMMEDIATE_ACTIONS_SUMMARY.md`

---

**Total Time Required:** ~15 minutes for all security fixes
**Risk Level if skipped:** HIGH for functions, CRITICAL for PostgreSQL version
**Recommendation:** Complete today ✅
