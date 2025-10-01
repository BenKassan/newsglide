# Unsplash Image Integration Setup

This guide explains how to set up Unsplash API integration for trending topic images.

## Overview

The trending topics section now displays relevant images fetched from Unsplash API. The system:
- Automatically fetches images based on topic keywords
- Caches images to avoid redundant API calls
- Falls back to gradient placeholders if images unavailable
- Infers categories from topic titles (Technology, Business, Environment, etc.)

## Getting Your Unsplash API Key

### Step 1: Create Unsplash Account
1. Go to [Unsplash Developers](https://unsplash.com/developers)
2. Sign up or log in to your account

### Step 2: Create an Application
1. Click "Register as a Developer"
2. Accept the API Terms
3. Click "New Application"
4. Fill in the required information:
   - **Application name**: NewsGlide (or your preferred name)
   - **Description**: Fetch relevant images for news trending topics
   - Accept the API Guidelines
5. Click "Create Application"

### Step 3: Get Your Access Key
1. On your application page, you'll see:
   - **Access Key** (this is what you need)
   - **Secret Key** (not needed for this integration)
2. Copy the **Access Key**

### Step 4: Add to Environment Variables
1. Open `.env.local` in your project root
2. Replace `YOUR_UNSPLASH_ACCESS_KEY_HERE` with your actual key:
```env
VITE_UNSPLASH_ACCESS_KEY=your_actual_access_key_here
```
3. Save the file
4. Restart your dev server (`npm run dev`)

## API Rate Limits

**Free Tier (Demo):**
- 50 requests per hour
- Sufficient for development and small-scale testing

**Production Tier:**
- 5,000 requests per hour
- Contact Unsplash to upgrade when needed

## How It Works

### Image Fetching Flow
1. When trending topics load, the system extracts topic titles
2. For each topic, it searches Unsplash with relevant keywords
3. Images are cached in memory to avoid repeat requests
4. If no image is found, a gradient placeholder is used

### Keyword Optimization
The service includes smart keyword mapping:
- "OpenAI GPT-5" → searches for "artificial intelligence technology"
- "Climate Summit 2025" → searches for "climate environment conference"
- "Tesla Stock News" → searches for "electric vehicle business"

This ensures more relevant, high-quality images.

### Category Inference
Topics are automatically categorized:
- **Technology**: AI, crypto, software-related topics
- **Environment**: Climate, weather, energy topics
- **Business**: Stocks, markets, economy topics
- **Politics**: Elections, government, policy topics
- **Health**: Medical, disease-related topics
- **Sports**: Games, competitions, events
- **World**: Wars, conflicts, international news

## Files Modified

### New Files
- `src/services/unsplashService.ts` - Unsplash API integration

### Modified Files
- `src/pages/Index.tsx` - Updated to fetch and display images
- `.env.local` - Added Unsplash API key configuration

## Troubleshooting

### Images Not Loading
1. **Check API Key**: Ensure `VITE_UNSPLASH_ACCESS_KEY` is set correctly in `.env.local`
2. **Check Console**: Look for errors in browser developer console
3. **Rate Limit**: If you hit 50 requests/hour, wait or upgrade to production tier
4. **Network Issues**: Check your internet connection

### Wrong Images
The system maps topics to better search terms. If images don't match:
1. Check the keyword mappings in `unsplashService.ts`
2. Add custom mappings for specific topics
3. Adjust the `cleanTopicForSearch` function

### Performance Issues
- Images are cached in memory (browser session)
- Each search has a 100ms delay to respect rate limits
- Consider implementing localStorage caching for persistent storage

## Future Enhancements

Potential improvements:
1. **Backend Image Fetching**: Move image fetching to backend to protect API key
2. **Persistent Cache**: Store images in localStorage or database
3. **Image Generation**: Add DALL-E integration as fallback
4. **News API Images**: Extract images directly from news articles
5. **CDN Integration**: Cache images on CDN for faster loading

## Cost Considerations

- **Development**: Free tier (50/hour) is sufficient
- **Production**: Consider:
  - Upgrading to 5,000/hour tier (free, requires approval)
  - Implementing backend caching
  - Using CDN for frequently accessed images
  - Rate limiting on frontend

## Support

For Unsplash API issues:
- [Unsplash API Documentation](https://unsplash.com/documentation)
- [Unsplash Support](https://unsplash.com/contact)

For implementation questions:
- Check browser console for error messages
- Review `src/services/unsplashService.ts` for details
- Ensure environment variables are properly loaded
