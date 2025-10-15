import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { useToast } from '@shared/hooks/use-toast'
import { useAuth } from '@features/auth'
import { Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react'

const SignUp = () => {
  const { signUp, user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const redirectPath = (() => {
    const state = location.state as { from?: string } | null
    if (!state?.from) return '/'
    const disallowed = ['/sign-in', '/sign-up']
    return disallowed.includes(state.from) ? '/' : state.from
  })()

  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (user) {
      navigate(redirectPath, { replace: true })
    }
  }, [navigate, redirectPath, user])

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault()

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

    try {
      const { error } = await signUp(signUpData.email, signUpData.password, signUpData.fullName)

      if (error) {
        toast({
          title: 'Sign up failed',
          description: error.message,
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Check your email',
        description: "We've sent you a confirmation link to complete your registration.",
        duration: 6000,
      })

      navigate('/sign-in', {
        replace: true,
        state: { email: signUpData.email, from: redirectPath },
      })
      setSignUpData({ fullName: '', email: '', password: '', confirmPassword: '' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950/10">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f6faff] via-[#eef4ff] to-[#f7fbff]" />
        <div className="absolute left-1/2 top-0 h-[110%] w-[120%] -translate-x-1/2 bg-gradient-to-tr from-[#c7d2fe]/40 via-transparent to-[#dbeafe]/70 blur-3xl" />
        <div className="absolute -left-28 bottom-10 h-[420px] w-[420px] rounded-full bg-sky-200/40 blur-[140px]" />
        <div className="absolute -right-36 top-20 h-[340px] w-[340px] rounded-full bg-indigo-200/40 blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(79,70,229,0.12),_transparent_55%),_radial-gradient(circle_at_top_right,_rgba(14,165,233,0.1),_transparent_55%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <div className="flex w-full items-center justify-center px-6 py-12 sm:px-10 lg:w-1/2">
          <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white/80 p-8 shadow-2xl shadow-blue-100/40 backdrop-blur-xl sm:p-10">
            <Link to="/" className="mb-8 inline-flex items-center gap-3 text-slate-900">
              <img src="/images/newsglide-icon.png" alt="NewsGlide Icon" className="h-9 w-9" />
              <span className="text-xl font-semibold">NewsGlide</span>
            </Link>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Create your account</h1>
              <p className="text-slate-600">
                Unlock a personalised news experience with narrated briefings, smart summaries, and AI guidance tailored to you.
              </p>
            </div>

            <form onSubmit={handleSignUp} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-sm font-medium text-slate-700">
                  Full name (optional)
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-400" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="How should we greet you?"
                    value={signUpData.fullName}
                    onChange={(event) =>
                      setSignUpData({ ...signUpData, fullName: event.target.value })
                    }
                    className="pl-10 pr-3"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-sm font-medium text-slate-700">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-400" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@company.com"
                    value={signUpData.email}
                    onChange={(event) =>
                      setSignUpData({ ...signUpData, email: event.target.value })
                    }
                    className="pl-10 pr-3"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-400" />
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    value={signUpData.password}
                    onChange={(event) =>
                      setSignUpData({ ...signUpData, password: event.target.value })
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

              <div className="space-y-2">
                <Label htmlFor="signup-confirm" className="text-sm font-medium text-slate-700">
                  Confirm password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-slate-400" />
                  <Input
                    id="signup-confirm"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={signUpData.confirmPassword}
                    onChange={(event) =>
                      setSignUpData({ ...signUpData, confirmPassword: event.target.value })
                    }
                    className="pl-10 pr-3"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 py-6 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg disabled:hover:translate-y-0"
              >
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Create account
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-600">
              Already registered?{' '}
              <Link
                to="/sign-in"
                state={{ from: redirectPath, email: signUpData.email }}
                className="font-medium text-blue-600 underline transition hover:text-blue-700"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="relative hidden flex-1 flex-col justify-between overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-900/80" />
          <div className="absolute inset-0 opacity-40">
            <div className="gradient-blob gradient-blob-1 left-[20%] top-[20%]" />
            <div className="gradient-blob gradient-blob-2 right-[10%] bottom-[15%]" />
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white">
            <div>
              <p className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm font-medium backdrop-blur-sm">
                Built for momentum
              </p>
              <h2 className="mt-8 text-4xl font-semibold leading-tight">
                Experience a newsroom that thinks as fast as you do.
              </h2>
              <div className="mt-6 grid gap-4 text-white/90">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                  <p className="text-sm uppercase tracking-wide text-white/70">Adaptive Reading Flow</p>
                  <p className="mt-2 text-base">
                    Topic playlists, narrated recaps, and AI guidance keep your attention where it matters.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                  <p className="text-sm uppercase tracking-wide text-white/70">Human + AI Harmony</p>
                  <p className="mt-2 text-base">
                    Blend editorial signals, debate-style summaries, and on-demand voices for deeper context.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md">
              <p className="text-lg italic text-white/90">
                “Within a week, our team stopped doomscrolling and started briefing with purpose.”
              </p>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg font-semibold uppercase text-white">
                  KP
                </div>
                <div>
                  <p className="font-medium text-white">Kai Patel</p>
                  <p className="text-sm text-white/70">Strategy Director, Lumen Collective</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignUp
