import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@features/auth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { useToast } from '@shared/hooks/use-toast'
import { ArrowLeft, User, Calendar, BookmarkIcon, History, Clock } from 'lucide-react'
import UnifiedNavigation from '@/components/UnifiedNavigation'
import { sessionTrackingService } from '@/services/sessionTrackingService'

interface ProfileData {
  id: string
  email: string | null
  full_name: string | null
  created_at: string
}

interface UserStats {
  savedArticles: number
  searchHistory: number
  timeSpentMinutes: number
}

export default function Profile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [stats, setStats] = useState<UserStats>({ savedArticles: 0, searchHistory: 0, timeSpentMinutes: 0 })
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }

    // Load profile data asynchronously
    fetchProfileData()
  }, [user, navigate])

  const fetchProfileData = async () => {
    if (!user) return

    try {
      // Start both operations in parallel for better performance
      const [profileResult, statsResult] = await Promise.allSettled([
        fetchOrCreateProfile(),
        fetchUserStats(),
      ])

      if (profileResult.status === 'fulfilled' && profileResult.value) {
        setProfile(profileResult.value)
        setFullName(profileResult.value.full_name || '')
      }

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value)
      }
    } catch (error) {
      console.error('Error in fetchProfileData:', error)
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchOrCreateProfile = async (): Promise<ProfileData | null> => {
    if (!user) return null

    // Check if profile exists
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || null,
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating profile:', createError)
        throw createError
      }
      return newProfile
    } else if (profileError) {
      console.error('Error fetching profile:', profileError)
      throw profileError
    }

    return profileData
  }

  const fetchUserStats = async (): Promise<UserStats> => {
    if (!user) return { savedArticles: 0, searchHistory: 0, timeSpentMinutes: 0 }

    console.log('[Profile] Fetching user stats...')
    const startTime = Date.now()

    // Use Promise.allSettled to handle each stat independently
    const [savedArticlesResult, searchHistoryResult, timeSpentResult] = await Promise.allSettled([
      supabase
        .from('saved_articles')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('search_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      sessionTrackingService.getTotalTimeSpent(user.id),
    ])

    const duration = Date.now() - startTime
    console.log(`[Profile] Stats fetched in ${duration}ms`)
    console.log('[Profile] Saved articles:', savedArticlesResult.status, savedArticlesResult.status === 'fulfilled' ? (savedArticlesResult.value.count || 0) : 'rejected')
    console.log('[Profile] Search history:', searchHistoryResult.status, searchHistoryResult.status === 'fulfilled' ? (searchHistoryResult.value.count || 0) : 'rejected')
    console.log('[Profile] Time spent:', timeSpentResult.status, timeSpentResult.status === 'fulfilled' ? timeSpentResult.value : 'rejected')

    return {
      savedArticles: savedArticlesResult.status === 'fulfilled' ? (savedArticlesResult.value.count || 0) : 0,
      searchHistory: searchHistoryResult.status === 'fulfilled' ? (searchHistoryResult.value.count || 0) : 0,
      timeSpentMinutes: timeSpentResult.status === 'fulfilled' ? timeSpentResult.value : 0,
    }
  }

  const handleSave = async () => {
    if (!user || !profile) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() || null })
        .eq('id', user.id)

      if (error) {
        console.error('Error updating profile:', error)
        toast({
          title: 'Error',
          description: 'Failed to update profile',
          variant: 'destructive',
        })
      } else {
        setProfile((prev) => (prev ? { ...prev, full_name: fullName.trim() || null } : null))
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        })
      }
    } catch (error) {
      console.error('Error in handleSave:', error)
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Show immediate UI with loading states instead of full loading screen
  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'User'
  const joinDate = profile
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  return (
    <div className="min-h-screen bg-slate-50">
      <UnifiedNavigation />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-4 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to NewsGlide
          </Button>

          <h1 className="text-3xl font-bold text-slate-900">
            Your Profile
          </h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Information */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
                <Input value={profile?.email || ''} disabled className="bg-slate-50 border-slate-200 text-slate-600" />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Full Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  maxLength={50}
                  disabled={loading}
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                />
              </div>

              {profile && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {joinDate}</span>
                </div>
              )}

              <Button
                onClick={handleSave}
                disabled={saving || loading || fullName === (profile?.full_name || '')}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Your Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-sky-50 rounded-lg border border-sky-100">
                <div className="flex items-center gap-2">
                  <BookmarkIcon className="h-5 w-5 text-sky-600" />
                  <span className="font-medium text-slate-900">Saved Articles</span>
                </div>
                <span className="text-2xl font-bold text-sky-600">
                  {loading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-600"></div>
                  ) : (
                    stats.savedArticles
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium text-slate-900">Searches Made</span>
                </div>
                <span className="text-2xl font-bold text-emerald-600">
                  {loading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                  ) : (
                    stats.searchHistory
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-violet-50 rounded-lg border border-violet-100">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-violet-600" />
                  <span className="font-medium text-slate-900">Time Spent</span>
                </div>
                <span className="text-2xl font-bold text-violet-600">
                  {loading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600"></div>
                  ) : (
                    sessionTrackingService.formatDuration(stats.timeSpentMinutes)
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
