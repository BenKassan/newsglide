# NewsGlide Security Roadmap

**Last Updated:** October 11, 2025
**Status:** Function security fixes complete ✅ | Configuration checks pending ⚠️

---

## 🎯 Quick Status Check

### ✅ Completed
- [x] Fixed 13 database functions with search_path security
- [x] Repaired migration history
- [x] Created security documentation

### ⚠️ Pending (Do These Next)
- [ ] Check PostgreSQL version
- [ ] Enable leaked password protection
- [ ] Verify OTP expiry settings

### 📋 Future Security Improvements
- [ ] Short-term fixes (this week)
- [ ] Medium-term hardening (this month)
- [ ] Long-term security posture (this quarter)

---

## 🔴 IMMEDIATE ACTIONS (Complete Today - 10 Minutes)

### 1. Check PostgreSQL Version (2 minutes) - CRITICAL

**Why:** Known PostgreSQL vulnerabilities are actively exploited by attackers. Running outdated versions is one of the most common causes of data breaches.

**How to Check:**
1. Go to SQL Editor: https://supabase.com/dashboard/project/icwusduvaohosrvxlahh/sql/new
2. Run: `SELECT version();`
3. Look for the PostgreSQL version number

**What to Do:**
- **PostgreSQL 17.x** ✅ Excellent - Latest version with all security patches
- **PostgreSQL 16.x** ✅ Good - Still supported and secure
- **PostgreSQL 15.8+** ✅ Acceptable - Has critical security patches
- **PostgreSQL 15.7 or lower** ❌ **UPGRADE IMMEDIATELY**
- **PostgreSQL 14.x or below** ❌ **CRITICAL - UPGRADE URGENTLY**

**How to Upgrade:**
1. Go to: Settings → Infrastructure → Database
2. Click "Upgrade PostgreSQL"
3. **IMPORTANT:**
   - Backup your data first (Supabase does this automatically)
   - Test in development first if possible
   - Schedule during low-traffic hours
   - Expect 15-30 minutes of downtime

**Resources:**
- Supabase upgrade guide: https://supabase.com/docs/guides/platform/upgrading
- PostgreSQL security advisories: https://www.postgresql.org/support/security/

---

### 2. Enable Leaked Password Protection (3 minutes) - HIGH PRIORITY

**Why:** Users reuse passwords across websites. When LinkedIn, Twitter, or any other site gets breached, attackers immediately try those passwords on every service. This feature blocks passwords that have appeared in known data breaches.

**Real-World Impact:**
- Prevents ~60% of credential stuffing attacks
- Protects users from their own poor password choices
- Industry standard for modern authentication systems

**How to Enable:**
1. Go to Auth Settings: https://supabase.com/dashboard/project/icwusduvaohosrvxlahh/auth/settings
2. Find section: **"Password Protection"** or **"Security"**
3. Toggle ON: **"Check passwords against known breaches"** or **"Enable leaked password protection"**
4. Save changes

**How to Test:**
1. Try creating a test account
2. Use password: `password123`
3. Should be rejected with error about compromised password
4. If it works, the feature isn't enabled yet

**Technical Details:**
- Uses HaveIBeenPwned API (600+ million breached passwords)
- Checks password hash, not plaintext (privacy-safe)
- Free for reasonable usage
- Adds <100ms to signup/password change

**Alternative if Not Available:**
If this setting doesn't exist in your Supabase dashboard:
1. Contact Supabase support to enable it
2. Implement client-side check using HaveIBeenPwned API
3. See: https://haveibeenpwned.com/API/v3#PwnedPasswords

---

### 3. Verify OTP Expiry Settings (2 minutes) - MEDIUM PRIORITY

**Why:** One-Time Passwords (email/SMS codes) should expire quickly. Longer expiry = more time for attackers to intercept and use them.

**Industry Standards:**
- **5 minutes:** Very secure, may frustrate users
- **15 minutes:** Recommended balance ✅
- **30 minutes:** Acceptable for good UX
- **1 hour+:** Too long, security risk ❌

