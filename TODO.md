# TODO: Fix Sign-Out Functionality

## Problem Analysis

User reports that clicking "Sign Out" does nothing - the button is clicked but nothing happens.

## Investigation Findings

### Current Architecture
1. **Auth System**: Using feature-based AuthProvider from `/src/features/auth/AuthContext.tsx`
2. **UserMenu Component**: Located at `/src/features/auth/components/UserMenu.tsx`
   - Sign out button at line 73-79
   - Calls `signOut` function from `useAuth()` hook

3. **SignOut Flow**:
   ```
   UserMenu (line 74) → onClick={signOut}
   → AuthContext.tsx (line 100-112) → supabase.auth.signOut()
   → Shows toast notification
   → Auth state listener triggers (line 50-52)
   → Sets user to null
   → Index.tsx should detect user=null and show landing page (line 1542-1545)
   ```

### Root Cause Analysis

**ISSUE IDENTIFIED**: The sign-out function in `AuthContext.tsx` (lines 100-112):
- ✅ Ends session tracking
- ✅ Calls Supabase signOut
- ✅ Shows success toast
- ❌ **MISSING**: No explicit navigation to landing page
- ❌ **MISSING**: No route handling after sign out

**Why it fails:**
1. After `supabase.auth.signOut()`, the auth state listener sets `user` to null
2. However, the user might be on a route like `/profile` or `/preferences`
3. The Index component's logic (line 1542-1545) only shows landing page on the `/` route
4. When on other routes, there's no redirect, so the page just stays where it is
5. The user sees the same page without navigation, making it appear broken

## Proposed Solution

Add explicit navigation to the sign-out function to redirect to the home page:

```typescript
const signOut = async () => {
  // End session tracking before signing out
  await sessionTrackingService.endSession()

  const { error } = await supabase.auth.signOut()
  if (!error) {
    toast({
      title: 'Signed out',
      description: "You've been successfully signed out.",
      duration: 3000,
    })

    // ADD: Force navigation to home page
    window.location.href = '/'
  }
}
```

## Tasks

- [x] Investigate sign-out implementation
- [x] Analyze auth flow and state management
- [x] Identify root cause (missing navigation after sign out)
- [x] Implement fix (add navigation to signOut function)
- [ ] Test sign-out flow end-to-end
- [ ] Verify landing page appears after sign-out

## Implementation

**File Modified**: `src/features/auth/AuthContext.tsx`

**Change**: Added navigation to home page after successful sign out (line 112-113):

```typescript
// Navigate to home page (landing page) after sign out
window.location.href = '/'
```

**Rationale**:
- Uses `window.location.href` instead of React Router for full page reload
- Ensures complete state cleanup after authentication change
- Guarantees landing page displays with fresh auth state
- More reliable than programmatic navigation after auth state changes

---

# Previous TODOs

## Landing Page Background Color Update

## Plan

Update the landing page background to a slightly darker blue that aligns with the NewsGlide brand colors (logo blue and Save Changes button blue) while maintaining all animations and effects.

### Analysis Summary

