import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@features/auth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Switch } from '@ui/switch'
import { Checkbox } from '@ui/checkbox'
import { Label } from '@ui/label'
import { Badge } from '@ui/badge'
import { useToast } from '@shared/hooks/use-toast'
import { ArrowLeft, Settings, Bell, Eye, Newspaper, Sparkles, Heart, RefreshCw, Edit } from 'lucide-react'
import UnifiedNavigation from '@/components/UnifiedNavigation'
import AmbientBackground from '@/components/AmbientBackground'
import { OnboardingSurveyModal } from '@/components/OnboardingSurveyModal'
import {
  ArticleLengthPreference,
  ArticleStylePreference,
  DEFAULT_ARTICLE_LENGTH,
  DEFAULT_ARTICLE_STYLE,
  DEFAULT_READING_LEVEL,
  normalizeArticleLength,
  normalizeArticleStyle,
  normalizeReadingLevel,
  ReadingLevelPreference,
  READING_LEVEL_OPTIONS,
  ARTICLE_LENGTH_OPTIONS,
  ARTICLE_STYLE_OPTIONS,
} from '@/types/articlePreferences.types'

interface UserPreferences {
  default_reading_level: ReadingLevelPreference
  default_article_length: ArticleLengthPreference
  default_article_style: ArticleStylePreference
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

const isMissingPreferenceColumnsError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const code = (error as { code?: string }).code
  return code === 'PGRST204'
}

