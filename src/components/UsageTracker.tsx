
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SUBSCRIPTION_TIERS } from '@/services/subscriptionService';
import { PricingModal } from './PricingModal';

export const UsageTracker: React.FC = () => {
  const { subscription, getDailyUsageCount } = useSubscription();
  const [searchUsage, setSearchUsage] = useState(0);
  const [showPricingModal, setShowPricingModal] = useState(false);

  useEffect(() => {
    const fetchUsage = async () => {
      const usage = await getDailyUsageCount('search');
      setSearchUsage(usage);
    };
    fetchUsage();
  }, [getDailyUsageCount]);

  if (!subscription) return null;

  const tier = subscription.subscription_tier || 'free';
  const limits = SUBSCRIPTION_TIERS[tier];
  const usagePercentage = (searchUsage / limits.searches) * 100;
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = searchUsage >= limits.searches;

  return (
    <>
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Daily Searches</span>
              <Badge variant={tier === 'pro' ? 'default' : 'secondary'} className="text-xs">
                {tier === 'pro' ? 'Pro' : 'Free'}
              </Badge>
            </div>
            <span className="text-sm font-mono">
              {searchUsage}/{limits.searches}
            </span>
          </div>
          
          <Progress 
            value={Math.min(usagePercentage, 100)} 
            className={`h-2 ${isNearLimit ? 'text-amber-500' : 'text-blue-500'}`}
          />
          
          {tier === 'free' && (isNearLimit || isAtLimit) && (
            <div className="mt-3 text-center">
              {isAtLimit ? (
                <p className="text-xs text-red-600 mb-2">Daily limit reached</p>
              ) : (
                <p className="text-xs text-amber-600 mb-2">Almost at daily limit</p>
              )}
              <Button 
                size="sm" 
                onClick={() => setShowPricingModal(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-xs px-3 py-1 h-6"
              >
                Upgrade for 100/day
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
    </>
  );
};