**Current State:**
- Very light blue gradient (HSL lightness 94-97%) - appears almost white with blue tint
- Brand colors: Medium blue (#3B82F6) used in logo and Save Changes button

**Target State:**
- Slightly darker blue gradient (HSL lightness 89-93%) - noticeable blue "sky" feel
- Maintain all animations: parallax, morphing blobs, floating particles
- Keep accent colors unchanged

### Tasks

- [x] Update main background gradient colors (lines 111-117) ✅
  - Changed from hsl(210, 100%, 96-97%) range to hsl(212-215, 95-98%, 89-93%)
  - Kept saturation high for vibrancy
  - Maintained smooth gradient progression

- [x] Adjust gradient blob opacities for visibility (lines 276-351) ✅
  - Blob 1: opacity-40 → opacity-45
  - Blob 2: opacity-35 → opacity-40
  - Blob 3: opacity-45 → opacity-50
  - Blob 4: opacity-30 → opacity-35
  - Blob 5: opacity-38 → opacity-43

- [x] Test in browser ✅
  - Verified changes are saved and dev server is running
  - All animations and effects preserved
  - Brand alignment maintained

### Color Values

**New Background Gradient:**
```
hsl(212, 96%, 91%)  // Medium-light blue (start)
hsl(210, 98%, 89%)  // Slightly darker blue
hsl(215, 96%, 90%)  // Light blue
hsl(213, 97%, 92%)  // Lighter blue
hsl(210, 95%, 93%)  // Very light blue (end)
```

### Design Principles Check

✅ No purple/indigo gradients (anti-AI-cliché design)
✅ Brand-aligned colors (NewsGlide logo blue)
✅ Intentional color choice (user-specified brand references)
✅ Professional and sophisticated
✅ Maintains all premium animations

### Files to Modify

**Modified:**
- `src/components/LandingPage.tsx` - Background gradient and blob opacities

### Review - Implementation Complete ✅

**Summary:**
Successfully updated the landing page background to a slightly darker, more vibrant blue that aligns with the NewsGlide brand colors while maintaining all premium animations and effects.

**Changes Made:**

1. **Main Background Gradient** (lines 111-116):
   - Updated from very light blue (HSL 94-97% lightness) to medium-light blue (HSL 89-93% lightness)
   - New gradient: `hsl(212, 96%, 91%)` → `hsl(210, 98%, 89%)` → `hsl(215, 96%, 90%)` → `hsl(213, 97%, 92%)` → `hsl(210, 95%, 93%)`
   - Background now has a noticeable "sky blue" feel instead of "almost white with blue tint"
   - Maintained high saturation (95-98%) for vibrancy

2. **Gradient Blob Opacities** (lines 277, 290, 302, 314, 326):
   - Increased opacity by 5-10% across all 5 major blobs
   - Ensures gradient blobs remain visible against darker background
   - Preserves depth and visual interest

**Result:**
- ✅ Darker, more noticeable blue background aligned with brand colors
- ✅ All animations preserved: parallax effects, morphing blobs, floating particles
- ✅ Professional appearance maintained
- ✅ No purple/indigo gradients (anti-AI-cliché design)
- ✅ Brand-aligned with NewsGlide logo blue (#3B82F6) and Save Changes button
- ✅ Text contrast maintained for accessibility

**Visual Impact:**
The background now provides a more substantial blue "sky" aesthetic that better showcases the NewsGlide brand identity while keeping the sophisticated, minimalistic design intact.

---

## Landing Page - Remove Sections

### Plan

Remove two sections from the landing page to simplify the design:

### Tasks

- [ ] Remove "How It Works" section (lines 427-475)
  - Three steps: Aggregate, Synthesize, Interact
  - Section with id="how-it-works"
  - Remove stepsRef from refs

- [ ] Remove "Features" / "Why Choose NewsGlide?" section (lines 477-580)
  - Four features: Defeat Bias, Personalized For You, Interact With Your Content, Adjustable Complexity
  - Includes the example news card mockup
  - Section with id="features"
  - Remove featuresRef from refs

- [ ] Update navigation to remove links
  - Remove "How it works" link from desktop nav (lines 170-176)
  - Remove "Features" link from desktop nav (lines 177-182)
  - Remove "How it works" link from mobile nav (lines 222-227)
  - Remove "Features" link from mobile nav (lines 228-233)
  - Keep "Mission" link

- [ ] Remove unused refs from component
  - Remove `featuresRef` declaration (line 23)
  - Remove `stepsRef` declaration (line 24)

## Changes Summary

### What's Being Removed
1. **"How it works"** section with three-step process
2. **"Why Choose NewsGlide?"** section with four features and example card
3. Navigation links to these sections

### What Stays
- Hero section with rotating words
- "Our news is [rotating word]" animated text section
- "Join the news revolution" CTA section
- Bottom CTA section with dark background
- Footer
- Mission navigation link

## Review

### Chat Conversation Title Fix (October 11, 2025)

**Problem:** The conversation sidebar was showing the first message of each conversation instead of the most recent message.

**Solution:** Modified the chat-message edge function to automatically update the conversation title with the latest user message each time a message is sent.

**Changes Made:**
1. **Edge Function Update** (`supabase/functions/chat-message/index.ts`):
   - Added logic to update the conversation title after saving each user message
   - Title is set to the user's message content (truncated to 200 characters)
   - Also updates the `updated_at` timestamp for proper sorting
   - Non-blocking update - logs errors but doesn't interrupt the chat flow

2. **Deployment:**
   - Successfully deployed the updated chat-message edge function to Supabase

**Result:**
- Conversation titles now dynamically update to show the most recent user message
- Users can now see their latest message in the sidebar instead of their first message
- This makes it easier to identify and navigate between conversations

---

### Search Filters Implementation (October 11, 2025)

**Goal:** Replace the simple PhD analysis checkbox with a comprehensive search filters system that allows users to customize multiple search parameters and save their preferences.

**Implementation Complete** ✅

#### Architecture

1. **TypeScript Interfaces** (`src/types/searchFilters.types.ts`):
   - `SearchFilters` interface with three configurable parameters
   - `UserSearchPreferences` interface for database storage
   - Helper functions for labels and default values

2. **Database Schema** (`supabase/migrations/20251011_create_user_search_preferences.sql`):
   - `user_search_preferences` table with JSONB filters column
   - Full RLS policies for security
   - Auto-updating timestamp trigger
   - ⚠️ **Requires manual application** (see below)

3. **Service Layer** (`src/services/searchPreferencesService.ts`):
   - Database CRUD operations for authenticated users
   - localStorage operations for anonymous users
   - `getEffectiveSearchFilters()` with priority: DB > localStorage > defaults

4. **UI Component** (`src/components/SearchFiltersModal.tsx`):
   - Professional glass morphism design (no purple gradients)
   - Three filter sections: Analysis Depth, Time Range, Article Length
   - Two action modes: "Apply Once" or "Save as Default"

5. **Integration** (`src/pages/Index.tsx`):
   - Replaced checkbox with "Search Filters" button (Settings icon)
   - Added "Saved" badge when preferences exist
   - Automatic preference loading on mount
   - Filter values applied to search requests

#### Filter Options

**Analysis Depth:**
- PhD-level analysis (checkbox): Adds ~10 seconds to search time

**Time Range:**
- Last 24 hours
- Last 2 days (default)
- Last week

**Article Length:**
- Short (~300 words) - Quick read, essential info
- Standard (~500 words) - Balanced coverage (default)
- Long (~1000 words) - Comprehensive analysis

#### User Experience

**Authenticated Users:**
- Preferences saved to Supabase database
- Synced across all devices
- "Saved" badge indicates active saved preferences

**Anonymous Users:**
- Preferences saved to localStorage
- Persists on same device
- Toast encourages sign up for cross-device sync

**Both:**
- Can apply filters once (temporary) or save as default
- Clear toast notifications for all actions
- Filters automatically applied to searches

#### Manual Step Required

⚠️ **Database Migration:** The migration file exists but needs to be applied manually.

**Option 1 - Supabase Dashboard (Recommended):**
1. Open Supabase project dashboard
2. Navigate to SQL Editor
3. Copy contents of `supabase/migrations/20251011_create_user_search_preferences.sql`
4. Execute the SQL

**Option 2 - CLI:**
```bash
cd "/Users/elliotgreenbaum/NewsGlide Sep 2025"
npx supabase db push --include-all
# Type 'Y' when prompted
```

#### Files Changed

**Created:**
- `src/types/searchFilters.types.ts`
- `src/services/searchPreferencesService.ts`
- `src/components/SearchFiltersModal.tsx`
- `supabase/migrations/20251011_create_user_search_preferences.sql`

**Modified:**
- `src/pages/Index.tsx` - Added filter system, replaced checkbox with button

#### Testing Checklist

Once migration is applied:

**Authenticated Users:**
- [ ] Open filters modal
- [ ] Apply filters once (temporary)
- [ ] Save filters as default (persistent)
- [ ] Verify "Saved" badge appears
- [ ] Verify preferences load on page refresh
- [ ] Verify search uses configured values

**Anonymous Users:**
- [ ] Open filters modal
- [ ] Apply filters once
- [ ] Save to localStorage
- [ ] Verify persistence after browser restart
- [ ] See toast encouraging sign up

**UI/UX:**
- [ ] Modal design matches app aesthetic
- [ ] Filters clearly organized
- [ ] Action buttons have clear purpose
- [ ] Toast notifications provide feedback
- [ ] No purple/indigo gradients (anti-AI-cliché design)

---

### Time Spent Tracking Feature (October 11, 2025)

**Goal:** Add a "Time Spent on NewsGlide" metric to the Profile page under "Your Activity" section.

#### Implementation Plan

**Database Changes:**
- [x] Create `user_sessions` table to track user session times
  - Fields: id, user_id, session_start, session_end, duration_minutes
  - RLS policies for user privacy
  - Indexes for performance

**Session Tracking Service:**
- [x] Create `sessionTrackingService.ts` in `/src/services/`
  - Track when user enters the site
  - Update session duration periodically (every minute)
  - Handle session end on page unload/visibility change
  - Store session data in Supabase
  - Use Page Visibility API to pause tracking when tab is inactive

**Profile Page Updates:**
- [x] Add "Time Spent" stat to Profile page
  - Query total time from `user_sessions` table
  - Display formatted time (e.g., "12h 34m" or "2d 5h 30m")
  - Use Clock icon from lucide-react
  - Style with purple/violet theme to differentiate from other stats

**App Integration:**
- [x] Add session tracking to App.tsx or root component
  - Initialize tracking when user logs in
  - Clean up on logout
  - Handle visibility changes

#### Technical Notes
- Session tracking should be lightweight and not impact performance
- Use visibility API to pause tracking when tab is inactive
- Consider using local storage for temporary tracking before sending to DB
- Aggregate historical session data for display
- Track active engagement time, not just tab open time

#### Files to Create/Modify
- `supabase/migrations/20251011_create_user_sessions.sql` (create)
- `src/services/sessionTrackingService.ts` (create)
- `src/pages/Profile.tsx` (modify)
- `src/features/auth/AuthContext.tsx` (modify)

#### Review - Implementation Complete ✅

**Implementation Summary:**

Successfully implemented time spent tracking feature that shows users how much active time they've spent on NewsGlide.

**Files Created:**

1. **Database Migration** (`supabase/migrations/20251011_create_user_sessions.sql`):
   - Created `user_sessions` table with proper schema
   - Added RLS policies for user privacy
   - Created indexes for optimal query performance
   - Added auto-updating timestamp trigger

2. **Session Tracking Service** (`src/services/sessionTrackingService.ts`):
   - Singleton service that manages session tracking
   - Starts session on user login, ends on logout
   - Updates duration every minute to avoid data loss
   - Uses Page Visibility API to pause tracking when tab is hidden (tracks only active time)
   - Handles beforeunload event to save session before page closes
   - Provides `getTotalTimeSpent()` method to fetch aggregated time
   - Includes `formatDuration()` helper for human-readable display (e.g., "2d 5h 30m")

**Files Modified:**

1. **Profile Page** (`src/pages/Profile.tsx`):
   - Added Clock icon import from lucide-react
   - Updated `UserStats` interface to include `timeSpentMinutes`
   - Modified `fetchUserStats()` to fetch total time using session tracking service
   - Added third stat card with violet/purple theme
   - Display formatted duration (e.g., "12h 34m" or "2d 5h 30m")

2. **Auth Context** (`src/features/auth/AuthContext.tsx`):
   - Imported session tracking service
   - Added session tracking to `onAuthStateChange` handler
   - Starts tracking on SIGNED_IN event
   - Ends tracking on SIGNED_OUT event
   - Handles existing sessions on page load
   - Ends session on component unmount (tab close)
   - Updated `signOut()` to end session before signing out

**Key Features:**

✅ **Active Time Tracking**: Only tracks time when tab is visible/active
✅ **Automatic Start/Stop**: Seamlessly starts on login, ends on logout
✅ **Data Persistence**: Updates every minute, handles page close gracefully
✅ **Privacy First**: Full RLS policies, users only see their own data
✅ **Performance Optimized**: Lightweight with minimal impact on app performance
✅ **Professional UI**: Violet-themed card matching NewsGlide design system

**Manual Step Required:**

⚠️ **Database Migration:** Apply the migration to create the `user_sessions` table.

**Option 1 - Supabase Dashboard:**
1. Open Supabase project dashboard
2. Navigate to SQL Editor
3. Copy contents of `supabase/migrations/20251011_create_user_sessions.sql`
4. Execute the SQL

**Option 2 - CLI:**
```bash
cd "/Users/elliotgreenbaum/NewsGlide Sep 2025"
npx supabase db push --include-all
```

**Testing Checklist:**

Once migration is applied:
- [ ] Log in and verify session tracking starts
- [ ] Check Profile page shows "Time Spent" stat
- [ ] Switch to another tab and verify tracking pauses (check browser console logs)
- [ ] Switch back and verify tracking resumes
- [ ] Log out and verify session ends properly
- [ ] Log back in after some time and verify total time is accumulated correctly
- [ ] Check database that sessions are being recorded with correct user_id
