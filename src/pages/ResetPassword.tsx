import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const token = searchParams.get('token');
  const type = searchParams.get('type');

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    if (!token || type !== 'recovery') {
      setLoading(false);
      setTokenValid(false);
      return;
    }

    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery'
      });

      if (error) {
        console.error('Token validation error:', error);
        setTokenValid(false);
      } else {
        setTokenValid(true);
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      setTokenValid(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (passwords.newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword
      });

      if (error) {
        toast({
          title: "Password reset failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setSuccess(true);
        toast({
          title: "Password updated successfully",
          description: "Your password has been reset. You can now sign in with your new password.",
          variant: "default",
        });
        
        // Wait 2 seconds then navigate to home
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: "Password reset failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestNewReset = () => {
    navigate('/');
    toast({
      title: "Request a new reset",
      description: "Please use the 'Forgot password' option to request a new reset link.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Validating reset token...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <AlertCircle className="h-6 w-6 text-red-600" />
              Invalid Reset Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 text-center">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Button
              onClick={handleRequestNewReset}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Request New Reset Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Password Reset Successful
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 text-center">
              Your password has been updated successfully. Redirecting you to the home page...
            </p>
            <div className="flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Reset Your Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password (min. 6 chars)"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  className="pl-10 pr-10"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;