import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ui/alert-dialog'
import { Button } from '@ui/button'
import { Checkbox } from '@ui/checkbox'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { useToast } from '@shared/hooks/use-toast'
import { useAuth } from '@features/auth'
import { credentialStorageService } from '@/services/credentialStorageService'
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'

interface PendingCredentials {
  email: string
  password: string
}

const gradientLayers = [
  'bg-gradient-to-br from-[#f5f9ff] via-[#eef5ff] to-[#f7fbff]',
  'bg-gradient-to-tl from-[#dbeafe]/70 via-transparent to-[#c7d2fe]/40',
]

const authPageBackground = 'absolute inset-0 overflow-hidden'

const SignIn = () => {
  const { signIn, resetPassword, user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectPath = useMemo(() => {
    const state = location.state as { from?: string } | null
    if (!state?.from) return '/'
    const disallowed = ['/sign-in', '/sign-up']
    return disallowed.includes(state.from) ? '/' : state.from
  }, [location.state])

  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [rememberMeTouched, setRememberMeTouched] = useState(false)
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false)
  const [savePromptOpen, setSavePromptOpen] = useState(false)
  const [pendingCredentials, setPendingCredentials] = useState<PendingCredentials | null>(null)
  const [showResetForm, setShowResetForm] = useState(false)
  const [signInData, setSignInData] = useState({ email: '', password: '' })
  const [resetEmail, setResetEmail] = useState('')

  // Prefill from saved credentials or navigation state
  useEffect(() => {
    const saved = credentialStorageService.getSavedCredentials()
    if (saved) {
      setSignInData({ email: saved.email, password: saved.password })
      setRememberMe(true)
      setHasSavedCredentials(true)
      setRememberMeTouched(false)
      setResetEmail(saved.email)
      return
    }

    const state = location.state as { email?: string } | null
    if (state?.email) {
      setSignInData((prev) => ({ ...prev, email: state.email }))
      setResetEmail(state.email)
    }
  }, [location.state])

  useEffect(() => {
    if (user) {
      navigate(redirectPath, { replace: true })
    }
  }, [navigate, redirectPath, user])

  const completeSignInSuccess = () => {
    setPendingCredentials(null)
    setSavePromptOpen(false)
    setRememberMeTouched(false)
    setSignInData({ email: '', password: '' })
    navigate(redirectPath, { replace: true })
  }

  const handleRememberPromptAccept = () => {
    if (pendingCredentials) {
      credentialStorageService.saveCredentials(pendingCredentials.email, pendingCredentials.password)
      credentialStorageService.removeDeclinedForEmail(pendingCredentials.email)
      setHasSavedCredentials(true)
      setRememberMe(true)
      toast({
        title: 'Login info saved',
        description: 'We will autofill your email and password next time you sign in on this device.',
        variant: 'success',
      })
    }
    completeSignInSuccess()
  }

  const handleRememberPromptDecline = () => {
    if (pendingCredentials) {
      credentialStorageService.markDeclined(pendingCredentials.email)
    }
    setRememberMe(false)
    setHasSavedCredentials(false)
    completeSignInSuccess()
  }

  const handleClearSavedLogin = () => {
    const saved = credentialStorageService.getSavedCredentials()
    credentialStorageService.clearSavedCredentials()
    if (saved) {
      credentialStorageService.removeDeclinedForEmail(saved.email)
    }
    setSignInData({ email: '', password: '' })
    setRememberMe(false)
    setRememberMeTouched(false)
    setHasSavedCredentials(false)
    toast({
      title: 'Saved login cleared',
      description: 'We removed your saved login info. You can save it again next time you sign in.',
    })
  }

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)

    const credentials = { ...signInData }
    const normalizedEmail = credentials.email.trim().toLowerCase()

    try {
      const { error } = await signIn(credentials.email, credentials.password)

      if (error) {
        toast({
          title: 'Sign in failed',
          description: error.message,
          variant: 'destructive',
        })
        return
      }

      const previouslySaved = credentialStorageService.getSavedCredentials()
      const savedEmailNormalized = previouslySaved?.email.trim().toLowerCase()

      if (rememberMe) {
        credentialStorageService.saveCredentials(credentials.email, credentials.password)
        setHasSavedCredentials(true)
        setRememberMe(true)
        setRememberMeTouched(false)

        if (!previouslySaved || savedEmailNormalized !== normalizedEmail) {
          toast({
            title: 'Login info saved',
            description: 'We will autofill your email and password next time you sign in on this device.',
            variant: 'success',
          })
        }

        completeSignInSuccess()
        return
      }

      if (rememberMeTouched) {
        if (previouslySaved && savedEmailNormalized === normalizedEmail) {
          credentialStorageService.clearSavedCredentials()
          setHasSavedCredentials(false)
        }

        if (credentials.email) {
          credentialStorageService.markDeclined(credentials.email)
        }

        setRememberMe(false)
        setRememberMeTouched(false)
        completeSignInSuccess()
        return
      }

      if (previouslySaved && savedEmailNormalized === normalizedEmail) {
        credentialStorageService.clearSavedCredentials()
        setHasSavedCredentials(false)
      }

      if (credentialStorageService.shouldPromptForEmail(credentials.email)) {
        setPendingCredentials(credentials)
        setSavePromptOpen(true)
        return
      }

      completeSignInSuccess()
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)

    try {
      const { error } = await resetPassword(resetEmail)

      if (error) {
        toast({
          title: 'Reset failed',
          description: error.message,
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Check your email',
        description: "We've sent you a password reset link.",
        duration: 5000,
      })
      setShowResetForm(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950/10">
      <div className={authPageBackground}>
        <div className={`${gradientLayers[0]} absolute inset-0`} />
        <div className={`${gradientLayers[1]} absolute left-1/2 top-0 h-[110%] w-[120%] -translate-x-1/2 blur-3xl`} />
        <div className="absolute -left-32 top-32 h-96 w-96 rounded-full bg-blue-200/50 blur-[120px]" />
        <div className="absolute -right-24 bottom-10 h-[420px] w-[420px] rounded-full bg-cyan-200/40 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_55%),_radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.08),_transparent_55%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <div className="flex w-full items-center justify-center px-6 py-12 sm:px-10 lg:w-1/2">
          <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white/80 p-8 shadow-2xl shadow-blue-100/40 backdrop-blur-xl sm:p-10">
            <Link to="/" className="mb-8 inline-flex items-center gap-3 text-slate-900">
              <img src="/images/newsglide-icon.png" alt="NewsGlide Icon" className="h-9 w-9" />
              <span className="text-xl font-semibold">NewsGlide</span>
            </Link>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Welcome back</h1>
              <p className="text-slate-600">
                Sign in to personalise your feed, queue narrated articles, and glide through the headlines with AI.
              </p>
            </div>

            <div className="mt-8 space-y-6">
              {showResetForm ? (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-sm font-medium text-slate-700">
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-400" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="Enter your email"
                        value={resetEmail}
                        onChange={(event) => setResetEmail(event.target.value)}
                        className="pl-10 pr-3"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-slate-900 text-white transition hover:bg-slate-800"
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Send reset link
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowResetForm(false)}
                      className="flex-1 border-slate-200 text-slate-700 transition hover:bg-slate-50"
                    >
                      Back to sign in
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  {hasSavedCredentials && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-sm text-blue-700">
                      Saved login info detected. We filled in your email and password for a quicker sign in.
                    </div>
                  )}

                  <form onSubmit={handleSignIn} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-sm font-medium text-slate-700">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-400" />
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="Enter your email"
                          value={signInData.email}
                          onChange={(event) =>
                            setSignInData({ ...signInData, email: event.target.value })
                          }
                          className="pl-10 pr-3"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-sm font-medium text-slate-700">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-400" />
                        <Input
                          id="signin-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={signInData.password}
                          onChange={(event) =>
                            setSignInData({ ...signInData, password: event.target.value })
                          }
                          className="pl-10 pr-11"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <label htmlFor="remember-me" className="flex items-center gap-2 text-sm text-slate-600">
                        <Checkbox
                          id="remember-me"
                          checked={rememberMe}
                          onCheckedChange={(checked) => {
                            const value = checked === true
                            setRememberMe(value)
                            setRememberMeTouched(true)
                          }}
                          className="border-slate-300 data-[state=checked]:border-slate-900 data-[state=checked]:bg-slate-900"
                        />
                        Remember this device
                      </label>

                      {hasSavedCredentials && (
                        <button
                          type="button"
                          onClick={handleClearSavedLogin}
                          className="text-left text-sm font-medium text-blue-600 underline transition hover:text-blue-700 sm:text-right"
                        >
                          Forget saved login
                        </button>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-slate-900 py-6 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg disabled:hover:translate-y-0"
                    >
                      {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                      Sign in
                    </Button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setShowResetForm(true)
                          setResetEmail(signInData.email)
                        }}
                        className="text-sm font-medium text-blue-600 underline transition hover:text-blue-700"
                      >
                        Forgot your password?
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>

            <div className="mt-10 text-center text-sm text-slate-600">
              Don't have an account?{' '}
              <Link
                to="/sign-up"
                state={{ from: redirectPath, email: signInData.email }}
                className="font-medium text-blue-600 underline transition hover:text-blue-700"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>

        <div className="relative hidden flex-1 flex-col justify-between overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900/80 to-slate-950" />
          <div className="absolute inset-0 opacity-30">
            <div className="gradient-blob gradient-blob-1 left-[20%] top-[25%]" />
            <div className="gradient-blob gradient-blob-2 right-[15%] bottom-[12%]" />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white">
            <div>
              <p className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm font-medium backdrop-blur-sm">
                Insider Edition
              </p>
              <h2 className="mt-8 text-4xl font-semibold leading-tight">
                Glide through world events with personalised intelligence.
              </h2>
              <p className="mt-4 max-w-md text-slate-200/80">
                NewsGlide blends curated reporting, conversational summaries, and human narration so you can stay current without scrolling endlessly.
              </p>
            </div>

            <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
              <p className="text-lg italic text-white/90">
                “NewsGlide feels like the first news experience built for how I actually think, move, and decide.”
              </p>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg font-semibold uppercase text-white">
                  AJ
                </div>
                <div>
                  <p className="font-medium text-white">Avery Johnson</p>
                  <p className="text-sm text-white/70">Product Lead, Horizon Analytics</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        open={savePromptOpen}
        onOpenChange={(open) => {
          if (!open && pendingCredentials) {
            handleRememberPromptDecline()
          } else {
            setSavePromptOpen(open)
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Save your login info?</AlertDialogTitle>
            <AlertDialogDescription>
              Save your email and password on this device so we can autofill them the next time you sign in. Clearing your browser data will remove the saved information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleRememberPromptDecline}
              className="border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              Not now
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRememberPromptAccept}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              Save login info
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default SignIn
