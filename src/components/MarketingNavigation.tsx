import { useState } from 'react'
import { Button } from '@ui/button'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const MarketingNavigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  const handleStartReading = () => {
    setIsMenuOpen(false)
    navigate('/sign-up', { state: { from: location.pathname } })
  }

  const handleLogin = () => {
    setIsMenuOpen(false)
    navigate('/sign-in', { state: { from: location.pathname } })
  }

  return (
    <>
      <nav className="relative mt-1.5 w-full bg-transparent z-50 transition-all duration-300">
        <div className="w-full px-4 sm:px-6 lg:px-10 2xl:px-14">
          <div className="relative flex w-full items-center h-16">
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
                <Link
                  to="/mission"
                  className={`text-slate-600 hover:text-slate-900 transition-all duration-300 hover:scale-105 text-sm font-medium whitespace-nowrap ${
                    location.pathname === '/mission' ? 'text-slate-900 font-semibold' : ''
                  }`}
                >
                  Mission
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-3 md:flex-1 md:justify-end">
              <button
                className="md:hidden transition-transform duration-300 hover:scale-110"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 animate-in slide-in-from-top duration-300">
            <div className="px-4 py-2 space-y-2">
              <a
                href="#how-it-works"
                className="block py-2 text-slate-600 text-sm transition-colors duration-300 hover:text-slate-900"
              >
                How it works
              </a>
              <a
                href="#features"
                className="block py-2 text-slate-600 text-sm transition-colors duration-300 hover:text-slate-900"
              >
                Features
              </a>
              <Link
                to="/mission"
                className={`block py-2 text-slate-600 text-sm transition-colors duration-300 hover:text-slate-900 ${
                  location.pathname === '/mission' ? 'text-slate-900 font-semibold' : ''
                }`}
              >
                Mission
              </Link>
              <div className="pt-2 space-y-2">
                <Button variant="ghost" className="w-full justify-start text-sm" onClick={handleLogin}>
                  Log in
                </Button>
                <Button className="w-full bg-slate-900 text-sm" onClick={handleStartReading}>
                  Sign up <ArrowRight className="ml-1 w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <div className="hidden md:flex fixed top-1.5 right-4 sm:right-6 lg:right-10 2xl:right-14 h-16 items-center gap-3 z-50">
        <Button
          size="sm"
          variant="outline"
          className="text-slate-600 text-sm transition-all duration-300 hover:scale-105 border-slate-300 hover:bg-slate-50"
          onClick={handleLogin}
        >
          Log in
        </Button>
        <Button
          size="sm"
          className="bg-slate-900 hover:bg-slate-800 text-white text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg cta-pulse"
          onClick={handleStartReading}
        >
          Sign up <ArrowRight className="ml-1 w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
        </Button>
      </div>

    </>
  )
}

export default MarketingNavigation
