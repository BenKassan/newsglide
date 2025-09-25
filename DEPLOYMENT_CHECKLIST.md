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