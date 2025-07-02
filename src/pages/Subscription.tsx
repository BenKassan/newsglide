import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useToast } from '@/hooks/use-toast';
import { createCheckoutSession, createPortalSession } from '@/services/stripeService';
import { Check, Crown, Zap, Brain, Volume2, Infinity, ArrowLeft } from 'lucide-react';

const Subscription = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isProUser, subscriptionTier, dailySearchCount, searchLimit, refreshSubscription } = useSubscription();
  const { toast } = useToast();

  // Handle success/cancel redirects from Stripe
  useEffect(() => {
    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const sessionId = searchParams.get('session_id');

    if (path === '/subscription/success' && sessionId) {
      toast({
        title: "Payment Successful! 🎉",
        description: "Welcome to NewsGlide Pro! Your subscription is now active.",
        duration: 5000,
      });
      refreshSubscription();
      // Clean URL
      navigate('/subscription', { replace: true });
    } else if (path === '/subscription/cancel') {
      toast({
        title: "Payment Cancelled",
        description: "No worries! You can upgrade anytime.",
        variant: "destructive",
      });
      // Clean URL
      navigate('/subscription', { replace: true });
    }
  }, [location, navigate, refreshSubscription, toast]);

  const handleUpgrade = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to upgrade to Pro",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({
        title: "Redirecting to checkout...",
        description: "Please wait while we set up your subscription",
      });

      const { url } = await createCheckoutSession();
      // Open in new tab instead of redirect
      window.open(url, '_blank');
      
      // Optionally refresh subscription after a delay
      setTimeout(() => {
        refreshSubscription();
      }, 5000);
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout Error",
        description: error instanceof Error ? error.message : "Failed to start checkout process",
        variant: "destructive"
      });
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    try {
      toast({
        title: "Opening customer portal...",
        description: "Redirecting to manage your subscription",
      });

      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (error) {
      console.error('Portal error:', error);
      toast({
        title: "Portal Error", 
        description: error instanceof Error ? error.message : "Failed to open customer portal",
        variant: "destructive"
      });
    }
  };

  const features = [
    {
      name: "Daily Searches",
      free: "5 per day",
      pro: "Unlimited",
      icon: Zap
    },
    {
      name: "Reading Levels",
      free: "Base + ELI5",
      pro: "Base + ELI5 + PhD",
      icon: Brain
    },
    {
      name: "Morgan Freeman Voice",
      free: "Not included",
      pro: "Included",
      icon: Volume2
    },
    {
      name: "Article Saving",
      free: "Unlimited",
      pro: "Unlimited",
      icon: Check
    },
    {
      name: "Search History",
      free: "Unlimited",
      pro: "Unlimited",
      icon: Check
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-6 py-12">
        {/* Back Navigation */}
        <Button onClick={() => navigate('/')} variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to NewsGlide
        </Button>
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Your Subscription
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the plan that works best for your news consumption needs.
          </p>
        </div>

        {/* Current Plan Status */}
        {user && (
          <Card className="max-w-2xl mx-auto mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Current Plan</span>
                {isProUser ? (
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                    <Crown className="h-4 w-4 mr-1" />
                    Pro Plan
                  </Badge>
                ) : (
                  <Badge variant="outline">Free Plan</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isProUser ? (
                <div className="space-y-4">
                  <p className="text-green-600 font-medium">✅ You have unlimited access to all Pro features!</p>
                  <Button 
                    onClick={handleManageSubscription}
                    variant="outline"
                    className="w-full"
                  >
                    Manage Subscription
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Searches Used Today:</span>
                    <span className="font-bold">{dailySearchCount}/{searchLimit}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${(dailySearchCount / searchLimit) * 100}%` }}
                    />
                  </div>
                  {dailySearchCount >= searchLimit && (
                    <p className="text-red-600 text-sm">You've reached your daily limit. Upgrade to Pro for unlimited searches!</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pricing Plans */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {/* Free Plan */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-center">
                <div className="text-2xl font-bold mb-2">Free</div>
                <div className="text-3xl font-bold text-gray-600">$0</div>
                <div className="text-sm text-gray-500">forever</div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>5 searches per day</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Base + ELI5 reading levels</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Article saving & history</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>Interactive Q&A</span>
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full" 
                disabled={!isProUser}
              >
                {!isProUser ? "Current Plan" : "Downgrade"}
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-1">
                Most Popular
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-center">
                <div className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
                  <Crown className="h-6 w-6 text-yellow-500" />
                  Pro
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  $3
                </div>
                <div className="text-sm text-gray-500">per month</div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Infinity className="h-4 w-4 text-blue-500" />
                  <span>Unlimited searches</span>
                </li>
                <li className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" />
                  <span>PhD-level analysis</span>
                </li>
                <li className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-green-500" />
                  <span>Morgan Freeman narration</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>All Free features included</span>
                </li>
              </ul>
              <Button 
                onClick={isProUser ? handleManageSubscription : handleUpgrade}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isProUser ? "Manage Subscription" : "Upgrade to Pro"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Feature Comparison Table */}
        <Card className="max-w-4xl mx-auto border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Feature Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Feature</th>
                    <th className="text-center py-3 px-4">Free</th>
                    <th className="text-center py-3 px-4">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-3 px-4 flex items-center gap-2">
                        <feature.icon className="h-4 w-4" />
                        {feature.name}
                      </td>
                      <td className="text-center py-3 px-4">{feature.free}</td>
                      <td className="text-center py-3 px-4 font-medium text-blue-600">
                        {feature.pro}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {!user && (
          <div className="text-center mt-8">
            <p className="text-gray-600 mb-4">Sign in to manage your subscription</p>
            <Button onClick={() => window.location.href = '/'}>
              Go to Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Subscription;