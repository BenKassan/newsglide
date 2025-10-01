# Subscription System Backup Documentation

**Date:** 2025-09-30
**Purpose:** Complete documentation of the paid tier system for future restoration

## Overview

NewsGlide originally had a two-tier subscription system:
- **Free Tier:** Limited features with daily search limits
- **Pro Tier:** $3/month with unlimited access to all features

This system was temporarily disabled to make all features free and accessible to all users.

## Pricing Structure

### Free Tier ($0)
- 5 searches per day
- Base + ELI5 reading levels
- Article saving & history (unlimited)
- Interactive Q&A (unlimited)

### Pro Tier ($3/month)
- Unlimited searches
- PhD-level analysis
- Morgan Freeman voice narration (powered by ElevenLabs)
- AI debate generation
- All Free features included

## Feature Gates

### 1. Search Limits
**Location:** `src/pages/Index.tsx:480-487`
```typescript
// Check search limits for free users
if (!isProUser && !canUseFeature('unlimited_searches')) {
  toast({
    title: 'Search Limit Reached',
    description: `You've used all ${searchLimit} free searches today. Upgrade to Pro for unlimited searches!`,
    variant: 'destructive',
  })
  return
}
```

### 2. PhD Analysis
**Locations:**
- `src/pages/Index.tsx:527` - Request parameter
- `src/pages/Index.tsx:971-1011` - Tab access control
- `src/pages/Index.tsx:1656-1668` - Checkbox control

```typescript
// Request generation
includePhdAnalysis: includePhdAnalysis, // Only if canUseFeature('phd_analysis')

// Tab control
disabled={!newsData.article.phd || !canUseFeature('phd_analysis')}

// Checkbox
disabled={!canUseFeature('phd_analysis')}
```

### 3. Morgan Freeman Voice
**Locations:**
- `src/pages/Index.tsx:1383` - Component prop
- `src/components/MorganFreemanPlayer.tsx:37-44` - Feature check

```typescript
// Prop passed to component
canUseFeature={canUseFeature('morgan_freeman')}

// Feature check in component
if (!canUseFeature) {
  toast({
    title: 'Pro Feature',
    description: 'Morgan Freeman narration is only available for Pro users. Upgrade to unlock!',
    variant: 'destructive',
  })
  return
}
```

### 4. AI Debates
**Locations:**
- `src/pages/Index.tsx:1053-1097` - Section visibility
- `src/components/debate/DebateSection.tsx:39-46` - Feature check

```typescript
// Only shown if isProUser
{isProUser && (
  <div className="mt-8 animate-fade-in">
    <DebateSection ... />
  </div>
)}

