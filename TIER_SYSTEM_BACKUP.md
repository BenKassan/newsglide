# Tier System Backup Documentation

**Date:** 2025-10-01
**Purpose:** Complete backup of subscription tier system for future restoration

## Overview

This document preserves the complete subscription/tier system that was removed to make all features free. Use this documentation to restore the tier system if needed in the future.

---

## Current State (Before Full Removal)

### Subscription Tiers
- **Free Tier**: 5 searches/day, Base + ELI5 reading levels, basic features
- **Pro Tier ($3/month)**: Unlimited searches, PhD analysis, Morgan Freeman voice, AI debates

### Key Features Locked Behind Pro Tier
1. **PhD-level Analysis** - Advanced article analysis
2. **Unlimited Searches** - Beyond 5 daily searches for free users
3. **Morgan Freeman Voice** - ElevenLabs TTS narration
4. **AI Debates** - Generate debates between different perspectives

---

## File Structure & Components

### Core Context Files

#### 1. `/src/contexts/SubscriptionContext.tsx`
**Current State:** Modified to give all users Pro access
**Original Purpose:** Manage subscription state and feature access control

Key functions:
- `canUseFeature(feature)` - Check if user can access feature
- `incrementSearchCount()` - Track daily search usage
- `refreshSubscription()` - Sync subscription state from backend

Features tracked:
```typescript
type FeatureType = 'phd_analysis' | 'morgan_freeman' | 'unlimited_searches' | 'ai_debates';
```

**Restoration Notes:**
- Currently returns `isProUser: true` for all users
- Originally fetched subscription status from Supabase
- Tracked daily search counts against tier limits
- Synced with Stripe subscription status

---

### UI Components

#### 2. `/src/pages/Subscription.tsx`
**Current State:** Shows "All Features Free" message
**Original Purpose:** Display pricing plans and manage subscriptions

Key sections:
- Pricing comparison (Free vs Pro)
- Feature comparison table
- Stripe checkout integration
- Customer portal access

**Restoration Notes:**
- Contains complete pricing UI (currently hidden with `className="hidden"`)
- Stripe integration code intact (checkout, portal, webhook handling)
- Success/cancel redirect handling preserved

---

### Services

#### 3. `/src/services/stripeService.ts`
**Status:** Preserved but not actively used
**Functions:**
- `createCheckoutSession()` - Initialize Stripe checkout
- `createPortalSession()` - Open customer billing portal

**Restoration Notes:**
- Requires Stripe API keys in environment
- Edge functions handle webhook processing

---

### Database Schema

#### 4. `/supabase/database-setup.sql`
**Current State:** No subscription-specific tables
**Note:** Schema doesn't include subscription tier tracking

**For Restoration, Add:**
```sql
-- Subscription tracking table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_tier TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'inactive',
    subscription_start_date TIMESTAMP WITH TIME ZONE,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    daily_search_count INTEGER DEFAULT 0,
    last_search_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick user lookups
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);

-- RLS policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON public.subscriptions
    FOR UPDATE USING (auth.uid() = user_id);
```

---

### Edge Functions

#### 5. Stripe Webhook Handler
**File:** `/supabase/functions/stripe-webhook/index.ts`
**Purpose:** Process Stripe events (payments, cancellations, etc.)

Events handled:
- `checkout.session.completed` - New subscription
- `customer.subscription.updated` - Subscription changes
- `customer.subscription.deleted` - Cancellation

#### 6. Checkout Session Creator
**File:** `/supabase/functions/create-checkout-session/index.ts`
**Purpose:** Create Stripe checkout sessions

#### 7. Portal Session Creator
**File:** `/supabase/functions/create-portal-session/index.ts`
**Purpose:** Open Stripe customer portal

#### 8. Subscription Fixer
**File:** `/supabase/functions/fix-subscription/index.ts`
**Purpose:** Manually sync subscription status

---

## Feature Access Control

### How Features Were Gated

#### 1. PhD Analysis (`phd_analysis`)
**Location:** Various article viewers and synthesis components
**Check:** `canUseFeature('phd_analysis')`

#### 2. Morgan Freeman Voice (`morgan_freeman`)
**Location:** `/src/components/MorganFreemanPlayer.tsx`
**Check:** `canUseFeature('morgan_freeman')`
**Service:** `/src/services/ttsService.ts` (ElevenLabs integration)

#### 3. Unlimited Searches (`unlimited_searches`)
**Location:** Search components, trending topics
**Check:** `dailySearchCount < searchLimit`
**Logic:** Free tier had `searchLimit: 5`, Pro had `searchLimit: Infinity`

#### 4. AI Debates (`ai_debates`)
**Location:** `/src/components/debate/*` components
**Check:** `canUseFeature('ai_debates')`
**Service:** `/src/services/debateService.ts`

---

## Configuration Files

### Environment Variables (Required for Stripe)
```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_... # Pro plan price ID

# ElevenLabs (for Morgan Freeman voice)
ELEVENLABS_API_KEY=...
```

### Supabase Edge Function Environment
**File:** `/supabase/functions/.env.local.example`
Contains required environment variables for edge functions

---

## Stripe Product Setup

### Product Configuration
- **Product Name:** NewsGlide Pro
- **Price:** $3.00/month
- **Billing:** Recurring monthly
- **Features:**
  - Unlimited searches
  - PhD-level analysis
  - Morgan Freeman narration
  - AI debate generation

### Webhook Configuration
**Endpoint:** `https://[your-project].supabase.co/functions/v1/stripe-webhook`
**Events to Listen:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## Restoration Steps

### Phase 1: Database Setup
1. Run subscription table creation SQL (see Database Schema section)
2. Add migration file in `/supabase/migrations/`
3. Apply migration to production