export default function Preferences() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [preferences, setPreferences] = useState<UserPreferences>({
    default_reading_level: DEFAULT_READING_LEVEL,
    default_article_length: DEFAULT_ARTICLE_LENGTH,
    default_article_style: DEFAULT_ARTICLE_STYLE,
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
          'default_reading_level, default_article_length, default_article_style, email_notifications, preferred_news_sources, theme, font_size, survey_responses, liked_recommendations, onboarding_completed'
        )
        .eq('user_id', user!.id)
        .maybeSingle()

      if (error) {
        if (isMissingPreferenceColumnsError(error)) {
          console.error('Preference columns missing in Supabase schema:', error)
          toast({
            title: 'Database update required',
            description:
              'Your Supabase database is missing the new article preference columns. Apply the migration in supabase/migrations/20251015120000_add_article_preferences.sql.',
            variant: 'destructive',
          })
        } else {
          console.error('Error fetching preferences:', error)
          toast({
            title: 'Error',
            description: 'Unable to load your preferences. Please try again.',
            variant: 'destructive',
          })
        }
        return
      }

      if (data) {
        setPreferences({
          default_reading_level: normalizeReadingLevel(data.default_reading_level),
          default_article_length: normalizeArticleLength(data.default_article_length),
          default_article_style: normalizeArticleStyle(data.default_article_style),
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
      if (isMissingPreferenceColumnsError(error)) {
        console.error('Preference columns missing in Supabase schema:', error)
      } else {
        console.error('Error fetching preferences:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const createDefaultPreferences = async () => {
    try {
      const { error } = await supabase.from('user_preferences').upsert({
        user_id: user!.id,
        default_reading_level: DEFAULT_READING_LEVEL,
        default_article_length: DEFAULT_ARTICLE_LENGTH,
        default_article_style: DEFAULT_ARTICLE_STYLE,
        email_notifications: true,
        preferred_news_sources: [],
        theme: 'light',
        font_size: 'medium',
      }, { onConflict: 'user_id' })

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
      const payload = {
        user_id: user!.id,
        default_reading_level: preferences.default_reading_level,
        default_article_length: preferences.default_article_length,
        default_article_style: preferences.default_article_style,
        email_notifications: preferences.email_notifications,
        preferred_news_sources: preferences.preferred_news_sources,
        theme: preferences.theme,
        font_size: preferences.font_size,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('user_preferences')
        .upsert(payload, { onConflict: 'user_id', ignoreDuplicates: false })

      if (error) {
        throw error
      }

      toast({
        title: 'Preferences saved',
        description: 'Your settings have been updated successfully.',
        variant: 'success',
      })
    } catch (error) {
      if (isMissingPreferenceColumnsError(error)) {
        console.error('Preference columns missing in Supabase schema:', error)
        toast({
          title: 'Database update required',
          description:
            'Supabase rejected the save because the user_preferences table is missing the new preference columns. Apply the migration in supabase/migrations/20251015120000_add_article_preferences.sql and try again.',
          variant: 'destructive',
        })
      } else {
        console.error('Error saving preferences:', error)
        toast({
          title: 'Error',
          description: 'Failed to save preferences. Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  // Show UI immediately with loading states instead of full loading screen
  return (
    <div className="min-h-screen relative overflow-hidden">
      <AmbientBackground variant="preferences" />
      <div className="relative z-10">
        <UnifiedNavigation />
        <div className="container mx-auto px-4 pt-24 pb-12">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to NewsGlide
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="h-8 w-8 text-sky-600" />
                  Preferences
                </h1>
                <p className="text-slate-600">Customize your NewsGlide experience</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Reading Preferences */}
              <Card className="bg-white/90 backdrop-blur-sm border-slate-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Eye className="h-5 w-5 text-sky-600" />
                    Reading Preferences
                  </CardTitle>
                  <CardDescription className="text-slate-600">Control how news content is presented to you</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="reading-level" className="text-slate-700 font-medium">
                      Default Reading Level
                    </Label>
                    <Select
                      value={preferences.default_reading_level}
                      onValueChange={(value) =>
                        setPreferences((prev) => ({
                          ...prev,
                          default_reading_level: value as ReadingLevelPreference,
                        }))
                      }
                      disabled={loading}
                    >
                      <SelectTrigger
                        id="reading-level"
                        className="bg-white border-slate-300 text-slate-900"
                      >
                        <SelectValue placeholder="Choose your default reading level" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 space-y-1">
                        {READING_LEVEL_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="text-slate-900 hover:bg-slate-100 py-2"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{option.label}</span>
                              <span className="text-xs text-slate-600">
                                {option.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="article-length" className="text-slate-700 font-medium">
                      Default Article Length
                    </Label>
                    <Select
                      value={preferences.default_article_length}
                      onValueChange={(value) =>
                        setPreferences((prev) => ({
                          ...prev,
                          default_article_length: value as ArticleLengthPreference,
                        }))
                      }
                      disabled={loading}
                    >
                      <SelectTrigger
                        id="article-length"
                        className="bg-white border-slate-300 text-slate-900"
                      >
                        <SelectValue placeholder="Choose how in-depth articles should be" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 space-y-1">
                        {ARTICLE_LENGTH_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="text-slate-900 hover:bg-slate-100 py-2"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{option.label}</span>
                              <span className="text-xs text-slate-600">
                                {option.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="article-style" className="text-slate-700 font-medium">
                      Default Article Style
                    </Label>
                    <Select
                      value={preferences.default_article_style}
                      onValueChange={(value) =>
                        setPreferences((prev) => ({
                          ...prev,
                          default_article_style: value as ArticleStylePreference,
                        }))
                      }
                      disabled={loading}
                    >
                      <SelectTrigger
                        id="article-style"
                        className="bg-white border-slate-300 text-slate-900"
                      >
                        <SelectValue placeholder="Choose your preferred article layout" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 space-y-1">
                        {ARTICLE_STYLE_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="text-slate-900 hover:bg-slate-100 py-2"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{option.label}</span>
                              <span className="text-xs text-slate-600">
                                {option.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card className="bg-white/90 backdrop-blur-sm border-slate-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Bell className="h-5 w-5 text-sky-600" />
                    Notifications
                  </CardTitle>
                  <CardDescription className="text-slate-600">Manage your notification preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="email-notifications" className="text-slate-700 font-medium">Email Notifications</Label>
                      <p className="text-sm text-slate-600">
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
                      className="data-[state=checked]:bg-sky-600"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* News Sources */}
              <Card className="bg-white/90 backdrop-blur-sm border-slate-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Newspaper className="h-5 w-5 text-sky-600" />
                    Preferred News Sources
                  </CardTitle>
                  <CardDescription className="text-slate-600">
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
                          className="border-slate-300 data-[state=checked]:bg-sky-600 data-[state=checked]:border-sky-600"
                        />
                        <Label htmlFor={source} className="text-sm font-medium text-slate-700 cursor-pointer">
                          {source}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Display Settings */}
              <Card className="bg-white/90 backdrop-blur-sm border-slate-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-slate-900">Display Settings</CardTitle>
                  <CardDescription className="text-slate-600">Customize the appearance of the application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="theme" className="text-slate-700 font-medium">Theme</Label>
                    <Select
                      value={preferences.theme}
                      onValueChange={(value) => setPreferences((prev) => ({ ...prev, theme: value }))}
                      disabled={loading}
                    >
                      <SelectTrigger id="theme" className="bg-white border-slate-300 text-slate-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="light" className="text-slate-900 hover:bg-slate-100">Light</SelectItem>
                        <SelectItem value="dark" className="text-slate-900 hover:bg-slate-100">Dark</SelectItem>
                        <SelectItem value="auto" className="text-slate-900 hover:bg-slate-100">Auto (System)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="font-size" className="text-slate-700 font-medium">Font Size</Label>
                    <Select
                      value={preferences.font_size}
                      onValueChange={(value) =>
                        setPreferences((prev) => ({ ...prev, font_size: value }))
                      }
                      disabled={loading}
                    >
                      <SelectTrigger id="font-size" className="bg-white border-slate-300 text-slate-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="small" className="text-slate-900 hover:bg-slate-100">Small</SelectItem>
                        <SelectItem value="medium" className="text-slate-900 hover:bg-slate-100">Medium</SelectItem>
                        <SelectItem value="large" className="text-slate-900 hover:bg-slate-100">Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Personalization Section */}
              <Card className="bg-white/90 backdrop-blur-sm border-slate-200 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <Sparkles className="h-5 w-5 text-sky-600" />
                    Personalization
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Manage your interests and content recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Survey Status */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <h4 className="font-medium text-slate-900">Interest Survey</h4>
                      <p className="text-sm text-slate-600">
                        {preferences.onboarding_completed
                          ? 'You\'ve completed the interest survey'
                          : 'Help us personalize your news feed'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/discover')}
                      className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {preferences.onboarding_completed ? 'Update Survey' : 'Take Survey'}
                    </Button>
                  </div>

                  {/* Survey Responses */}
                  {preferences.onboarding_completed && preferences.survey_responses && (
                    <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-slate-900">Your Survey Responses</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowOnboardingSurvey(true)}
                          className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>

                      {/* Topic Interests */}
                      {preferences.survey_responses.topicInterests && preferences.survey_responses.topicInterests.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-slate-700">Topics of Interest</h5>
                          <div className="flex flex-wrap gap-2">
                            {preferences.survey_responses.topicInterests.map((interest: string, index: number) => (
                              <Badge key={index} variant="secondary" className="bg-sky-100 text-sky-700 border-sky-200">
                                {interest}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* News Consumption Style */}
                      {preferences.survey_responses.newsConsumption && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-slate-700">Preferred Content Style</h5>
                          <p className="text-sm text-slate-600">{preferences.survey_responses.newsConsumption}</p>
                        </div>
                      )}

                      {/* Goals */}
                      {preferences.survey_responses.goals && preferences.survey_responses.goals.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-slate-700">How You Use News</h5>
                          <div className="flex flex-wrap gap-2">
                            {preferences.survey_responses.goals.map((goal: string, index: number) => (
                              <Badge key={index} variant="secondary" className="bg-sky-100 text-sky-700 border-sky-200">
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
                        <h4 className="font-medium flex items-center gap-2 text-slate-900">
                          <Heart className="h-4 w-4 text-red-500" />
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
                          className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        >
                          Clear All
                        </Button>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {preferences.liked_recommendations.map((topic, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                            <span className="text-sm text-slate-700 flex-1">{topic}</span>
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
                              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
                      <h4 className="font-medium text-slate-900">Your Interests Profile</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {preferences.survey_responses.fieldOfInterest?.length > 0 && (
                          <div>
                            <span className="text-slate-600">Fields:</span>
                            <p className="font-medium text-slate-900">{preferences.survey_responses.fieldOfInterest.join(', ')}</p>
                          </div>
                        )}
                        {preferences.survey_responses.role && (
                          <div>
                            <span className="text-slate-600">Role:</span>
                            <p className="font-medium text-slate-900">{preferences.survey_responses.role}</p>
                          </div>
                        )}
                        {preferences.survey_responses.newsConsumption && (
                          <div>
                            <span className="text-slate-600">Reading Style:</span>
                            <p className="font-medium text-slate-900">{preferences.survey_responses.newsConsumption}</p>
                          </div>
                        )}
                        {preferences.survey_responses.updateFrequency && (
                          <div>
                            <span className="text-slate-600">Update Frequency:</span>
                            <p className="font-medium text-slate-900">{preferences.survey_responses.updateFrequency}</p>
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
                  className="bg-sky-600 hover:bg-sky-700 text-white px-8 py-2 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
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
