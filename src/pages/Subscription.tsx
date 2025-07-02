import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { createCheckoutSession } from '@/services/subscriptionService';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Crown, 
  Check, 
  X, 
  Zap,
  Search,
  Volume2,
  GraduationCap,
  CreditCard,
  Calendar
} from 'lucide-react';

export default function Subscription() {
  const { user } = useAuth();
  const { subscription, isProUser, refreshSubscription } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to upgrade to Pro.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const checkoutUrl = await createCheckoutSession(user.id);
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: "Failed to start checkout process. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      name: "Daily Searches",
      free: "5 per day",
      pro: "Unlimited",
      icon: Search
    },
    {
      name: "PhD Analysis",
      free: false,
      pro: true,
      icon: GraduationCap
    },
    {
      name: "Morgan Freeman Voice",
      free: false,
      pro: true,
      icon: Volume2
    },
    {
      name: "Save Articles",
      free: true,
      pro: true,
      icon: CreditCard
    },
    {
      name: "Search History",
      free: true,
      pro: true,
      icon: Calendar
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button onClick={() => navigate('/')} variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to NewsGlide
          </Button>
          
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Subscription
          </h1>
        </div>

        {/* Current Status */}
        {subscription && (
          <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isProUser ? (
                  <>
                    <Crown className="h-5 w-5 text-yellow-500" />
                    Pro Member
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 text-blue-500" />
                    Free Member
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Current Plan</p>
                  <p className="font-semibold flex items-center gap-2">
                    {isProUser ? (
                      <>
                        <Crown className="h-4 w-4 text-yellow-500" />
                        Pro ($3/month)
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 text-blue-500" />
                        Free
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Searches Today</p>
                  <p className="font-semibold">
                    {isProUser ? 'Unlimited' : `${subscription.daily_search_count}/5`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge variant={subscription.subscription_status === 'active' ? 'default' : 'secondary'}>
                    {subscription.subscription_status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Plans */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Plan */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                Free
              </CardTitle>
              <div className="text-2xl font-bold">$0/month</div>
            </CardHeader>
            <CardContent className="space-y-4">
              {features.map((feature) => (
                <div key={feature.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <feature.icon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{feature.name}</span>
                  </div>
                  <div className="text-sm">
                    {typeof feature.free === 'boolean' ? (
                      feature.free ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )
                    ) : (
                      feature.free
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-orange-50 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                Most Popular
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Pro
              </CardTitle>
              <div className="text-2xl font-bold">$3/month</div>
            </CardHeader>
            <CardContent className="space-y-4">
              {features.map((feature) => (
                <div key={feature.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <feature.icon className="h-4 w-4 text-gray-700" />
                    <span className="text-sm font-medium">{feature.name}</span>
                  </div>
                  <div className="text-sm">
                    {typeof feature.pro === 'boolean' ? (
                      feature.pro ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )
                    ) : (
                      <span className="font-semibold text-green-600">{feature.pro}</span>
                    )}
                  </div>
                </div>
              ))}
              
              {!isProUser && (
                <Button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="w-full mt-6 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                >
                  {loading ? 'Processing...' : 'Upgrade to Pro'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pro Benefits */}
        <Card className="mt-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Why Upgrade to Pro?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <Search className="h-12 w-12 mx-auto mb-3 text-blue-500" />
                <h3 className="font-semibold mb-2">Unlimited Research</h3>
                <p className="text-sm text-gray-600">
                  Search as much as you want. No daily limits, no restrictions.
                </p>
              </div>
              <div className="text-center">
                <GraduationCap className="h-12 w-12 mx-auto mb-3 text-purple-500" />
                <h3 className="font-semibold mb-2">PhD-Level Analysis</h3>
                <p className="text-sm text-gray-600">
                  Get deep, academic-level analysis with extensive research depth.
                </p>
              </div>
              <div className="text-center">
                <Volume2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <h3 className="font-semibold mb-2">Morgan Freeman Voice</h3>
                <p className="text-sm text-gray-600">
                  Listen to your articles with the iconic narrator's voice.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}