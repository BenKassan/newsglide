# 🔍 AI Chat Debugging Guide

## Issue: Message disappears, no response

This means either:
1. ❌ Database migration not applied yet
2. ❌ Frontend error preventing API call
3. ❌ API error (but function deployed successfully)

---

## Step 1: Apply Database Migration (REQUIRED)

**Status**: ⏳ Pending

The migration SQL is in your clipboard. Apply it:

1. Go to: https://supabase.com/dashboard/project/icwusduvaohosrvxlahh/sql/new
2. Paste (Cmd+V)
3. Click "Run"
4. Look for "Success" message

**Expected Output**:
```
Success. No rows returned
```

---

## Step 2: Check Browser Console

Open browser console (F12 or Cmd+Option+I) and look for errors.

### Common Errors & Solutions:

#### Error: "Failed to send message"
**Solution**: Check that edge functions are deployed
```bash
supabase functions list
```
Should show: `chat-message` and `chat-conversations`

#### Error: "Failed to load conversations"
**Solution**: Database tables don't exist - apply migration (Step 1)

#### Error: "401 Unauthorized"
**Solution**: Not logged in - sign in first

#### Error: "Cannot read property 'access_token'"
**Solution**: Auth issue - refresh page and sign in again

---

## Step 3: Check Network Tab

Open Network tab in browser console → Click "Fetch/XHR"

Try sending a message and watch for:

### Expected Request:
- **URL**: `https://icwusduvaohosrvxlahh.supabase.co/functions/v1/chat-message`
- **Method**: POST
- **Status**: 200 OK
- **Headers**: Should include `Authorization: Bearer <token>`

### If Request Fails:

#### Status 404
**Problem**: Function not deployed
**Solution**:
```bash
supabase functions deploy chat-message --no-verify-jwt
```

#### Status 500
**Problem**: Function error (probably missing tables)
**Solution**: Apply migration (Step 1)

#### Status 401
**Problem**: Not authenticated
**Solution**: Sign in to the app

#### No request at all
**Problem**: Frontend error
**Solution**: Check browser console for JavaScript errors

---

## Step 4: Test Edge Function Directly

Test if the edge function works independently:

```bash
# Test with curl (replace YOUR_TOKEN with your actual JWT token)
curl -i --location --request POST 'https://icwusduvaohosrvxlahh.supabase.co/functions/v1/chat-message' \
  --header 'Authorization: Bearer YOUR_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{"message":"Hello, what is the news today?"}'
```

**Expected Response**: Streaming data starting with `data: {"type":"chunk"...`

---

## Step 5: Check Supabase Function Logs

Unfortunately, the Supabase CLI version you have doesn't support `logs` command well.

Instead, check logs in dashboard:
1. Go to: https://supabase.com/dashboard/project/icwusduvaohosrvxlahh/functions
2. Click on `chat-message`
3. Click "Logs" tab
4. Send a test message from the app
5. Look for error messages in logs

---

## Step 6: Verify Environment Variables

Check that ANTHROPIC_API_KEY is set:

```bash
supabase secrets list
```

Should show: `ANTHROPIC_API_KEY`

If not shown, set it again:
```bash
supabase secrets set ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

---

## Step 7: Check Auth Token

The app needs a valid auth token. Test in browser console:

```javascript
// Get current user
const { data: { user } } = await supabase.auth.getUser()
console.log('User:', user)
console.log('Access token:', user?.access_token)
```

If `user` is null, you need to sign in.

---

## Quick Diagnostic Script

Run this in browser console on the AI Chat page:

```javascript
// AI Chat Diagnostic
console.log('=== AI Chat Diagnostic ===')

// Check if user is logged in
const checkAuth = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}`
      }
    })
    const user = await response.json()
    console.log('✅ Auth:', user.email ? `Logged in as ${user.email}` : '❌ Not logged in')
  } catch (e) {
    console.log('❌ Auth Error:', e.message)
  }
}

// Check if tables exist
const checkTables = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/conversations?limit=1`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}`
      }
    })
    console.log('✅ Tables:', response.ok ? 'conversations table exists' : '❌ Tables not found (apply migration)')
  } catch (e) {
    console.log('❌ Table Error:', e.message)
  }
}

// Check if functions are deployed
const checkFunctions = async () => {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-conversations`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}`
      }
    })
    console.log('✅ Functions:', response.status === 200 || response.status === 401 ? 'Deployed' : '❌ Not deployed')
  } catch (e) {
    console.log('❌ Function Error:', e.message)
  }
}

await checkAuth()
await checkTables()
await checkFunctions()

console.log('=== End Diagnostic ===')
```

---

## Most Likely Issue

**90% chance**: Database migration not applied yet.

**Fix**:
1. Go to: https://supabase.com/dashboard/project/icwusduvaohosrvxlahh/sql/new
2. Paste the migration SQL (already in your clipboard)
3. Click "Run"
4. Refresh the AI Chat page
5. Try again!

---

## Still Not Working?

Share:
1. Browser console errors (screenshot or copy/paste)
2. Network tab showing the failed request
3. Supabase function logs (from dashboard)

And I'll help debug further!