**How to Check:**
1. Go to Auth Settings: https://supabase.com/dashboard/project/icwusduvaohosrvxlahh/auth/settings
2. Find section: **"OTP Configuration"** or **"Email Auth"**
3. Look for: **"OTP expiry time"** or **"Magic link expiry"**

**What to Do:**
- **≤ 15 minutes** ✅ Perfect - keep as is
- **15-30 minutes** ⚠️ Acceptable - consider lowering
- **> 30 minutes** ❌ Change to **900 seconds (15 minutes)**

**Recommended Setting:** 900 seconds (15 minutes)

---

## 🟠 SHORT-TERM IMPROVEMENTS (This Week - 2 Hours)

### 4. Review Email Column in Profiles Table

**Why:** Data minimization principle - only store what you need.

**Current State:**
- `profiles` table has `email` column
- Email also exists in `auth.users` (managed by Supabase)
- This is duplication

**Investigation:**
```sql
-- Check if email is actually used in queries
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'email';

-- Check for any JOINs or queries using profiles.email
-- (Manual review of codebase)
```

**Decision Tree:**
- **If email needed for JOIN performance** → Keep it (document why)
- **If fetched from auth.users is fine** → Remove it (more secure)

**How to Remove (if decided):**
```sql
-- Backup first!
ALTER TABLE profiles DROP COLUMN email;

-- Update any code that references profiles.email to use auth.users.email instead
```

**Time Required:** 30 minutes (investigation) + 30 minutes (removal if needed)

---

### 5. Check for Performance Logs Table

**Why:** The lovable.dev scanner mentioned a `performance_logs` table with unrestricted inserts. If it exists, it's a DoS vector.

**Investigation:**
```sql
-- Check if table exists
SELECT tablename FROM pg_tables WHERE tablename = 'performance_logs';

-- If exists, check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'performance_logs';
```

**If Table Exists:**

**Option A: Add Rate Limiting (Recommended)**
- Create edge function for logging
- Use your existing rate limiting system (from `_shared/ratelimit.ts`)
- Limit: 100 logs per minute per user

**Option B: Require Authentication**
```sql
-- Remove "Anyone can insert" policy
DROP POLICY IF EXISTS "Anyone can insert logs" ON performance_logs;

-- Require authentication
CREATE POLICY "Authenticated users can insert logs"
  ON performance_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
```

**Option C: Move to External Service**
- Consider PostHog, Plausible, or Mixpanel
- Better analytics, no database overhead
- Built-in rate limiting and spam protection

**Time Required:** 1 hour

---

### 6. Enable Row-Level Security on All Tables

**Why:** Defense in depth. Even if your application has a bug, RLS prevents data leaks.

**Audit All Tables:**
```sql
-- Find tables without RLS enabled
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT tablename FROM pg_tables t
    JOIN pg_class c ON t.tablename = c.relname
    WHERE c.relrowsecurity = true
  );
```

**For Each Table Without RLS:**
1. Determine access pattern (who should see what?)
2. Enable RLS: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
3. Create appropriate policies
4. Test thoroughly

**Time Required:** 30 minutes per table

---

## 🟡 MEDIUM-TERM HARDENING (This Month - 1 Day)

### 7. Implement Comprehensive Audit Logging

**What to Log:**
- Authentication attempts (success and failure)
- Password changes
- Email changes
- Admin actions
- Failed authorization attempts
- Suspicious activity patterns

**Implementation:**
```sql
-- Create audit log table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address INET,
  user_agent TEXT,
  status TEXT, -- 'success', 'failure', 'suspicious'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_status ON audit_logs(status) WHERE status != 'success';
```

**Use Cases:**
- Detect account takeover attempts
- Investigate security incidents
- Compliance requirements (GDPR, HIPAA, SOC2)
- Identify unusual patterns

**Time Required:** 4 hours

---

### 8. Implement API Key Rotation Policy

**Current State:** API keys likely never rotated.

