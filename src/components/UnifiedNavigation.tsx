import { useState, useEffect } from 'react'
import { Button } from '@ui/button'
import { Menu, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, UserMenu, useSavedLoginAutoSignIn } from '@features/auth'

interface UnifiedNavigationProps {
  showAuth?: boolean
  className?: string
}

export default function UnifiedNavigation({ showAuth = true, className = '' }: UnifiedNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  
  const { user, loading: authLoading } = useAuth()
  const { attemptAutoSignIn, isAutoSigningIn } = useSavedLoginAutoSignIn()
  const location = useLocation()
  const navigate = useNavigate()
  const handleSignIn = async () => {
    setIsMenuOpen(false)
    const { success } = await attemptAutoSignIn()

    if (success) {
      navigate('/', { replace: true })
      return
    }

    navigate('/sign-in', { state: { from: location.pathname } })
  }
  const handleSignUp = () => {
    setIsMenuOpen(false)
    navigate('/sign-up', { state: { from: location.pathname } })
  }

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMenuOpen(false)
  }, [location])

  const navLinks = [
    {
      label: 'Home',
      to: { pathname: '/' },
      isActive: () => location.pathname === '/' && !location.hash,
    },
    {
      label: 'Glidey',
      to: { pathname: '/ai-chat' },
      isActive: () => location.pathname === '/ai-chat',
    },
    {
      label: 'Discover',
      to: { pathname: '/discover' },
      isActive: () => location.pathname.startsWith('/discover'),
    },
    ...(!user
      ? [
          {
            label: 'Mission',
            to: { pathname: '/', hash: '#mission' },
            isActive: () => location.pathname === '/' && location.hash === '#mission',
          },
        ]
      : []),
    {
      label: 'History',
      to: { pathname: '/search-history' },
      isActive: () => location.pathname === '/search-history',
    },
  ] as const

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
        <div className="relative">
          <nav
            className={`relative z-20 w-full overflow-hidden transition-all duration-300 ${
              scrolled
                ? 'backdrop-blur-xl shadow-[0_12px_45px_-24px_rgba(15,23,42,0.3)]'
                : 'backdrop-blur-2xl shadow-[0_28px_70px_-40px_rgba(15,23,42,0.35)]'
            }`}
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-b transition-all duration-300 ${
                scrolled
                  ? 'from-white/98 via-white/95 to-white/85 opacity-100'
                  : 'from-white/95 via-white/80 to-transparent opacity-95'
              }`}
            />
            <div className="relative z-10 w-full px-4 sm:px-6 lg:px-10 2xl:px-14">
              <div className="relative flex h-16 items-center justify-between">
                {/* Logo - Fixed Left */}
                <div className="flex items-center space-x-3 group cursor-pointer flex-shrink-0" onClick={() => navigate('/')}>
                  <img
                    src="/lovable-uploads/4aa0d947-eb92-4247-965f-85f5d500d005.png"
                    alt="NewsGlide"
                    className="w-8 h-8 transition-transform duration-300 group-hover:scale-110"
                  />
                  <span className="text-xl font-semibold text-slate-900">NewsGlide</span>
                </div>

                {/* Desktop Navigation - Absolutely Centered */}
                <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="flex items-center space-x-8">
                    {navLinks.map((link) => {
                      const key = typeof link.to === 'string'
                        ? link.to
                        : `${link.to.pathname ?? ''}${link.to.hash ?? ''}`
                      const isActive = link.isActive?.() ?? false

                      return (
                        <Link
                          key={key}
                          to={link.to}
                          className={`text-slate-600 hover:text-slate-900 transition-all duration-300 hover:scale-105 text-sm font-medium whitespace-nowrap ${
                            isActive ? 'text-slate-900 font-semibold' : ''
                          }`}
                        >
                          {link.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>

                {/* Auth Section / Mobile Menu Button - Fixed Right */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Desktop Auth Section */}
                  <div className="hidden md:flex items-center gap-3">
                    {!authLoading && showAuth && (
                      <>
                        {user ? (
                          <>
                            <UserMenu
                              onOpenSavedArticles={() => navigate('/saved-articles')}
                              onOpenHistory={() => navigate('/search-history')}
                            />
                          </>
                        ) : (
                          <>
                            {/* Show sign up/sign in options but don't require them */}
                            <div className="text-sm text-slate-600 bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2">
                              ✨ Unlimited Access
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleSignIn}
                              className="bg-white/60 backdrop-blur-sm hover:bg-sky-50 border-sky-600 text-sky-600 hover:text-sky-700 transition-all duration-300"
                              disabled={isAutoSigningIn}
                            >
                              {isAutoSigningIn ? 'Logging in...' : 'Sign In'}
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSignUp}
                              className="bg-sky-600 hover:bg-sky-700 text-white transition-all duration-300"
                            >
                              Sign Up
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  {/* Mobile Menu Button */}
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors duration-200"
                  >
                    {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
          </nav>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden absolute left-0 right-0 top-full z-30 bg-white/95 backdrop-blur-md border-b border-slate-100/60 shadow-lg">
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => {
                const key = typeof link.to === 'string'
                  ? link.to
                  : `${link.to.pathname ?? ''}${link.to.hash ?? ''}`
                const isActive = link.isActive?.() ?? false

                return (
                <Link
                  key={key}
                  to={link.to}
                  className={`block text-slate-600 hover:text-slate-900 transition-colors duration-200 font-medium ${
                    isActive ? 'text-slate-900 font-semibold' : ''
                  }`}
                >
                  {link.label}
                </Link>
              )})}
              
              {!authLoading && showAuth && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  {user ? (
                    <>
                      <Link
                        to="/saved-articles"
                        className="block text-slate-600 hover:text-slate-900 transition-colors duration-200"
                      >
                        Saved Articles
                      </Link>
                      <Link
                        to="/search-history"
                        className="block text-slate-600 hover:text-slate-900 transition-colors duration-200"
                      >
                        Search History
                      </Link>
                      <Link
                        to="/preferences"
                        className="block text-slate-600 hover:text-slate-900 transition-colors duration-200"
                      >
                        Preferences
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                        ✨ Full access available - Sign up to save articles & history
                      </div>
                      <Button
                        variant="outline"
                        className="w-full border-sky-600 text-sky-600 hover:bg-sky-50 hover:text-sky-700"
                        onClick={handleSignIn}
                        disabled={isAutoSigningIn}
                      >
                        {isAutoSigningIn ? 'Logging in...' : 'Sign In'}
                      </Button>
                      <Button
                        className="w-full bg-sky-600 hover:bg-sky-700 text-white"
                        onClick={handleSignUp}
                      >
                        Sign Up
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </header>

      <div className="h-16 md:h-20 lg:h-24" aria-hidden />
    </>
  )
}
