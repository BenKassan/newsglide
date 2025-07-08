import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@features/auth'
import { useToast } from '@shared/hooks/use-toast'

interface SubscriptionContextType {
  isProUser: boolean
  subscriptionTier: 'free' | 'pro'
  dailySearchCount: number
  searchLimit: number
  loading: boolean
  canUseFeature: (feature: FeatureType) => boolean
  incrementSearchCount: () => Promise<void>
  refreshSubscription: () => Promise<void>
}

type FeatureType = 'phd_analysis' | 'morgan_freeman' | 'unlimited_searches' | 'ai_debates'

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export const useSubscription = () => {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isProUser, setIsProUser] = useState(false)
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'pro'>('free')
  const [dailySearchCount, setDailySearchCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const searchLimit = isProUser ? Infinity : 5

  const canUseFeature = (feature: FeatureType): boolean => {
    switch (feature) {
      case 'phd_analysis':
      case 'morgan_freeman':
      case 'ai_debates':
        return isProUser
      case 'unlimited_searches':
        return isProUser || dailySearchCount < 5
      default:
        return true
    }
  }

  const fetchSubscriptionData = async () => {
    if (!user) {
      setIsProUser(false)
      setSubscriptionTier('free')
      setDailySearchCount(0)
      setLoading(false)
      return
    }

    try {
      console.log('Fetching subscription data for user:', user.id)

      const { data, error } = await supabase
        .from('user_preferences')
        .select('subscription_tier, daily_search_count, subscription_status')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error fetching subscription data:', error)
        // If no preferences exist, create default ones
        if (error.code === 'PGRST116') {
          const { error: insertError } = await supabase.from('user_preferences').insert({
            user_id: user.id,
            subscription_tier: 'free',
            daily_search_count: 0,
            subscription_status: 'active',
          })

          if (insertError) {
            console.error('Error creating default preferences:', insertError)
          } else {
            setIsProUser(false)
            setSubscriptionTier('free')
            setDailySearchCount(0)
          }
        }
      } else {
        console.log('Subscription data fetched:', data)
        const isPro = data.subscription_tier === 'pro' && data.subscription_status === 'active'
        setIsProUser(isPro)
        setSubscriptionTier(data.subscription_tier || 'free')
        setDailySearchCount(data.daily_search_count || 0)
      }
    } catch (error) {
      console.error('Unexpected error fetching subscription data:', error)
    } finally {
      setLoading(false)
    }
  }

  const incrementSearchCount = async () => {
    if (!user || isProUser) return

    try {
      console.log('Incrementing search count for user:', user.id)

      // Call the increment function
      const { error } = await supabase.rpc('increment_search_count', {
        p_user_id: user.id,
      })

      if (error) {
        console.error('Error incrementing search count:', error)
        toast({
          title: 'Error',
          description: 'Failed to update search count',
          variant: 'destructive',
        })
        return
      }

      // Update local state
      setDailySearchCount((prev) => prev + 1)
      console.log('Search count incremented successfully')
    } catch (error) {
      console.error('Unexpected error incrementing search count:', error)
    }
  }

  const refreshSubscription = async () => {
    if (!user) return
    console.log('Refreshing subscription data...')
    await fetchSubscriptionData()
  }

  useEffect(() => {
    fetchSubscriptionData()
  }, [user])

  const value = {
    isProUser,
    subscriptionTier,
    dailySearchCount,
    searchLimit,
    loading,
    canUseFeature,
    incrementSearchCount,
    refreshSubscription,
  }

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}
