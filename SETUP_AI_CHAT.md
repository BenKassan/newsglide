# AI Chat Setup Instructions

## ✅ What's Already Done
- ✅ API key added to edge functions
- ✅ Navigation updated (Discover + AI Chat)
- ✅ UI components created
- ✅ Edge functions created
- ✅ Routes configured

## 🚀 Steps to Complete Setup

### Step 1: Apply Database Migration

Go to your Supabase dashboard → SQL Editor and run this migration:

**URL:** https://supabase.com/dashboard/project/icwusduvaohosrvxlahh/sql/new

Copy and paste the entire contents of: `supabase/migrations/20250930_create_ai_assistant_schema.sql`

Or run from terminal:
```bash
cd "/Users/elliotgreenbaum/NewsGlide Sep 2025/newsglide"

# Link to your remote project (if not already linked)
supabase link --project-ref icwusduvaohosrvxlahh

# Push the migration
supabase db push
```

### Step 2: Deploy Edge Functions

```bash
cd "/Users/elliotgreenbaum/NewsGlide Sep 2025/newsglide"

# Deploy chat-message function
supabase functions deploy chat-message --no-verify-jwt

# Deploy chat-conversations function
supabase functions deploy chat-conversations --no-verify-jwt
```

### Step 3: Set Environment Variable in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/icwusduvaohosrvxlahh/settings/functions
2. Click "Edge Function Settings"
3. Under "Secrets", add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `your_anthropic_api_key_here`

### Step 4: Test It!

1. Start your dev server (if not running):
   ```bash
   npm run dev
   ```

2. Navigate to: http://localhost:8083/ai-chat

3. Try sending a message like: "What's happening in tech today?"

## 🔍 Troubleshooting

### If the migration fails:
- Check if tables already exist in your database
- You can skip the CREATE TABLE statements if they exist

### If edge functions fail to deploy:
```bash
# Check function logs
supabase functions logs chat-message
supabase functions logs chat-conversations
```

### If chat doesn't work:
1. Open browser console (F12) and check for errors
2. Verify the ANTHROPIC_API_KEY is set in Supabase dashboard
3. Check that you're logged in (AI Chat requires authentication)

## 📋 What Each Component Does

- **Database Tables:**
  - `conversations` - Stores chat sessions
  - `messages` - Stores individual messages (user + AI responses)

- **Edge Functions:**
  - `chat-message` - Handles sending messages and streaming AI responses
  - `chat-conversations` - Manages conversation list (get, delete, rename)

- **UI Components:**
  - `ConversationSidebar` - Left sidebar with conversation list
  - `ChatArea` - Main chat interface with streaming messages
  - `AIChat` page - Container that orchestrates everything

## 🎯 Features Implemented

✅ Real-time message streaming (like ChatGPT)
✅ Conversation history management
✅ Delete conversations
✅ Auto-generated conversation titles
✅ User authentication
✅ Mobile-responsive design
✅ "Don't know what to search for?" button → AI Chat

## 🔜 Future Enhancements (Not Yet Implemented)

- User context integration (reading history, preferences)
- AI function calling (search articles, get recommendations)
- Rate limiting
- Usage analytics
