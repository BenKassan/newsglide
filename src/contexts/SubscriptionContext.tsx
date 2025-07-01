
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getUserSubscription, checkFeatureAccess, getDailyUsage, UserSubscription } from '@/services/subscriptionService';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  loading: boolean;
  canUseFeature: (feature: 'phd' | 'morgan_freeman' | 'search') => Promise<boolean>;
  getDailyUsageCount: (feature: string) => Promise<number>;
  refreshSubscription: () => Promise<void>;
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
    if (!user?.id) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // First check with Stripe to get latest subscription status
      await supabase.functions.invoke('check-subscription');
      
      // Then get the updated subscription from our database
      const userSubscription = await getUserSubscription(user.id);
      setSubscription(userSubscription);
    } catch (error) {
      console.error('Error refreshing subscription:', error);
      // Fallback to database-only check
      if (user?.id) {
        const userSubscription = await getUserSubscription(user.id);
        setSubscription(userSubscription);
      }
    } finally {
      setLoading(false);
    }
  };

  const canUseFeature = async (feature: 'phd' | 'morgan_freeman' | 'search'): Promise<boolean> => {
    if (!user?.id) return false;
    return await checkFeatureAccess(user.id, feature);
  };

  const getDailyUsageCount = async (feature: string): Promise<number> => {
    if (!user?.id) return 0;
    return await getDailyUsage(user.id, feature);
  };

  useEffect(() => {
    if (user) {
      refreshSubscription();
    } else {
      setSubscription(null);
      setLoading(false);
    }
  }, [user]);

  const value = {
    subscription,
    loading,
    canUseFeature,
    getDailyUsageCount,
    refreshSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
