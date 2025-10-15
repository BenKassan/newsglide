import { useEffect, useState } from 'react'
import { Button } from '@ui/button'
import { ArrowRight, Menu, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSavedLoginAutoSignIn } from '@features/auth'

const MarketingNavigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  const { attemptAutoSignIn, isAutoSigningIn } = useSavedLoginAutoSignIn()

  const handleStartReading = () => {
    setIsMenuOpen(false)
    navigate('/sign-up', { state: { from: location.pathname } })
  }

  const handleLogin = async () => {
    setIsMenuOpen(false)
    const { success } = await attemptAutoSignIn()

    if (success) {
      navigate('/', { replace: true })
      return
    }

    navigate('/sign-in', { state: { from: location.pathname } })
  }

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="relative">
          <nav
            className={`relative z-20 w-full transition-all duration-300 ${
              scrolled
                ? 'bg-white/90 shadow-lg border border-white/60 backdrop-blur-xl'
                : 'bg-white/60 border border-white/40 backdrop-blur-md'
            }`}
          >
            <div className="w-full px-4 sm:px-6 lg:px-10 2xl:px-14">
              <div className="flex w-full items-center h-16">
                <div
                  className="flex items-center space-x-3 group cursor-pointer flex-shrink-0 md:flex-1"
                  onClick={() => navigate('/')}
                >
                  <img
                    src="/images/newsglide-icon.png"
                    alt="NewsGlide"
                    className="w-8 h-8 transition-transform duration-300 group-hover:scale-110"
                  />
                  <span className="text-xl font-semibold text-slate-900">NewsGlide</span>
                </div>

                <div className="hidden md:flex md:flex-1 md:justify-center">
                  <div className="flex items-center space-x-8">
                    <a
                      href="#how-it-works"
                      className="text-slate-600 hover:text-slate-900 transition-all duration-300 hover:scale-105 text-sm font-medium whitespace-nowrap"
                    >
                      How it works
                    </a>
                    <a
                      href="#features"
                      className="text-slate-600 hover:text-slate-900 transition-all duration-300 hover:scale-105 text-sm font-medium whitespace-nowrap"
                    >
                      Features
                    </a>
                    <a
                      href="#mission"
                      className="text-slate-600 hover:text-slate-900 transition-all duration-300 hover:scale-105 text-sm font-medium whitespace-nowrap"
                    >
                      Mission
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 md:flex-1 md:justify-end">
                  <div className="hidden md:flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-slate-600 text-sm transition-all duration-300 hover:scale-105 border-slate-300 hover:bg-slate-50"
                      onClick={handleLogin}
                      disabled={isAutoSigningIn}
                    >
                      {isAutoSigningIn ? 'Logging in...' : 'Log in'}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-slate-900 hover:bg-slate-800 text-white text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg cta-pulse"
                      onClick={handleStartReading}
                    >
                      Sign up <ArrowRight className="ml-1 w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
                    </Button>
                  </div>
                  <button
                    className="md:hidden transition-transform duration-300 hover:scale-110"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                  >
                    {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </nav>

          {isMenuOpen && (
            <div className="md:hidden absolute left-0 right-0 top-full z-30 bg-white/95 border-b border-slate-100/60 shadow-lg backdrop-blur-md animate-in slide-in-from-top duration-300">
              <div className="px-4 py-4 space-y-3">
                <a
                  href="#how-it-works"
                  className="block py-2 text-slate-600 text-sm transition-colors duration-300 hover:text-slate-900"
                  onClick={() => setIsMenuOpen(false)}
                >
                  How it works
                </a>
                <a
                  href="#features"
                  className="block py-2 text-slate-600 text-sm transition-colors duration-300 hover:text-slate-900"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Features
                </a>
                <a
                  href="#mission"
                  className="block py-2 text-slate-600 text-sm transition-colors duration-300 hover:text-slate-900"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Mission
                </a>
                <div className="pt-2 space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm"
                    onClick={handleLogin}
                    disabled={isAutoSigningIn}
                  >
                    {isAutoSigningIn ? 'Logging in...' : 'Log in'}
                  </Button>
                  <Button className="w-full bg-slate-900 text-sm" onClick={handleStartReading}>
                    Sign up <ArrowRight className="ml-1 w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-full z-10 h-20 bg-gradient-to-b from-white/95 via-white/60 to-transparent" />
        </div>
      </header>

      <div className="h-16 md:h-20 lg:h-24" aria-hidden />
    </>
  )
}

export default MarketingNavigation
