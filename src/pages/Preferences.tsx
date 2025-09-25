import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@features/auth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Switch } from '@ui/switch'
import { Checkbox } from '@ui/checkbox'
import { Label } from '@ui/label'
import { useToast } from '@shared/hooks/use-toast'
import { ArrowLeft, Settings, Bell, Eye, Newspaper, Sparkles, Heart, RefreshCw, Edit } from 'lucide-react'
import { personalizationService } from '@/services/personalizationService'
import UnifiedNavigation from '@/components/UnifiedNavigation'
import { OnboardingSurveyModal } from '@/components/OnboardingSurveyModal'

interface UserPreferences {
  default_reading_level: string
  email_notifications: boolean
  preferred_news_sources: string[]
  theme: string
  font_size: string
  survey_responses?: any
  liked_recommendations?: string[]
  onboarding_completed?: boolean
}

const NEWS_SOURCES = [
  'CNN',
  'BBC',
  'Reuters',
  'Associated Press',
  'NPR',
  'The Guardian',
  'The New York Times',
  'The Washington Post',
  'Fox News',
  'CNBC',
]

export default function Preferences() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [preferences, setPreferences] = useState<UserPreferences>({
    default_reading_level: 'base',
    email_notifications: true,
    preferred_news_sources: [],
    theme: 'light',
    font_size: 'medium',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showOnboardingSurvey, setShowOnboardingSurvey] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }

    // Load preferences asynchronously without blocking UI
    fetchPreferences()
  }, [user, navigate])

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select(
          'default_reading_level, email_notifications, preferred_news_sources, theme, font_size, survey_responses, liked_recommendations, onboarding_completed'
        )
        .eq('user_id', user!.id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching preferences:', error)
        return
      }

      if (data) {
        setPreferences({
          default_reading_level: data.default_reading_level || 'base',
          email_notifications: data.email_notifications ?? true,
          preferred_news_sources: data.preferred_news_sources || [],
          theme: data.theme || 'light',
          font_size: data.font_size || 'medium',
          survey_responses: data.survey_responses,
          liked_recommendations: data.liked_recommendations || [],
          onboarding_completed: data.onboarding_completed || false,
        })
      } else {
        // Create default preferences if they don't exist
        await createDefaultPreferences()
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const createDefaultPreferences = async () => {
    try {
      const { error } = await supabase.from('user_preferences').insert({
        user_id: user!.id,
        default_reading_level: 'base',
        email_notifications: true,
        preferred_news_sources: [],
        theme: 'light',
        font_size: 'medium',
      })

      if (error) {
        console.error('Error creating default preferences:', error)
      }
    } catch (error) {
      console.error('Error creating default preferences:', error)
    }
  }

  const handleSourceToggle = (source: string, checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      preferred_news_sources: checked
        ? [...prev.preferred_news_sources, source]
        : prev.preferred_news_sources.filter((s) => s !== source),
    }))
  }

  const savePreferences = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({
          default_reading_level: preferences.default_reading_level,
          email_notifications: preferences.email_notifications,
          preferred_news_sources: preferences.preferred_news_sources,
          theme: preferences.theme,
          font_size: preferences.font_size,
        })
        .eq('user_id', user!.id)

      if (error) {
        throw error
      }

      toast({
        title: 'Preferences saved',
        description: 'Your settings have been updated successfully.',
        variant: 'success',
      })
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Show UI immediately with loading states instead of full loading screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <UnifiedNavigation />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2 glass-card border-white/10 text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to NewsGlide
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                <Settings className="h-8 w-8" />
                Preferences
              </h1>
              <p className="text-gray-300">Customize your NewsGlide experience</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Reading Preferences */}
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Eye className="h-5 w-5" />
                  Reading Preferences
                </CardTitle>
                <CardDescription className="text-gray-400">Control how news content is presented to you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reading-level" className="text-gray-300">Default Reading Level</Label>
                  <Select
                    value={preferences.default_reading_level}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({ ...prev, default_reading_level: value }))
                    }
                    disabled={loading}
                  >
                    <SelectTrigger id="reading-level" className="bg-white/10 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      <SelectItem value="base" className="text-white hover:bg-white/10">Standard - Clear and accessible</SelectItem>
                      <SelectItem value="eli5" className="text-white hover:bg-white/10">Simple - Explain like I'm 5</SelectItem>
                      <SelectItem value="phd" className="text-white hover:bg-white/10">Academic - Detailed and technical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
                <CardDescription className="text-gray-400">Manage your notification preferences</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="email-notifications" className="text-gray-300">Email Notifications</Label>
                    <p className="text-sm text-gray-400">
                      Receive updates about trending topics and saved articles
                    </p>
                  </div>
                  <Switch
                    id="email-notifications"
                    checked={preferences.email_notifications}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, email_notifications: checked }))
                    }
                    disabled={loading}
                    className="data-[state=checked]:bg-blue-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* News Sources */}
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Newspaper className="h-5 w-5" />
                  Preferred News Sources
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Select your preferred news outlets for personalized content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {NEWS_SOURCES.map((source) => (
                    <div key={source} className="flex items-center space-x-2">
                      <Checkbox
                        id={source}
                        checked={preferences.preferred_news_sources.includes(source)}
                        onCheckedChange={(checked) =>
                          handleSourceToggle(source, checked as boolean)
                        }
                        disabled={loading}
                        className="border-white/20 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      />
                      <Label htmlFor={source} className="text-sm font-medium text-gray-300">
                        {source}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Display Settings */}
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Display Settings</CardTitle>
                <CardDescription className="text-gray-400">Customize the appearance of the application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="theme" className="text-gray-300">Theme</Label>
                  <Select
                    value={preferences.theme}
                    onValueChange={(value) => setPreferences((prev) => ({ ...prev, theme: value }))}
                    disabled={loading}
                  >
                    <SelectTrigger id="theme" className="bg-white/10 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      <SelectItem value="light" className="text-white hover:bg-white/10">Light</SelectItem>
                      <SelectItem value="dark" className="text-white hover:bg-white/10">Dark</SelectItem>
                      <SelectItem value="auto" className="text-white hover:bg-white/10">Auto (System)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="font-size" className="text-gray-300">Font Size</Label>
                  <Select
                    value={preferences.font_size}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({ ...prev, font_size: value }))
                    }
                    disabled={loading}
                  >
                    <SelectTrigger id="font-size" className="bg-white/10 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      <SelectItem value="small" className="text-white hover:bg-white/10">Small</SelectItem>
                      <SelectItem value="medium" className="text-white hover:bg-white/10">Medium</SelectItem>
                      <SelectItem value="large" className="text-white hover:bg-white/10">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Personalization Section */}
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Sparkles className="h-5 w-5" />
                  Personalization
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Manage your interests and content recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Survey Status */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div>
                    <h4 className="font-medium text-white">Interest Survey</h4>
                    <p className="text-sm text-gray-400">
                      {preferences.onboarding_completed 
                        ? 'You\'ve completed the interest survey' 
                        : 'Help us personalize your news feed'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/discover')}
                    className="flex items-center gap-2 glass-card border-white/10 text-white hover:bg-white/10"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {preferences.onboarding_completed ? 'Update Survey' : 'Take Survey'}
                  </Button>
                </div>

                {/* Survey Responses */}
                {preferences.onboarding_completed && preferences.survey_responses && (
                  <div className="space-y-4 p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-white">Your Survey Responses</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowOnboardingSurvey(true)}
                        className="text-gray-400 hover:text-white hover:bg-white/10"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                    
                    {/* Topic Interests */}
                    {preferences.survey_responses.topicInterests && preferences.survey_responses.topicInterests.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-400">Topics of Interest</h5>
                        <div className="flex flex-wrap gap-2">
                          {preferences.survey_responses.topicInterests.map((interest: string, index: number) => (
                            <Badge key={index} variant="secondary" className="bg-white/10 text-gray-300">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* News Consumption Style */}
                    {preferences.survey_responses.newsConsumption && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-400">Preferred Content Style</h5>
                        <p className="text-sm text-gray-300">{preferences.survey_responses.newsConsumption}</p>
                      </div>
                    )}
                    
                    {/* Goals */}
                    {preferences.survey_responses.goals && preferences.survey_responses.goals.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-400">How You Use News</h5>
                        <div className="flex flex-wrap gap-2">
                          {preferences.survey_responses.goals.map((goal: string, index: number) => (
                            <Badge key={index} variant="secondary" className="bg-white/10 text-gray-300">
                              {goal}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Liked Recommendations */}
                {preferences.liked_recommendations && preferences.liked_recommendations.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center gap-2 text-white">
                        <Heart className="h-4 w-4 text-red-400" />
                        Liked Topics ({preferences.liked_recommendations.length})
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            await supabase
                              .from('user_preferences')
                              .update({ liked_recommendations: [] })
                              .eq('user_id', user!.id)
                            
                            setPreferences(prev => ({ ...prev, liked_recommendations: [] }))
                            toast({
                              title: 'Cleared liked topics',
                              description: 'Your liked recommendations have been cleared.',
                              variant: 'success',
                            })
                          } catch (error) {
                            toast({
                              title: 'Error',
                              description: 'Failed to clear liked topics.',
                              variant: 'destructive',
                            })
                          }
                        }}
                        className="text-gray-400 hover:text-white hover:bg-white/10"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {preferences.liked_recommendations.map((topic, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded">
                          <span className="text-sm text-gray-300 flex-1">{topic}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              const updatedLikes = preferences.liked_recommendations!.filter((_, i) => i !== index)
                              try {
                                await supabase
                                  .from('user_preferences')
                                  .update({ liked_recommendations: updatedLikes })
                                  .eq('user_id', user!.id)
                                
                                setPreferences(prev => ({ ...prev, liked_recommendations: updatedLikes }))
                              } catch (error) {
                                console.error('Error removing liked topic:', error)
                              }
                            }}
                            className="text-gray-400 hover:text-white hover:bg-white/10"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Survey Responses Summary */}
                {preferences.survey_responses && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-white">Your Interests Profile</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {preferences.survey_responses.fieldOfInterest?.length > 0 && (
                        <div>
                          <span className="text-gray-400">Fields:</span>
                          <p className="font-medium text-white">{preferences.survey_responses.fieldOfInterest.join(', ')}</p>
                        </div>
                      )}
                      {preferences.survey_responses.role && (
                        <div>
                          <span className="text-gray-400">Role:</span>
                          <p className="font-medium text-white">{preferences.survey_responses.role}</p>
                        </div>
                      )}
                      {preferences.survey_responses.newsConsumption && (
                        <div>
                          <span className="text-gray-400">Reading Style:</span>
                          <p className="font-medium text-white">{preferences.survey_responses.newsConsumption}</p>
                        </div>
                      )}
                      {preferences.survey_responses.updateFrequency && (
                        <div>
                          <span className="text-gray-400">Update Frequency:</span>
                          <p className="font-medium text-white">{preferences.survey_responses.updateFrequency}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={savePreferences}
                disabled={saving || loading}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Survey Modal */}
      <OnboardingSurveyModal
        isOpen={showOnboardingSurvey}
        onClose={() => setShowOnboardingSurvey(false)}
        onComplete={() => {
          setShowOnboardingSurvey(false)
          // Refresh preferences to show updated survey responses
          window.location.reload()
        }}
      />
    </div>
  )
}
