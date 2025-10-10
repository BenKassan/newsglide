# Immediate Security Actions Required

**Project:** NewsGlide (icwusduvaohosrvxlahh.supabase.co)
**Date:** October 10, 2025
**Priority:** HIGH - Complete within 24 hours

---

## Action 1: Check PostgreSQL Version (CRITICAL)

### Why This Matters
Running outdated PostgreSQL with known vulnerabilities is a critical security risk. Exploits for known CVEs are actively used by attackers.

### Steps

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/icwusduvaohosrvxlahh

2. **Method A: Check via SQL Editor**
   ```sql
   SELECT version();
   ```

   Expected format: `PostgreSQL 15.x.x` or `PostgreSQL 16.x.x`

3. **Method B: Check via Settings**
   - Navigate to: **Settings** → **General** → **Infrastructure**
   - Look for "Database version" or "Postgres version"

4. **Evaluate the Result**
   - **PostgreSQL 16.x or 17.x** ✅ Good - Latest versions with security patches
   - **PostgreSQL 15.8+** ⚠️ Acceptable - Check if upgrades available
   - **PostgreSQL 15.7 or below** ❌ VULNERABLE - Upgrade immediately
   - **PostgreSQL 14.x or below** ❌ CRITICAL - Upgrade urgently

5. **If Upgrade Needed**
   - Go to: **Settings** → **General** → **Infrastructure**
   - Click "Upgrade PostgreSQL"
   - **IMPORTANT:** Test in staging first if possible
   - Schedule during low-traffic period
   - Have rollback plan ready

### Expected Time
- Check: 2 minutes
- Upgrade: 15-30 minutes (includes downtime)

---

## Action 2: Enable Leaked Password Protection (HIGH)

### Why This Matters
Users reuse passwords across websites. If their password appears in a data breach (LinkedIn, Twitter, etc.), attackers can use credential stuffing to access their NewsGlide account.

### Steps

1. **Go to Authentication Settings**
   - Dashboard URL: https://supabase.com/dashboard/project/icwusduvaohosrvxlahh/auth/settings

2. **Find Password Protection Section**
   - Scroll to "Password Protection" or "Security" section

3. **Enable HaveIBeenPwned Integration**
   - Toggle: **"Check passwords against known breaches"** → ON
   - Or: **"Enable leaked password protection"** → ON

4. **Verify It's Working**
   - Try creating a test account with password: `password123`
   - Should be rejected with message about compromised password

### Expected Time
- Complete: 5 minutes

### Cost
- FREE for reasonable usage (HaveIBeenPwned API is free for non-commercial bulk checking)

---

## Action 3: Check OTP Expiry Settings (MEDIUM)

### Why This Matters
Long OTP expiry times give attackers more time to intercept and use one-time passwords (email/SMS codes).

### Steps

1. **Go to Email/SMS Settings**
   - Dashboard URL: https://supabase.com/dashboard/project/icwusduvaohosrvxlahh/auth/settings

2. **Find OTP Settings**
   - Look for section: "Email Auth" or "OTP Configuration"
   - Check for: "OTP expiry time" or "Magic link expiry"

3. **Check Current Setting**
   - **< 15 minutes** ✅ Good - Secure with good UX
   - **15-30 minutes** ⚠️ Acceptable - Standard practice
   - **> 30 minutes** ❌ TOO LONG - Security risk
   - **> 1 hour** ❌ CRITICAL - Change immediately

4. **Recommended Setting**
   - Set to: **15 minutes** (900 seconds)
   - This balances security with user experience
   - Users have enough time to check email, but not too long for attackers

5. **Update If Needed**
   - Change "OTP expiry" or "Magic link expiry" to 900 seconds
   - Save changes

### Expected Time
- Check & update: 3 minutes

---

## Verification Checklist

After completing all actions, verify:

- [ ] PostgreSQL version documented (record version number here: _____________)
- [ ] PostgreSQL is up to date OR upgrade scheduled (date: _____________)
- [ ] Leaked password protection is ENABLED
- [ ] Tested with compromised password and verified it's blocked
- [ ] OTP expiry is set to 15 minutes (900 seconds)
- [ ] All changes saved

---

## What If I Can't Find These Settings?

### For Leaked Password Protection
- Alternative location: **Auth** → **Policies** → **Security Rules**
- If not available: Contact Supabase support - this should be available on all plans
- Workaround: Implement client-side check using HaveIBeenPwned API

### For OTP Expiry
- May be in: **Auth** → **Email Templates** → advanced settings
- Default: Usually 24 hours (too long!)
- If can't change: Consider implementing custom email verification with shorter expiry

### For PostgreSQL Version
- If can't upgrade via dashboard: Contact Supabase support
- Critical vulnerabilities may require migration to new project

---

## Additional Security Recommendations

Once immediate actions are complete:

### Short-term (Next Week)
1. **Fix function search_path vulnerabilities** - See SECURITY_FUNCTION_FIXES.md
2. **Audit profiles.email column** - Consider removing if redundant with auth.users
3. **Check for performance_logs table** - Add rate limiting if exists

### Medium-term (This Month)
1. Enable 2FA for admin accounts
2. Review and rotate API keys if over 90 days old
3. Implement security monitoring/alerting
4. Review RLS policies for all tables

---

## Need Help?

**Supabase Documentation:**
- PostgreSQL Upgrades: https://supabase.com/docs/guides/platform/upgrading
- Auth Security: https://supabase.com/docs/guides/auth/auth-helpers/auth-ui
- Best Practices: https://supabase.com/docs/guides/platform/going-into-prod

**Emergency Support:**
If you discover the PostgreSQL version has critical CVEs, upgrade immediately or contact Supabase support for expedited migration.

---

**IMPORTANT:** Do not commit this file to version control after adding sensitive information. Add to .gitignore if needed.
