import { supabase } from '@/integrations/supabase/client'
import { generateUUID } from '@/utils/polyfills'

export interface SurveyResponses {
  fieldOfInterest: string[]
  role: string
  topicInterests: string[]
  newsConsumption: string
  goals: string[]
  // Optional fields for future expansion
  geographicInterest?: string
  timeAvailability?: string
  preferredPerspectives?: string[]
  updateFrequency?: string
  contentPreferences?: string[]
}

export interface InterestProfile {
  categories: Record<string, number>
  topics: Record<string, number>
  engagement: {
    clicks: number
    searches: number
    readingTime: number
  }
}

export const personalizationService = {
  // Save survey responses to user preferences
  async saveSurveyResponses(userId: string, responses: SurveyResponses) {
    try {
      const surveyData = {
        ...responses,
        completedAt: new Date().toISOString()
      }

      const { error } = await supabase
        .from('user_preferences')
        .update({ 
          survey_responses: surveyData,
          onboarding_completed: true,
          content_preferences: {
            readingLevel: responses.newsConsumption === 'Technical details' ? 'phd' : 
                         responses.newsConsumption === 'Simple explanations' ? 'eli5' : 'base',
            articleLength: responses.timeAvailability,
            preferredDepth: responses.newsConsumption,
            formatPreferences: responses.contentPreferences,
            updateFrequency: responses.updateFrequency
          }
        })
        .eq('user_id', userId)

      if (error) throw error
      
      // Cache the completion status
      sessionStorage.setItem(`onboarding_completed_${userId}`, 'true')
      
      return { success: true }
    } catch (error) {
      console.error('Error saving survey responses:', error)
      return { success: false, error }
    }
  },

  // Get user's liked recommendations
  async getLikedRecommendations(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('liked_recommendations')
        .eq('user_id', userId)
        .single()

      if (error) throw error
      
      return data?.liked_recommendations || []
    } catch (error) {
      console.error('Error fetching liked recommendations:', error)
      return []
    }
  },

  // Update interest profile based on user behavior
  async updateInterestProfile(userId: string, category: string, topic: string, action: 'click' | 'search' | 'read') {
    try {
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('interest_profile')
        .eq('user_id', userId)
        .single()

      const profile: InterestProfile = prefs?.interest_profile || {
        categories: {},
        topics: {},
        engagement: { clicks: 0, searches: 0, readingTime: 0 }
      }

      // Update category weight
      if (category) {
        profile.categories[category] = (profile.categories[category] || 0) + 0.1
        // Normalize to keep values between 0 and 1
        const maxWeight = Math.max(...Object.values(profile.categories))
        if (maxWeight > 1) {
          Object.keys(profile.categories).forEach(key => {
            profile.categories[key] = profile.categories[key] / maxWeight
          })
        }
      }

      // Update topic weight
      if (topic) {
        profile.topics[topic] = (profile.topics[topic] || 0) + 0.15
        // Normalize topics
        const maxTopicWeight = Math.max(...Object.values(profile.topics))
        if (maxTopicWeight > 1) {
          Object.keys(profile.topics).forEach(key => {
            profile.topics[key] = profile.topics[key] / maxTopicWeight
          })
        }
      }

      // Update engagement metrics
      if (action === 'click') profile.engagement.clicks++
      if (action === 'search') profile.engagement.searches++
      if (action === 'read') profile.engagement.readingTime += 5 // Assume 5 min average

      await supabase
        .from('user_preferences')
        .update({ interest_profile: profile })
        .eq('user_id', userId)

    } catch (error) {
      console.error('Error updating interest profile:', error)
    }
  },

  // Get user's complete preferences
  async getUserPreferences(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) throw error
      
      return data
    } catch (error) {
      console.error('Error fetching user preferences:', error)
      return null
    }
  },

  // Track recommendation interaction
  async trackRecommendationClick(userId: string, recommendation: string, sessionId?: string) {
    try {
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('recommendation_history')
        .eq('user_id', userId)
        .single()

      const history = prefs?.recommendation_history || []

      // Find the most recent session or create new entry
      const lastSession = history[history.length - 1]

      if (lastSession && lastSession.sessionId === sessionId) {
        // Update existing session
        if (!lastSession.clicked) lastSession.clicked = []
        if (!lastSession.clicked.includes(recommendation)) {
          lastSession.clicked.push(recommendation)
        }
      } else {
        // This click is from outside a recommendation session
        history.push({
          timestamp: new Date().toISOString(),
          recommendations: [],
          clicked: [recommendation],
          liked: [],
          sessionId: sessionId || generateUUID()
        })
      }

      // Keep only last 10 sessions
      const updatedHistory = history.slice(-10)

      await supabase
        .from('user_preferences')
        .update({ recommendation_history: updatedHistory })
        .eq('user_id', userId)

    } catch (error) {
      console.error('Error tracking recommendation click:', error)
    }
  },

  // Get user's interest profile
  async getInterestProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('interest_profile')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error

      return data?.interest_profile || { topics: {}, categories: {}, updated_at: new Date().toISOString() }
    } catch (error) {
      console.error('Error fetching interest profile:', error)
      return { topics: {}, categories: {}, updated_at: new Date().toISOString() }
    }
  },

  // Get top interests by weight
  async getTopInterests(userId: string, limit: number = 5): Promise<string[]> {
    try {
      const profile = await this.getInterestProfile(userId)

      return Object.entries(profile.topics || {})
        .sort(([,a]: any, [,b]: any) => b - a)
        .slice(0, limit)
        .map(([topic]) => topic)
    } catch (error) {
      console.error('Error fetching top interests:', error)
      return []
    }
  },

  // Merge survey interests with chat-extracted interests
  async mergeInterestsFromSurvey(userId: string, surveyData: SurveyResponses) {
    try {
      // Get current interest profile
      const currentProfile = await this.getInterestProfile(userId)

      // Convert survey data to interest format with high initial weights
      const updatedProfile = {
        topics: { ...currentProfile.topics },
        categories: { ...currentProfile.categories },
        updated_at: new Date().toISOString()
      }

      // Add survey topic interests with weight 0.8
      for (const topic of surveyData.topicInterests || []) {
        updatedProfile.topics[topic] = Math.max(updatedProfile.topics[topic] || 0, 0.8)
      }

      // Add survey field interests as categories with weight 0.7
      for (const field of surveyData.fieldOfInterest || []) {
        updatedProfile.categories[field] = Math.max(updatedProfile.categories[field] || 0, 0.7)
      }

      // Save merged profile
      await supabase
        .from('user_preferences')
        .update({ interest_profile: updatedProfile })
        .eq('user_id', userId)

      return updatedProfile
    } catch (error) {
      console.error('Error merging survey interests:', error)
      return null
    }
  },

  // Remove a specific interest
  async removeInterest(userId: string, interest: string, type: 'topic' | 'category' = 'topic') {
    try {
      const profile = await this.getInterestProfile(userId)

      if (type === 'topic' && profile.topics) {
        delete profile.topics[interest]
      } else if (type === 'category' && profile.categories) {
        delete profile.categories[interest]
      }

      profile.updated_at = new Date().toISOString()

      await supabase
        .from('user_preferences')
        .update({ interest_profile: profile })
        .eq('user_id', userId)

      return profile
    } catch (error) {
      console.error('Error removing interest:', error)
      return null
    }
  }
}