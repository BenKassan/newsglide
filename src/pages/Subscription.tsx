import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useToast } from '@/hooks/use-toast';
import { createCheckoutSession, createPortalSession } from '@/services/stripeService';
import { supabase } from '@/integrations/supabase/client';
import { Check, Crown, Zap, Brain, Volume2, Infinity, ArrowLeft } from 'lucide-react';
import UnifiedNavigation from '@/components/UnifiedNavigation';

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

    console.log('[SUBSCRIPTION] Starting upgrade process for user:', user.id);

    try {
      toast({
        title: "Setting up your subscription...",
        description: "Please wait while we redirect you to checkout",
      });

      console.log('[SUBSCRIPTION] Creating checkout session...');
      const { url } = await createCheckoutSession();
      
      console.log('[SUBSCRIPTION] Checkout URL received:', {
        url: url,
        urlLength: url?.length,
        urlStart: url?.substring(0, 50),
        isValidUrl: url?.startsWith('https://checkout.stripe.com/')
      });
      
      if (!url || !url.startsWith('https://')) {
        throw new Error(`Invalid checkout URL received: ${url}`);
      }
      
      // Open in current window and check if it loads
      console.log('[SUBSCRIPTION] Redirecting to Stripe checkout...');
      window.location.href = url;
      
    } catch (error: any) {
      console.error('[SUBSCRIPTION] Checkout error:', error);
      
      // Show detailed error information
      const errorMessage = error instanceof Error ? error.message : "Failed to start checkout process";
      const isDev = window.location.hostname === 'localhost';
      
      toast({
        title: "Checkout Error",
        description: isDev ? 
          `${errorMessage} (Check console for details)` : 
          errorMessage,
        variant: "destructive",
        duration: 10000
      });
      
      // Log additional debugging info in development
      if (isDev) {
        console.error('[SUBSCRIPTION] Full error details:', {
          error,
          message: errorMessage,
          stack: error?.stack,
          user: user?.id
        });
      }
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

  const handleCheckPayment = async () => {
    if (!user) return;

    try {
      toast({
        title: "Checking payment status...",
        description: "Looking for your recent payment",
      });

      // Call edge function to check and fix subscription
      const { data, error } = await supabase.functions.invoke('fix-subscription', {
        body: { email: user.email }
      });

      if (error) throw error;

      if (data.upgraded) {
        toast({
          title: "Success! 🎉",
          description: "Your Pro subscription is now active",
        });
        await refreshSubscription();
      } else {
        toast({
          title: "No recent payment found",
          description: "Please contact support if you've made a payment",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Check payment error:', error);
      toast({
        title: "Error checking payment",
        description: "Please try again or contact support",
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <UnifiedNavigation />
      <div className="container mx-auto px-6 pt-24 pb-12">
        {/* Back Navigation */}
        <Button onClick={() => navigate('/')} variant="ghost" className="mb-4 text-white hover:text-gray-200">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to NewsGlide
        </Button>
        
        {/* SUBSCRIPTION_DISABLED: Show free access message */}
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
            All Features Free! 🎉
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            We've made all NewsGlide features completely free and accessible to everyone.
          </p>
        </div>

        {/* SUBSCRIPTION_DISABLED: Simple free access card */}
        <Card className="max-w-2xl mx-auto mb-8 glass-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center justify-center text-white gap-2">
              <Sparkles className="h-6 w-6 text-yellow-400" />
              <span>Everything Unlocked</span>
              <Sparkles className="h-6 w-6 text-yellow-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-green-400 font-medium text-center text-lg">
                ✅ All features are now completely free!
              </p>
              <ul className="space-y-3 text-white">
                <li className="flex items-center gap-2">
                  <Infinity className="h-5 w-5 text-blue-400" />
                  <span className="font-medium">Unlimited Searches</span>
                </li>
                <li className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  <span className="font-medium">PhD-level Analysis</span>
                </li>
                <li className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-green-400" />
                  <span className="font-medium">Morgan Freeman Narration</span>
                </li>
                <li className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-pink-400" />
                  <span className="font-medium">AI Debate Generator</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  <span className="font-medium">Article Saving & History</span>
                </li>
              </ul>
              <Button
                onClick={() => navigate('/')}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white mt-4"
              >
                Start Using NewsGlide
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SUBSCRIPTION_DISABLED: Pricing plans hidden - everything is free */}
        {/* Pricing Plans - Hidden */}
        <div className="hidden grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {/* Free Plan */}
          <Card className="glass-card border-white/10">
            <CardHeader>
              <CardTitle className="text-center">
                <div className="text-2xl font-bold mb-2 text-white">Free</div>
                <div className="text-3xl font-bold text-gray-300">$0</div>
                <div className="text-sm text-gray-400">forever</div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-white">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span>5 searches per day</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span>Base + ELI5 reading levels</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span>Article saving & history</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span>Interactive Q&A</span>
                </li>
              </ul>
              <Button 
                variant="outline" 
                className="w-full glass-card border-white/10 text-white hover:bg-white/10" 
                disabled={!isProUser}
              >
                {!isProUser ? "Current Plan" : "Downgrade"}
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="glass-card border-white/10 relative bg-gradient-to-br from-blue-500/10 to-purple-500/10">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-1">
                Most Popular
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-center">
                <div className="text-2xl font-bold mb-2 flex items-center justify-center gap-2 text-white">
                  <Crown className="h-6 w-6 text-yellow-400" />
                  Pro
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  $3
                </div>
                <div className="text-sm text-gray-400">per month</div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-white">
                <li className="flex items-center gap-2">
                  <Infinity className="h-4 w-4 text-blue-400" />
                  <span>Unlimited searches</span>
                </li>
                <li className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-400" />
                  <span>PhD-level analysis</span>
                </li>
                <li className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-green-400" />
                  <span>Morgan Freeman narration</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span>All Free features included</span>
                </li>
              </ul>
              <Button 
                onClick={isProUser ? handleManageSubscription : handleUpgrade}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
              >
                {isProUser ? "Manage Subscription" : "Upgrade to Pro"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* SUBSCRIPTION_DISABLED: Feature comparison hidden - everything is free */}
        {/* Feature Comparison Table - Hidden */}
        <Card className="hidden max-w-4xl mx-auto glass-card border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Feature Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-gray-300">Feature</th>
                    <th className="text-center py-3 px-4 text-gray-300">Free</th>
                    <th className="text-center py-3 px-4 text-gray-300">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feature, index) => (
                    <tr key={index} className="border-b border-white/10">
                      <td className="py-3 px-4 flex items-center gap-2 text-white">
                        <feature.icon className="h-4 w-4 text-gray-400" />
                        {feature.name}
                      </td>
                      <td className="text-center py-3 px-4 text-gray-300">{feature.free}</td>
                      <td className="text-center py-3 px-4 font-medium text-blue-400">
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
            <p className="text-gray-300 mb-4">Sign in to manage your subscription</p>
            <Button onClick={() => navigate('/')} className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
              Go to Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Subscription;