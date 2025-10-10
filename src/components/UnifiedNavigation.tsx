import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth, AuthModal, UserMenu } from '@features/auth'

interface UnifiedNavigationProps {
  showAuth?: boolean
  className?: string
}

export default function UnifiedNavigation({ showAuth = true, className = '' }: UnifiedNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin')
  const [scrolled, setScrolled] = useState(false)
  
  const { user, loading: authLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

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
      { href: '/', label: 'Home' },
      { href: '/ai-chat', label: 'AI Assistant' },
      { href: '/discover', label: 'Discover' },
    ];

  return (
    <>
      <nav className={`fixed top-0 w-full bg-transparent z-50 transition-all duration-300 ${scrolled ? 'bg-white/60 backdrop-blur-md shadow-sm' : ''} ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 sm:pr-8">
          <div className="relative flex justify-between items-center h-16">
            {/* Logo - Left Side */}
            <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => navigate('/')}>
              <img
                src="/lovable-uploads/4aa0d947-eb92-4247-965f-85f5d500d005.png"
                alt="NewsGlide"
                className="w-8 h-8 transition-transform duration-300 group-hover:scale-110"
              />
              <span className="text-xl font-semibold text-slate-900">NewsGlide</span>
            </div>

            {/* Desktop Navigation - Absolutely Centered */}
            <div className="hidden md:flex items-center space-x-8 absolute left-1/2 -translate-x-1/2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`text-slate-600 hover:text-slate-900 transition-all duration-300 hover:scale-105 text-sm font-medium ${
                    location.pathname === link.href ? 'text-slate-900' : ''
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Auth Section / Mobile Menu Button - Right Side */}
            <div className="flex items-center gap-3">
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
                          onClick={() => {
                            setAuthModalTab('signin')
                            setAuthModalOpen(true)
                          }}
                          className="bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-all duration-300"
                        >
                          Sign In
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setAuthModalTab('signup')
                            setAuthModalOpen(true)
                          }}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all duration-300"
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

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-slate-100/50 shadow-lg">
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`block text-slate-600 hover:text-slate-900 transition-colors duration-200 font-medium ${
                    location.pathname === link.href ? 'text-slate-900' : ''
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              
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
                        className="w-full"
                        onClick={() => {
                          setAuthModalTab('signin')
                          setAuthModalOpen(true)
                        }}
                      >
                        Sign In
                      </Button>
                      <Button
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                        onClick={() => {
                          setAuthModalTab('signup')
                          setAuthModalOpen(true)
                        }}
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
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </>
  )
}