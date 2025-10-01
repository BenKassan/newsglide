import React, { createContext, useContext, useEffect, useState } from 'react';

interface SubscriptionContextType {
  isProUser: boolean;
  subscriptionTier: 'free' | 'pro';
  dailySearchCount: number;
  searchLimit: number;
  loading: boolean;
  canUseFeature: (feature: FeatureType) => boolean;
  incrementSearchCount: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

type FeatureType = 'phd_analysis' | 'morgan_freeman' | 'unlimited_searches' | 'ai_debates';

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // For now, give everyone full access regardless of authentication status
  const [isProUser] = useState(true); // Always true for everyone
  const [subscriptionTier] = useState<'free' | 'pro'>('pro'); // Always pro for everyone
  const [dailySearchCount] = useState(0); // Always 0 (unlimited)
  const [loading, setLoading] = useState(false); // No loading needed

  const searchLimit = Infinity; // Always unlimited

  const canUseFeature = (): boolean => {
    // All features available to everyone
    return true;
  };

  const incrementSearchCount = async () => {
    // No-op since everyone has unlimited searches
    return;
  };

  const refreshSubscription = async () => {
    // No-op since we're not using real subscription data
    return;
  };

  // No need to fetch subscription data since everyone gets full access
  useEffect(() => {
    setLoading(false);
  }, []);

  const value = {
    isProUser,
    subscriptionTier,
    dailySearchCount,
    searchLimit,
    loading,
    canUseFeature,
    incrementSearchCount,
    refreshSubscription
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};