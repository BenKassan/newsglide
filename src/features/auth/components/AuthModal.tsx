import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { useAuth } from '../AuthContext'
import { useToast } from '@shared/hooks/use-toast'
import { Loader2, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTab?: 'signin' | 'signup'
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultTab = 'signin' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { signIn, signUp, resetPassword } = useAuth()
  const { toast } = useToast()

  // Sign In Form State
  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
  })

  // Sign Up Form State
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    fullName: '',
    confirmPassword: '',
  })

  // Reset Password State
  const [resetEmail, setResetEmail] = useState('')
  const [showResetForm, setShowResetForm] = useState(false)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await signIn(signInData.email, signInData.password)

    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      onClose()
      setSignInData({ email: '', password: '' })
    }

    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (signUpData.password !== signUpData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: 'Please make sure your passwords match.',
        variant: 'destructive',
      })
      return
    }

    if (signUpData.password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    const { error } = await signUp(signUpData.email, signUpData.password, signUpData.fullName)

    if (error) {
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Check your email',
        description: "We've sent you a confirmation link to complete your registration.",
        duration: 6000,
      })
      onClose()
      setSignUpData({ email: '', password: '', fullName: '', confirmPassword: '' })
    }

    setLoading(false)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await resetPassword(resetEmail)

    if (error) {
      toast({
        title: 'Reset failed',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Check your email',
        description: "We've sent you a password reset link.",
        duration: 5000,
      })
      setShowResetForm(false)
      setResetEmail('')
    }

    setLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-0 shadow-2xl overflow-visible bg-gradient-to-br from-white via-blue-50/30 to-white">
        <DialogHeader>
            <DialogTitle className="text-center text-3xl font-bold text-slate-900 mb-2">
              {showResetForm ? 'Reset Password' : 'Welcome to NewsGlide'}
            </DialogTitle>
            <DialogDescription className="text-center text-slate-600 text-sm">
              {showResetForm
                ? 'Enter your email to receive a password reset link'
                : 'Join thousands experiencing news like never before'}
            </DialogDescription>
          </DialogHeader>

        {showResetForm ? (
          <form onSubmit={handleResetPassword} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-slate-700 font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white/50 transition-all duration-300"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowResetForm(false)}
                className="flex-1 border-slate-300 hover:bg-slate-50 transition-all duration-300"
              >
                Back
              </Button>
            </div>
          </form>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'signin' | 'signup')}
            className="mt-6"
          >
            <TabsList className="grid w-full grid-cols-2 bg-slate-100/80 p-1 rounded-lg">
              <TabsTrigger
                value="signin"
                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all duration-300"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all duration-300"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-6">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-slate-700 font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white/50 transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-slate-700 font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      className="pl-10 pr-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white/50 transition-all duration-300"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-6 text-base font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg mt-6"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowResetForm(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 underline transition-colors"
                  >
                    Forgot your password?
                  </button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-slate-700 font-medium">
                    Full Name (Optional)
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={signUpData.fullName}
                      onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                      className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white/50 transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-slate-700 font-medium">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white/50 transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-slate-700 font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password (min. 6 chars)"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      className="pl-10 pr-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white/50 transition-all duration-300"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm" className="text-slate-700 font-medium">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      id="signup-confirm"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={signUpData.confirmPassword}
                      onChange={(e) =>
                        setSignUpData({ ...signUpData, confirmPassword: e.target.value })
                      }
                      className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 bg-white/50 transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-6 text-base font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg mt-6"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign Up
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
