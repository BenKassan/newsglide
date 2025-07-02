import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserSubscription, UserSubscription } from '@/services/subscriptionService';

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  isProUser: boolean;
  canUseFeature: (feature: 'search' | 'phd' | 'voice') => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      console.log('Refreshing subscription for user:', user.id);
      const sub = await getUserSubscription(user.id);
      console.log('Fresh subscription data:', sub);
      setSubscription(sub);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSubscription();
  }, [user]);

  const isProUser = subscription?.subscription_tier === 'pro' && subscription?.subscription_status === 'active';

  const canUseFeature = (feature: 'search' | 'phd' | 'voice'): boolean => {
    if (!subscription) return false;
    
    if (isProUser) return true;
    
    if (feature === 'phd' || feature === 'voice') return false;
    
    if (feature === 'search') {
      return subscription.daily_search_count < 5;
    }
    
    return false;
  };

  const value = {
    subscription,
    loading,
    refreshSubscription,
    isProUser,
    canUseFeature
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};