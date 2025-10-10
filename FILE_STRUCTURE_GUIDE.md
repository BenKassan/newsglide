# NewsGlide File Structure Guide

**Last Updated:** 2025-10-10

This document prevents duplicate component issues and ensures changes appear correctly on dev server.

## Component Location Rules

### ✅ CORRECT Component Locations

**Features:** `/src/features/{feature-name}/components/`
- ArticleViewer → `/src/features/articles/components/ArticleViewer.tsx`
- DebateViewer → `/src/features/debates/components/DebateViewer.tsx`
- SavedArticles → `/src/features/articles/components/SavedArticles.tsx`

**Shared/Utility Components:** `/src/components/`
- UnifiedNavigation → `/src/components/UnifiedNavigation.tsx`
- LandingPage → `/src/components/LandingPage.tsx`
- QueuedRecommendations → `/src/components/QueuedRecommendations.tsx`

**Pages (Route Components):** `/src/pages/`
- Index → `/src/pages/Index.tsx`
- SearchHistory → `/src/pages/SearchHistory.tsx`
- SavedArticles → `/src/pages/SavedArticles.tsx`

### ❌ NO Duplicate Components

**NEVER create components in multiple locations!**

If a component exists in `/src/features/`, DO NOT create it in `/src/components/`

## Import Patterns

### Correct Feature Imports
```tsx
// ✅ CORRECT - Import from feature index
import { ArticleViewer } from '@/features/articles'

// ✅ CORRECT - Import from features alias
import { DebateViewer } from '@features/debates'

// ❌ WRONG - Direct component import
import { ArticleViewer } from '@/components/ArticleViewer'
```

### Correct Shared Component Imports
```tsx
// ✅ CORRECT - Shared components from /src/components/
import UnifiedNavigation from '@/components/UnifiedNavigation'
import LandingPage from '@/components/LandingPage'
```

## Verification Checklist

Before making any component changes, verify:

1. **Find the ACTUAL file being used:**
   ```bash
   # Search for ALL files with the component name
   find /Users/elliotgreenbaum/NewsGlide\ Sep\ 2025/src -name "*ComponentName*"

   # Check which one is imported
   grep -r "from.*ComponentName" /Users/elliotgreenbaum/NewsGlide\ Sep\ 2025/src
   ```

2. **Check if component is exported from feature index:**
   ```bash
   # Look for component export in feature index.ts
   cat /Users/elliotgreenbaum/NewsGlide\ Sep\ 2025/src/features/{feature}/index.ts
   ```

3. **Verify only ONE version exists:**
   ```bash
   # This should return ONLY ONE file
   find /Users/elliotgreenbaum/NewsGlide\ Sep\ 2025/src -name "ArticleViewer.tsx"
   ```

## Styling Changes

### Global Styles
- **File:** `/src/styles/unified-theme.css`
- **When to use:** Animations, glass-card effects, global theme colors
- **No white borders:** Use `rgba(59, 130, 246, 0.1)` for subtle blue borders

### Component Styles
- **File:** Component-specific Tailwind classes
- **When to use:** Component-specific styling

## Dev Server Verification

After making changes, always verify they appear:

```bash
# Check dev server is running
ps aux | grep vite

# Verify change is in served HTML
curl -s http://localhost:5173 | grep "your-class-name"

# Hard refresh browser
# Mac: Cmd + Shift + R
# Windows/Linux: Ctrl + Shift + R
```

## Common Issues & Solutions

### Issue: Changes don't appear
**Solution:**
1. Check if you edited the correct file (see verification checklist above)
2. Check if multiple dev servers are running: `ps aux | grep vite`
3. Kill duplicate servers: `kill {PID}`
4. Hard refresh browser

### Issue: Duplicate components
**Solution:**
1. Find all versions: `find src -name "*ComponentName*"`
2. Delete the unused one
3. Update all imports to point to the correct location

### Issue: White borders appearing
**Solution:**
- Check `/src/styles/unified-theme.css` line 215
- Border should be: `rgba(59, 130, 246, 0.1)` NOT `rgba(255, 255, 255, 0.2)`

## File Organization Best Practices

1. **Feature-based organization:** Related components go in `/src/features/{feature}/components/`
2. **Shared components:** Only truly shared components go in `/src/components/`
3. **One source of truth:** Never duplicate component files
4. **Proper exports:** Export components from feature `index.ts` files
5. **Consistent imports:** Always use the shortest import path via feature exports