### Phase 2: Environment Configuration
1. Set up Stripe account and get API keys
2. Create Pro tier product in Stripe dashboard
3. Configure webhook endpoint
4. Add environment variables to Supabase project
5. Configure ElevenLabs API for Morgan Freeman voice

### Phase 3: Code Restoration
1. Restore `/src/contexts/SubscriptionContext.tsx`:
   - Remove hardcoded `isProUser: true`
   - Re-enable subscription fetching from database
   - Restore search count tracking
   - Re-enable feature gating logic

2. Update `/src/pages/Subscription.tsx`:
   - Remove "All Features Free" card
   - Unhide pricing plans (remove `className="hidden"`)
   - Unhide feature comparison table
   - Re-enable Stripe checkout buttons

3. Restore feature checks across codebase:
   - Re-enable `canUseFeature()` checks in components
   - Add paywalls to PhD analysis
   - Gate Morgan Freeman voice behind Pro
   - Limit free tier to 5 searches/day
   - Gate AI debates behind Pro tier

### Phase 4: Edge Function Deployment
1. Deploy all Stripe-related edge functions:
   - `stripe-webhook`
   - `create-checkout-session`
   - `create-portal-session`
   - `fix-subscription`
2. Test webhook delivery from Stripe
3. Verify subscription state syncing

### Phase 5: Testing
1. Test free tier limitations (5 searches, no premium features)
2. Test Pro upgrade flow (Stripe checkout)
3. Test premium feature access after upgrade
4. Test subscription cancellation flow
5. Test webhook processing for all events
6. Test customer portal access

---

## Key Files to Modify for Restoration

### High Priority (Core Functionality)
1. `/src/contexts/SubscriptionContext.tsx` - Feature access control
2. `/src/pages/Subscription.tsx` - Pricing page
3. Database migration - Subscription tables

### Medium Priority (Feature Gates)
4. `/src/components/MorganFreemanPlayer.tsx` - Voice feature
5. `/src/components/debate/*` - Debate features
6. Article synthesis components - PhD analysis
7. Search components - Daily limits

### Low Priority (Supporting Files)
8. Edge functions - Already exist, just need deployment
9. Environment configuration
10. Stripe dashboard setup

---

## Code Snippets for Quick Restoration

### Original SubscriptionContext Logic (Simplified)
```typescript
// Fetch subscription from database
useEffect(() => {
  const fetchSubscription = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    setSubscriptionTier(data?.subscription_tier || 'free');
    setIsProUser(data?.subscription_status === 'active');
    setDailySearchCount(data?.daily_search_count || 0);
  };

  fetchSubscription();
}, [user]);

// Feature access check
const canUseFeature = (feature: FeatureType): boolean => {
  if (feature === 'unlimited_searches') {
    return isProUser || dailySearchCount < 5;
  }
  // phd_analysis, morgan_freeman, ai_debates require Pro
  return isProUser;
};
```

### Search Limit Enforcement
```typescript
// Before allowing search
if (!isProUser && dailySearchCount >= 5) {
  toast({
    title: "Daily Limit Reached",
    description: "Upgrade to Pro for unlimited searches",
    variant: "destructive"
  });
  return;
}

// After search completes
await incrementSearchCount();
```

---

## Testing Checklist

### Free Tier Testing
- [ ] Limited to 5 searches per day
- [ ] Can access Base + ELI5 reading levels
- [ ] Cannot access PhD analysis
- [ ] Cannot use Morgan Freeman voice
- [ ] Cannot generate AI debates
- [ ] Search count resets daily

### Pro Tier Testing
- [ ] Unlimited searches
- [ ] Access to all reading levels (Base, ELI5, PhD)
- [ ] Morgan Freeman voice works
- [ ] AI debates generate successfully
- [ ] Stripe checkout completes successfully
- [ ] Webhook updates subscription status
- [ ] Customer portal accessible

---

## Migration Considerations

### Data Migration
- Existing users will need subscription records created
- Default all existing users to free tier OR
- Grant existing users Pro tier as thank-you for early adoption

### Communication
- Announce tier system restoration in advance
- Offer promotional pricing for existing users
- Provide grandfather clause for early adopters

---

## Additional Documentation Files

Related documentation to reference:
- `/newsglide/SUBSCRIPTION_BACKUP.md` - May contain additional notes
- `/newsglide/DEVELOPMENT_PLAN.md` - Original feature planning
- `/newsglide/FUTURE_FEATURES.md` - Roadmap including monetization

---

## Notes

**Last Modified:** 2025-10-01
**Modified By:** Claude Code
**Reason for Change:** Removing tier system to make all features free

**Important:** This is a complete backup. All Stripe integration code, edge functions, and feature gates are preserved in the codebase but disabled. Restoration should be straightforward by following the steps above.

---

## Quick Reference: Feature → Check Locations

| Feature | Component Files | Check Method |
|---------|----------------|--------------|
| PhD Analysis | Article viewers, synthesis components | `canUseFeature('phd_analysis')` |
| Morgan Freeman | `MorganFreemanPlayer.tsx`, `ttsService.ts` | `canUseFeature('morgan_freeman')` |
| Unlimited Searches | Search components, trending topics | `dailySearchCount < searchLimit` |
| AI Debates | `debate/*` components, `debateService.ts` | `canUseFeature('ai_debates')` |

---

## Contact & Support

If restoring the tier system:
1. Review this entire document first
2. Test in development environment thoroughly
3. Verify Stripe webhook delivery
4. Monitor error logs during rollout
5. Have rollback plan ready

**Estimated Restoration Time:** 4-6 hours for experienced developer

