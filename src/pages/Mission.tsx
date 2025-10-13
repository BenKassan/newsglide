import { ArrowLeft } from 'lucide-react'
import { Button } from '@ui/button'
import { useNavigate } from 'react-router-dom'
import UnifiedNavigation from '@/components/UnifiedNavigation'
import { useState, useEffect } from 'react'

const Mission = () => {
  const navigate = useNavigate()
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])

  // Initialize floating particles
  useEffect(() => {
    const initialParticles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 20,
    }))
    setParticles(initialParticles)
  }, [])

  // Mouse movement for interactive glow
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      setMousePosition({ x: clientX, y: clientY })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Breathing Gradient Background - matching Index page */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 transition-all duration-1000 ease-in-out"
          style={{
            background: `linear-gradient(135deg,
              hsl(212, 42%, 97%) 0%,
              hsl(210, 44%, 95%) 25%,
              hsl(215, 42%, 96%) 50%,
              hsl(213, 43%, 98%) 75%,
              hsl(210, 41%, 98%) 100%)`,
          }}
        />

        {/* Subtle Background Texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.3) 1px, transparent 0)`,
            backgroundSize: "24px 24px",
            animation: "textureShift 60s linear infinite",
          }}
        />
      </div>

      {/* Interactive Mouse Glow */}
      <div
        className="fixed inset-0 pointer-events-none z-1 opacity-0 transition-opacity duration-500 hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.08), rgba(6, 182, 212, 0.05), transparent 60%)`,
        }}
      />

      {/* Floating Light Particles */}
      <div className="fixed inset-0 pointer-events-none z-1">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-1 h-1 bg-blue-300/40 rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animation: `floatUp 25s linear infinite, fadeInOut 25s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <UnifiedNavigation />
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
