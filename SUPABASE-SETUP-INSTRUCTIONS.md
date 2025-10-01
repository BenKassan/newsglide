# Supabase Setup Instructions

## ✅ Completed Steps
1. **Updated environment variables** - Your new Supabase project credentials have been added to `.env.local`
2. **Enhanced error handling** - Added detailed error logging to help diagnose any issues
3. **Created database schema** - Generated comprehensive SQL for all required tables

## 📋 Next Steps to Complete Setup

### Step 1: Run the Database Setup Script
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/dligacdippwxeppogmzq/sql/new
2. Copy ALL the contents from the file `supabase/database-setup.sql`
3. Paste it into the SQL Editor
4. Click "Run" to execute the script

This will create:
- User profiles table
- User preferences table
- Reading history table
- Achievements table
- Daily challenges table
- All necessary Row Level Security policies
- Automatic triggers for new user setup

### Step 2: Enable Email Authentication
1. Go to Authentication > Providers in your Supabase dashboard
2. Ensure "Email" is enabled
3. Configure these email settings:
   - Enable email confirmations (recommended for production)
   - Set up SMTP (optional but recommended for custom emails)

### Step 3: Configure Authentication Settings
1. Go to Authentication > URL Configuration
2. Add your site URLs:
   - Site URL: `http://localhost:5173` (for development)
   - Add your production URL when you deploy
3. Add Redirect URLs:
   - `http://localhost:5173/*`
   - Your production URLs when ready

### Step 4: Create Storage Bucket for Avatars (Optional)
1. Go to Storage in your Supabase dashboard
2. Click "Create bucket"
3. Name it "avatars"
4. Make it public (toggle on)
5. Click "Create"

### Step 5: Restart Your Development Server
The dev server needs to be restarted to pick up the new environment variables:

```bash
# The server is being restarted automatically
# If you see any issues, manually restart with:
npm run dev
```

## 🔍 Troubleshooting

### Common Issues and Solutions

#### "Invalid API key" error
- Double-check that the `.env.local` file has the correct keys
- Make sure you restarted the dev server after updating `.env.local`

#### "User already registered" error
- This might happen if a user was partially created in the old database
- Try using a different email address for testing

#### "Failed to fetch" or CORS errors
- Check that your Site URL and Redirect URLs are correctly configured in Supabase
- Make sure you're using the correct project URL

#### Authentication works but user profile is missing
- The trigger to create profiles automatically should handle this
- If not, check the SQL Editor for any errors when running the setup script

#### Email confirmation not received
- Check spam folder
- In development, you can disable email confirmations temporarily in Authentication settings

## 📊 Database Structure Overview

### Tables Created:
1. **profiles** - Extended user information (name, avatar, gamification stats)
2. **user_preferences** - User settings and preferences
3. **reading_history** - Track articles read by users
4. **achievements** - Gamification achievements earned
5. **daily_challenges** - Daily reading challenges

### Security Features:
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Automatic profile creation on signup
- Secure authentication flow

## 🧪 Testing the Setup

Once everything is configured:

1. Open http://localhost:5173
2. Try creating a new account
3. Check the browser console for any error messages
4. If successful, you should see "Welcome back!" message
5. Check your Supabase dashboard to confirm the user was created

## 📱 What Your App Can Now Do

With this setup, your NewsGlide app supports:
- User registration and login
- Email verification (if enabled)
- Password reset functionality
- User profiles with gamification stats
- Reading history tracking
- Daily challenges
- Achievement system
- Personalized preferences

## Need Help?

If you encounter any issues:
1. Check the browser console for detailed error messages
2. Review the Supabase dashboard logs (under Settings > Logs)
3. Verify all the steps above were completed
4. The enhanced error handling will show specific error messages to help diagnose issues