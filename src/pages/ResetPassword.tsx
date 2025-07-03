import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Super comprehensive debugging
    console.log('=== PASSWORD RESET DEBUG ===');
    console.log('Full URL:', window.location.href);
    console.log('Origin:', window.location.origin);
    console.log('Pathname:', window.location.pathname);
    console.log('Search:', window.location.search);
    console.log('Hash:', window.location.hash);
    
    // Try all possible Supabase formats
    
    // Format 1: Hash with error_code (Supabase magic link format)
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      console.log('Hash params:', Object.fromEntries(hashParams.entries()));
      
      // Check for error first
      const errorCode = hashParams.get('error_code');
      if (errorCode) {
        console.error('Supabase error in URL:', errorCode);
        const errorDesc = hashParams.get('error_description');
        setError(errorDesc || 'Authentication error occurred');
        setLoading(false);
        return;
      }
      
      // Try access_token format
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      if (accessToken) {
        console.log('Found access token in hash');
        validateWithSession(accessToken, refreshToken);
        return;
      }
    }
    
    // Format 2: Query params with code (OAuth flow)
    const queryParams = new URLSearchParams(window.location.search);
    console.log('Query params:', Object.fromEntries(queryParams.entries()));
    
    const code = queryParams.get('code');
    if (code) {
      console.log('Found code in query params');
      exchangeCodeForSession(code);
      return;
    }
    
    // Format 3: Direct token format
    const token = queryParams.get('token');
    const tokenHash = queryParams.get('token_hash');
    const type = queryParams.get('type');
    
    if (token || tokenHash) {
      console.log('Found token/token_hash in query params');
      validateWithOtp(token || tokenHash, type);
      return;
    }
    
    // No valid params found
    console.error('No valid reset params found in URL');
    setError('Invalid reset link format');
    setLoading(false);
  }, []);

  const validateWithSession = async (accessToken: string, refreshToken: string | null) => {
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || ''
      });
      
      console.log('Set session result:', { data, error });
      
      if (error) throw error;
      
      // Double-check we have a user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user after setSession:', user?.email);
      
      if (user) {
        setTokenValid(true);
        setLoading(false);
      } else {
        throw new Error('No user found after setting session');
      }
    } catch (err) {
      console.error('Session validation error:', err);
      setError('Failed to validate reset link');
      setLoading(false);
    }
  };

  const exchangeCodeForSession = async (code: string) => {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      console.log('Exchange code result:', { data, error });
      
      if (error) throw error;
      
      if (data.session) {
        setTokenValid(true);
        setLoading(false);
      }
    } catch (err) {
      console.error('Code exchange error:', err);
      setError('Failed to validate reset code');
      setLoading(false);
    }
  };

  const validateWithOtp = async (token: string, type: string | null) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type as 'recovery' || 'recovery'
      });
      
      console.log('Verify OTP result:', { data, error });
      
      if (error) throw error;
      
      setTokenValid(true);
      setLoading(false);
    } catch (err) {
      console.error('OTP validation error:', err);
      setError('Failed to validate reset token');
      setLoading(false);
    }
  };

  const handleManualReset = async () => {
    const email = prompt('Enter your email address:');
    if (!email) return;
    
    try {
      // Sign in with magic link instead
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false,
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Check your email",
        description: "We sent you a magic link to sign in and reset your password",
      });
      
      navigate('/');
    } catch (err) {
      console.error('Manual reset error:', err);
      setError('Failed to send reset email');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      // Success!
      toast({
        title: "Password Reset Successful",
        description: "Your password has been updated. Redirecting to home...",
        duration: 3000,
      });

      // Clear the URL hash/params
      window.history.replaceState({}, document.title, window.location.pathname);

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (err: any) {
      console.error('Password update error:', err);
      setError(err.message || 'Failed to update password. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {tokenValid ? 'Reset Your Password' : 'Invalid Reset Link'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!tokenValid ? (
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <p className="text-gray-600">{error}</p>
              <Button 
                onClick={() => navigate('/')} 
                className="w-full"
              >
                Back to Home
              </Button>
              <div className="mt-4 p-4 bg-gray-100 rounded text-xs">
                <p className="font-semibold mb-2">Debug Info:</p>
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify({
                    url: window.location.href,
                    hash: window.location.hash,
                    search: window.location.search,
                    timestamp: new Date().toISOString()
                  }, null, 2)}
                </pre>
                <Button 
                  onClick={handleManualReset}
                  variant="outline"
                  className="mt-2 w-full"
                >
                  Try Alternative Reset Method
                </Button>
              </div>
            </div>
          ) : submitting ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto animate-pulse" />
              <p className="text-gray-600">Password updated successfully!</p>
              <p className="text-sm text-gray-500">Redirecting...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoFocus
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Password must be at least 6 characters long
              </p>

              <Button
                type="submit"
                disabled={submitting || !password || !confirmPassword}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;