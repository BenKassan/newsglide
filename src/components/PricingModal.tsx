
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upgrade to Pro",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) throw error;
      
      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
      onClose();
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout Error",
        description: "Failed to start checkout process. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Upgrade to NewsGlide Pro
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* Free Tier */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Free
                <Badge variant="outline">Current</Badge>
              </CardTitle>
              <div className="text-3xl font-bold">$0</div>
              <p className="text-sm text-gray-600">Forever free</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-3 text-green-500" />
                  <span>5 searches per day</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-3 text-green-500" />
                  <span>Base & ELI5 analysis</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-3 text-green-500" />
                  <span>Save articles</span>
                </li>
                <li className="flex items-center">
                  <X className="h-4 w-4 mr-3 text-gray-400" />
                  <span className="text-gray-500">PhD-level analysis</span>
                </li>
                <li className="flex items-center">
                  <X className="h-4 w-4 mr-3 text-gray-400" />
                  <span className="text-gray-500">Morgan Freeman voice</span>
                </li>
                <li className="flex items-center">
                  <X className="h-4 w-4 mr-3 text-gray-400" />
                  <span className="text-gray-500">Priority support</span>
                </li>
              </ul>
            </CardContent>
          </Card>
          
          {/* Pro Tier */}
          <Card className="relative border-2 border-purple-500 shadow-lg">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1">
                🎉 SAVE $1/month
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Pro
                <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                  Popular
                </Badge>
              </CardTitle>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">$3.99</span>
                <span className="text-lg text-gray-500 line-through">$4.99</span>
                <span className="text-sm text-gray-600">/month</span>
              </div>
              <p className="text-sm text-gray-600">Cancel anytime</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-3 text-green-500" />
                  <span className="font-medium">100 searches per day</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-3 text-green-500" />
                  <span>All analysis levels (Base, ELI5, PhD)</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-3 text-green-500" />
                  <span className="font-medium">PhD-level deep analysis</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-3 text-green-500" />
                  <span className="font-medium">🎭 Morgan Freeman voice</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-3 text-green-500" />
                  <span>Premium voice options</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-4 w-4 mr-3 text-green-500" />
                  <span>Priority support</span>
                </li>
              </ul>
              
              <Button 
                onClick={handleSubscribe}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting Checkout...
                  </>
                ) : (
                  "Upgrade to Pro"
                )}
              </Button>
              
              <p className="text-xs text-center text-gray-500 mt-3">
                Secure payment powered by Stripe
              </p>
            </CardContent>
          </Card>
        </div>
        
        <div className="text-center mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            ✅ No contracts • ✅ Cancel anytime • ✅ 30-day money-back guarantee
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