// Feature check in component
if (!canUseFeature('ai_debates')) {
  toast({
    title: "Pro Feature",
    description: "AI Debates are only available for Pro users. Upgrade to unlock!",
    variant: "destructive"
  });
  return;
}
```

## Database Schema

### user_preferences table
Columns related to subscriptions:
- `subscription_tier`: 'free' | 'pro'
- `subscription_status`: 'active' | 'canceled' | 'past_due'
- `stripe_customer_id`: Stripe customer ID
- `stripe_subscription_id`: Stripe subscription ID
- `subscription_expires_at`: Subscription expiration timestamp
- `daily_search_count`: Current daily search count
- `last_search_reset`: Last time search count was reset

### user_subscriptions table
Complete subscription tracking:
- `user_id`: UUID reference to auth.users
- `stripe_customer_id`: Stripe customer ID
- `stripe_subscription_id`: Stripe subscription ID
- `subscription_tier`: 'free' | 'pro'
- `subscription_status`: Subscription status
- `current_period_end`: Current billing period end
- `created_at`: Subscription creation timestamp
- `updated_at`: Last update timestamp

### subscription_events table
Audit log for subscription events:
- `user_id`: UUID reference
- `event_type`: Type of subscription event
- `stripe_event_id`: Stripe webhook event ID
- `data`: JSON data from event
- `created_at`: Event timestamp

### usage_limits table
Feature usage tracking:
- `user_id`: UUID reference
- `feature`: Feature name
- `count`: Usage count
- `period_start`: Period start timestamp
- `period_end`: Period end timestamp

## Stripe Integration

### Edge Functions

#### create-checkout-session
**Path:** `supabase/functions/create-checkout-session/index.ts`
**Purpose:** Creates Stripe checkout session for Pro subscription
**Environment Variables:**
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID` (Pro tier price)
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`

#### create-portal-session
**Path:** `supabase/functions/create-portal-session/index.ts`
**Purpose:** Creates Stripe customer portal session for managing subscriptions

#### stripe-webhook
**Path:** `supabase/functions/stripe-webhook/index.ts`
**Purpose:** Handles Stripe webhook events for subscription updates
**Events Handled:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

#### fix-subscription
**Path:** `supabase/functions/fix-subscription/index.ts`
**Purpose:** Manual subscription verification and activation

#### subscription-success
**Path:** `supabase/functions/subscription-success/index.ts`
**Purpose:** Post-checkout success handling

### Stripe Configuration
**Price ID:** Set in environment as `STRIPE_PRICE_ID`
**Product:** NewsGlide Pro - $3/month recurring
**Success URL:** `/subscription/success?session_id={CHECKOUT_SESSION_ID}`
**Cancel URL:** `/subscription/cancel`

## Frontend Components

### SubscriptionContext
**Path:** `src/contexts/SubscriptionContext.tsx`
**Exports:**
- `isProUser`: boolean - Whether user has active Pro subscription
- `subscriptionTier`: 'free' | 'pro' - Current subscription tier
- `dailySearchCount`: number - Current daily search count
- `searchLimit`: number - Search limit (5 for free, Infinity for pro)
- `canUseFeature`: (feature: FeatureType) => boolean - Feature access check
- `incrementSearchCount`: () => Promise<void> - Increment search count
- `refreshSubscription`: () => Promise<void> - Refresh subscription data

**Feature Types:**
- `'phd_analysis'`: PhD-level article analysis
- `'morgan_freeman'`: Morgan Freeman voice narration
- `'unlimited_searches'`: No daily search limit
- `'ai_debates'`: AI-powered debate generation

### Subscription Page
**Path:** `src/pages/Subscription.tsx`
**Features:**
- Pricing comparison (Free vs Pro)
- Current plan status display
- Search usage progress bar
- Upgrade/manage subscription buttons
- Feature comparison table
- Stripe checkout integration
- Payment verification tool

### Services

#### stripeService.ts
**Path:** `src/services/stripeService.ts`
**Functions:**
- `createCheckoutSession()`: Creates Stripe checkout session
- `createPortalSession()`: Creates customer portal session

## Database Functions

### increment_search_count
**Purpose:** Atomically increment user's daily search count
**Parameters:** `p_user_id: UUID`
**Logic:**
- Creates user_preferences record if doesn't exist
- Resets count if last_search_reset is old (daily reset)
- Increments daily_search_count

### reset_daily_search_counts
**Purpose:** Scheduled function to reset all daily search counts
**Schedule:** Runs daily at midnight UTC

## Restoration Guide

### To Re-enable Paid Tiers:

1. **Frontend Context:**
   - Uncomment subscription checks in `SubscriptionContext.tsx`
   - Restore `canUseFeature` logic

2. **Feature Gates:**
   - Uncomment feature checks in `Index.tsx`
   - Restore checks in `MorganFreemanPlayer.tsx`
   - Restore checks in `DebateSection.tsx`

3. **Subscription Page:**
   - Restore full pricing page in `Subscription.tsx`
   - Re-enable Stripe checkout buttons

4. **Edge Functions:**
   - Re-enable Stripe API calls in edge functions
   - Verify environment variables are set

5. **Database:**
   - No changes needed - schema remains intact

6. **Testing:**
   - Test checkout flow with Stripe test cards
   - Test webhook processing
   - Test feature access for both tiers
   - Test daily search limit reset

## Code Markers

All modified code sections are marked with comments:
```typescript
// SUBSCRIPTION_DISABLED: Original paid tier check - see SUBSCRIPTION_BACKUP.md
```

Search for `SUBSCRIPTION_DISABLED` to find all locations that were modified.

## Environment Variables Required

When re-enabling subscriptions, ensure these are set:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# URLs
STRIPE_SUCCESS_URL=https://newsglide.com/subscription/success
STRIPE_CANCEL_URL=https://newsglide.com/subscription/cancel
```

## Notes

- Database schema was kept intact for easy restoration
- All Stripe integration code is commented, not deleted
- Search count incrementing is disabled but function remains
- User preferences table continues to track (inactive) subscription data
- No user data was deleted during this change

## Testing Checklist for Restoration

- [ ] Free users can create accounts
- [ ] Stripe checkout creates valid sessions
- [ ] Payment completion triggers webhook
- [ ] Subscription status updates in database
- [ ] Pro features unlock after payment
- [ ] Daily search limits enforced for free users
- [ ] Search limits don't apply to pro users
- [ ] PhD analysis requires pro subscription
- [ ] Morgan Freeman requires pro subscription
- [ ] AI debates require pro subscription
- [ ] Customer portal allows subscription management
- [ ] Subscription cancellation works properly
- [ ] Failed payments handled correctly
- [ ] Pro badge shows in UI for pro users
- [ ] Upgrade prompts show for free users

---

**Last Updated:** 2025-09-30
**Status:** All features made free - subscription system disabled
**Restoration Difficulty:** Easy - all code preserved with comments