**Best Practices:**
- **Anon key:** Rotate every 90 days (it's public anyway, low risk)
- **Service role key:** Rotate every 90 days (high privilege)
- **JWT secret:** Rotate every 180 days

**Process:**
1. Generate new keys in Supabase dashboard
2. Update environment variables in:
   - Production deployment
   - Staging environment
   - Development `.env.local`
   - CI/CD secrets
   - Edge functions
3. Monitor for errors (old keys still in use)
4. Revoke old keys after 24-hour grace period

**Automation:**
- Set calendar reminder for 90 days
- Consider secret management service (AWS Secrets Manager, HashiCorp Vault)

**Time Required:** 1 hour setup + 30 minutes per rotation

---

### 9. Enable Two-Factor Authentication for Admin Accounts

**Why:** Admin accounts can:
- Access all user data
- Modify database
- Deploy code
- Delete resources

If compromised = complete takeover.

**How to Enable:**
1. Go to Account Settings in Supabase dashboard
2. Security → Two-Factor Authentication
3. Use authenticator app (not SMS - SMS can be hijacked)
4. Save backup codes securely

**Best Practices:**
- Use hardware key (YubiKey) if available
- Store backup codes in password manager
- Require 2FA for all team members with admin access

**Time Required:** 15 minutes per admin

---

### 10. Implement Rate Limiting Everywhere

**Current State:** You have rate limiting in edge functions ✅

**Expand to:**
- **Authentication endpoints:** 5 attempts per 5 minutes per IP
- **Password reset:** 3 requests per hour per email
- **Account creation:** 5 accounts per hour per IP
- **Search API:** 100 requests per minute per user
- **AI generation:** 10 requests per minute per user

**Pattern (using your existing system):**
```typescript
// In edge function
import { checkRateLimit, RateLimits, getIdentifier } from '../_shared/ratelimit.ts';

const identifier = getIdentifier(req, user?.id);
const rateLimit = checkRateLimit(identifier, 'search:query', RateLimits.STANDARD);

if (!rateLimit.allowed) {
  return rateLimitExceededResponse(rateLimit, RateLimits.STANDARD, corsHeaders);
}
```

**Time Required:** 2 hours

---

### 11. Set Up Security Monitoring

**Tools to Implement:**

**Option A: Supabase Native**
- Enable Database Webhooks for suspicious activity
- Set up email alerts for failed auth attempts
- Monitor database logs

**Option B: External Monitoring**
- **Sentry:** Error tracking and security events
- **LogRocket:** Session replay for security investigations
- **Better Uptime:** Uptime and performance monitoring

**Key Metrics to Monitor:**
- Failed authentication rate (spike = attack)
- Database query errors (potential SQL injection attempts)
- API response times (DDoS or performance issues)
- Error rates by endpoint
- Geographic distribution of traffic (unusual countries = suspicious)

**Alert Thresholds:**
- Failed auth > 10 per minute → Immediate alert
- Error rate > 5% → Warning alert
- API response time > 2s → Performance alert
- Database CPU > 80% → Capacity alert

**Time Required:** 3 hours setup

---

## 🟢 LONG-TERM SECURITY POSTURE (This Quarter - Ongoing)

### 12. Security Code Review Process

**Implement:**
- Pre-commit hooks for security checks
- Automated security scanning (Snyk, Dependabot)
- Manual security review for sensitive changes
- Threat modeling for new features

**Pre-commit Hook Example:**
```bash
# .git/hooks/pre-commit
#!/bin/bash

# Check for secrets in code
if git diff --cached | grep -i "password\|secret\|api_key\|token" | grep -v ".md"; then
  echo "⚠️  Potential secret detected in commit"
  exit 1
fi

# Run linter
npm run lint

# Run security audit
npm audit --audit-level=moderate
```

---

### 13. Implement Content Security Policy (CSP)

**Why:** Prevents XSS attacks by controlling what resources can load.

**Implementation in Vite (vite.config.ts):**
```typescript
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'security-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          res.setHeader(
            'Content-Security-Policy',
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "font-src 'self' data:; " +
            "connect-src 'self' https://icwusduvaohosrvxlahh.supabase.co;"
          );
          next();
        });
      }
    }
  ]
});
```

---

### 14. Regular Security Audits

**Schedule:**
- **Weekly:** Automated dependency scanning
- **Monthly:** Manual security review of new features
- **Quarterly:** Full security audit by team
- **Annually:** External penetration testing (if budget allows)

**Checklist Template:**
- [ ] Review recent auth logs for anomalies
- [ ] Check for outdated dependencies
- [ ] Review new RLS policies
- [ ] Test backup/restore process
- [ ] Verify rate limiting effectiveness
- [ ] Check for exposed secrets
- [ ] Review error logs for security issues
- [ ] Test disaster recovery plan

---

### 15. Security Training for Team

**Topics:**
- OWASP Top 10 vulnerabilities
- Secure coding practices
- How to review code for security issues
- Incident response procedures
- Social engineering awareness

**Resources:**
- OWASP WebGoat (hands-on training)
- Supabase security docs
- PostgreSQL security best practices

---

## 📊 Security Maturity Model

Track your progress:

### Level 1: Basic (Current State After Immediate Actions)
- [x] Database functions secured
- [ ] PostgreSQL up to date
- [ ] Basic authentication protections
- [ ] Rate limiting on critical endpoints

### Level 2: Intermediate (After Short-term)
- [ ] All tables have RLS
- [ ] Comprehensive rate limiting
- [ ] Audit logging enabled
- [ ] 2FA for admins

### Level 3: Advanced (After Medium-term)
- [ ] Security monitoring active
- [ ] Regular security audits
- [ ] Incident response plan
- [ ] Key rotation automated

### Level 4: Mature (After Long-term)
- [ ] External penetration testing
- [ ] Bug bounty program
- [ ] SOC2 compliance
- [ ] Security team dedicated

---

## 🚨 Incident Response Plan

### If You Suspect a Breach:

**Immediate (Hour 0):**
1. **Don't panic** - systematic response is key
2. **Identify the scope** - what data/systems affected?
3. **Contain the threat:**
   - Rotate all API keys immediately
   - Change admin passwords
   - Enable 2FA if not already
   - Block suspicious IPs in Supabase dashboard

**Short-term (Hours 1-24):**
1. **Investigate:**
   - Check audit logs
   - Review database logs
   - Analyze access patterns
2. **Document everything:**
   - Timeline of events
   - Affected users
   - Attack vector
3. **Notify stakeholders:**
   - Internal team
   - Affected users (if data exposed)
   - Supabase support

**Long-term (Days 1-7):**
1. **Root cause analysis**
2. **Implement fixes**
3. **Post-mortem report**
4. **Update security procedures**

**Emergency Contacts:**
- Supabase Support: support@supabase.com
- Your team lead: _________________
- Legal counsel: _________________

---

## 📚 Additional Resources

### Documentation
- **Supabase Security:** https://supabase.com/docs/guides/platform/going-into-prod#security
- **PostgreSQL Security:** https://www.postgresql.org/docs/current/security.html
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/

### Tools
- **Database Linter:** Built into Supabase dashboard
- **Dependency Scanning:** `npm audit`, Snyk, Dependabot
- **Secret Scanning:** GitGuardian, TruffleHog
- **Security Headers:** securityheaders.com

### Communities
- Supabase Discord: https://discord.supabase.com
- r/netsec for security news
- HackerOne blog for vulnerability insights

---

## ✅ Priority Matrix

**Do First (This Week):**
1. PostgreSQL version check/upgrade
2. Enable leaked password protection
3. Verify OTP expiry
4. Check for performance_logs table

**Do Soon (This Month):**
5. Review email column duplication
6. Enable 2FA for admins
7. Expand rate limiting
8. Set up security monitoring

**Do Eventually (This Quarter):**
9. Implement comprehensive audit logging
10. API key rotation policy
11. Content Security Policy
12. Regular security audit schedule

---

**Remember:** Security is a journey, not a destination. Start with the immediate actions, then progressively improve over time.

**Questions?** Review this document quarterly and update based on new threats and best practices.

**Last Security Review Date:** _________________
**Next Scheduled Review:** _________________
