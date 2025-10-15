import { ArrowLeft } from 'lucide-react'
import { Button } from '@ui/button'
import { useNavigate } from 'react-router-dom'
import AmbientBackground from '@/components/AmbientBackground'
import MarketingNavigation from '@/components/MarketingNavigation'

const Mission = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AmbientBackground />

      <div className="relative z-10">
        <MarketingNavigation />
        {/* Header with back button */}
        <div className="relative pt-20">
          <div className="relative container mx-auto px-6 py-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="glass-card glass-card-hover px-4 py-2 text-slate-700 hover:text-slate-900 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to NewsGlide
            </Button>
          </div>
        </div>

        {/* Mission Content */}
        <div className="relative py-20">
          <div className="relative container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom duration-1000">
                <h1 className="text-5xl font-bold mb-6 relative">
                  <span className="bg-gradient-to-r from-slate-800 via-sky-700 to-slate-800 bg-clip-text text-transparent">
                    Our Mission
                  </span>
                  <div
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 rounded-full opacity-60"
                    style={{
                      width: "0%",
                      animation: "underlineDraw 2s ease-out 0.5s forwards",
                    }}
                  ></div>
                </h1>
              </div>

              <div className="glass-card glass-card-hover rounded-2xl shadow-xl border-slate-200/50 p-12 animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
              <div className="prose prose-lg max-w-none">
                <p className="text-lg leading-relaxed text-slate-700 mb-12">
                  Coming soon...
                </p>

                {/* Team Section */}
                <div className="pt-12 border-t border-slate-200/50">
                  <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Our Team</h2>

                  <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                    {/* Elliot Greenbaum */}
                    <div className="text-center group">
                      <div className="mb-6">
                        <img
                          src="/images/elliot-greenbaum.png"
                          alt="Elliot Greenbaum"
                          className="w-48 h-48 rounded-full mx-auto object-cover object-center border-4 border-slate-200/50 shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl"
                          style={{ objectPosition: 'center center' }}
                        />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">Elliot Greenbaum</h3>
                      <p className="text-sky-600 font-medium">Co-Founder & CEO</p>
                    </div>

                    {/* Ben Kassan */}
                    <div className="text-center group">
                      <div className="mb-6">
                        <div className="w-48 h-48 rounded-full mx-auto bg-gradient-to-br from-blue-100 to-slate-100 border-4 border-slate-200/50 shadow-lg flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                          <span className="text-6xl text-slate-600 font-semibold">BK</span>
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">Ben Kassan</h3>
                      <p className="text-sky-600 font-medium">Co-Founder</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  )
}

export default Mission
