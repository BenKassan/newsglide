import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Users, TrendingUp, Play, Menu, X, Globe, Brain, Filter } from "lucide-react"
import { Link } from "react-router-dom"
import { useNavigate } from "react-router-dom"
import { AuthModal } from "@features/auth"

const rotatingWords = ["intelligent", "interactive", "unbiased", "personalized", "real-time"]

export default function NewsGlideLanding() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [scrollY, setScrollY] = useState(0)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 })
  const [hoveredBlob, setHoveredBlob] = useState<number | null>(null)
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number; timestamp: number }>>([])
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signin')

  const heroRef = useRef<HTMLElement>(null)
  const featuresRef = useRef<HTMLElement>(null)
  const stepsRef = useRef<HTMLElement>(null)
  
  const navigate = useNavigate()

  // Initialize floating particles
  useEffect(() => {
    const initialParticles = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 20,
    }))
    setParticles(initialParticles)
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      setMousePosition({ x: clientX, y: clientY })

      // Calculate parallax offset for subtle blob movement
      const moveX = (clientX - window.innerWidth / 2) * 0.015
      const moveY = (clientY - window.innerHeight / 2) * 0.015
      setParallaxOffset({ x: moveX, y: moveY })
    }

    const handleClick = (e: MouseEvent) => {
      // Create ripple effect on click
      if (heroRef.current && heroRef.current.contains(e.target as Node)) {
        const rect = heroRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const newRipple = {
          id: Date.now(),
          x,
          y,
          timestamp: Date.now(),
        }
        setRipples((prev) => [...prev, newRipple])

        // Remove ripple after animation
        setTimeout(() => {
          setRipples((prev) => prev.filter((ripple) => ripple.id !== newRipple.id))
        }, 3000)
      }
    }

    window.addEventListener("scroll", handleScroll)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("click", handleClick)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("click", handleClick)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length)
        setIsVisible(true)
      }, 200)
    }, 1800)

    return () => clearInterval(interval)
  }, [])

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in")
        }
      })
    }, observerOptions)

    const animatedElements = document.querySelectorAll(".animate-on-scroll")
    animatedElements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  const handleStartReading = () => {
    setAuthModalTab('signup')
    setAuthModalOpen(true)
  }

  const handleLogin = () => {
    setAuthModalTab('signin')
    setAuthModalOpen(true)
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Breathing Gradient Background */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 transition-all duration-1000 ease-in-out"
          style={{
            background: `linear-gradient(135deg, 
              hsl(210, 100%, 97%) 0%, 
              hsl(195, 100%, 95%) 25%, 
              hsl(200, 100%, 96%) 50%, 
              hsl(205, 100%, 97%) 75%, 
              hsl(210, 100%, 98%) 100%)`,
            animation: "gradientBreathe 40s ease-in-out infinite",
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
        className="fixed inset-0 pointer-events-none z-1 opacity-0 transition-opacity duration-500 hero-glow"
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

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-slate-100 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Navigation logo */}
            <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => navigate('/')}>
              <img
                src="/images/newsglide-icon.png"
                alt="NewsGlide"
                className="w-8 h-8 transition-transform duration-300 group-hover:scale-110"
              />
              <span className="text-xl font-semibold text-slate-900">NewsGlide</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#how-it-works"
                className="text-slate-600 hover:text-slate-900 transition-all duration-300 hover:scale-105 text-sm"
              >
                How it works
              </a>
              <a
                href="#features"
                className="text-slate-600 hover:text-slate-900 transition-all duration-300 hover:scale-105 text-sm"
              >
                Features
              </a>
              <Link
                to="/discover"
                className="text-slate-600 hover:text-slate-900 transition-all duration-300 hover:scale-105 text-sm"
              >
                Discover
              </Link>
              <Link
                to="/subscription"
                className="text-slate-600 hover:text-slate-900 transition-all duration-300 hover:scale-105 text-sm"
              >
                Pricing
              </Link>
              <Button 
                variant="ghost" 
                className="text-slate-600 text-sm transition-all duration-300 hover:scale-105"
                onClick={handleLogin}
              >
                Log in
              </Button>
              <Button 
                className="bg-slate-900 hover:bg-slate-800 text-white text-sm transition-all duration-300 hover:scale-105 hover:shadow-lg cta-pulse"
                onClick={handleStartReading}
              >
                Sign up{" "}
                <ArrowRight className="ml-1 w-3 h-3 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden transition-transform duration-300 hover:scale-110"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
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
                to="/discover"
                className="block py-2 text-slate-600 text-sm transition-colors duration-300 hover:text-slate-900"
              >
                Discover
              </Link>
              <Link
                to="/subscription"
                className="block py-2 text-slate-600 text-sm transition-colors duration-300 hover:text-slate-900"
              >
                Pricing
              </Link>
              <div className="pt-2 space-y-2">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-sm"
                  onClick={handleLogin}
                >
                  Log in
                </Button>
                <Button 
                  className="w-full bg-slate-900 text-sm"
                  onClick={handleStartReading}
                >
                  Sign up <ArrowRight className="ml-1 w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section with Enhanced Interactive Gradient Mesh */}
      <section
        ref={heroRef}
        className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative z-10 overflow-hidden min-h-[80vh] hero-section"
      >
        {/* Enhanced Interactive Gradient Mesh Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Interactive Ripples */}
          {ripples.map((ripple) => (
            <div
              key={ripple.id}
              className="absolute pointer-events-none"
              style={{
                left: ripple.x,
                top: ripple.y,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                className="w-4 h-4 rounded-full border-2 border-blue-400/40 animate-ping"
                style={{
                  animationDuration: "3s",
                  animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            </div>
          ))}

          {/* Large Interactive Morphing Gradient Blob 1 */}
          <div
            className="absolute top-20 left-10 w-80 h-80 rounded-full opacity-40 blur-3xl transition-all duration-500 ease-out will-change-transform"
            style={{
              background:
                "radial-gradient(ellipse 120% 80%, rgba(59, 130, 246, 0.5) 0%, rgba(6, 182, 212, 0.3) 50%, transparent 70%)",
              animation: "flowingMorph1 35s ease-in-out infinite, breathe1 12s ease-in-out infinite",
              transform: `translate(${parallaxOffset.x * 0.3}px, ${parallaxOffset.y * 0.3}px) scale(${hoveredBlob === 1 ? 1.03 : 1})`,
              borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
            }}
            onMouseEnter={() => setHoveredBlob(1)}
            onMouseLeave={() => setHoveredBlob(null)}
          ></div>

          {/* Large Interactive Morphing Gradient Blob 2 */}
          <div
            className="absolute top-40 right-20 w-96 h-96 rounded-full opacity-35 blur-3xl transition-all duration-500 ease-out will-change-transform"
            style={{
              background:
                "radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, rgba(14, 165, 233, 0.3) 50%, transparent 70%)",
              animation: "morphing2 40s ease-in-out infinite, breathe2 15s ease-in-out infinite",
              transform: `translate(${parallaxOffset.x * -0.2}px, ${parallaxOffset.y * 0.2}px) scale(${hoveredBlob === 2 ? 1.03 : 1})`,
            }}
            onMouseEnter={() => setHoveredBlob(2)}
            onMouseLeave={() => setHoveredBlob(null)}
          ></div>

          {/* Large Interactive Morphing Gradient Blob 3 */}
          <div
            className="absolute bottom-32 left-1/3 w-72 h-72 rounded-full opacity-45 blur-3xl transition-all duration-500 ease-out will-change-transform"
            style={{
              background:
                "radial-gradient(circle, rgba(37, 99, 235, 0.5) 0%, rgba(59, 130, 246, 0.25) 50%, transparent 70%)",
              animation: "morphing3 30s ease-in-out infinite, breathe3 18s ease-in-out infinite",
              transform: `translate(${parallaxOffset.x * 0.25}px, ${parallaxOffset.y * -0.25}px) scale(${hoveredBlob === 3 ? 1.03 : 1})`,
            }}
            onMouseEnter={() => setHoveredBlob(3)}
            onMouseLeave={() => setHoveredBlob(null)}
          ></div>

          {/* Medium Interactive Morphing Gradient Blob 4 */}
          <div
            className="absolute top-60 left-2/3 w-64 h-64 rounded-full opacity-30 blur-2xl transition-all duration-500 ease-out will-change-transform"
            style={{
              background:
                "radial-gradient(circle, rgba(14, 165, 233, 0.3) 0%, rgba(6, 182, 212, 0.2) 50%, transparent 70%)",
              animation: "morphing4 45s ease-in-out infinite, float1 20s ease-in-out infinite",
              transform: `translate(${parallaxOffset.x * -0.4}px, ${parallaxOffset.y * 0.4}px) scale(${hoveredBlob === 4 ? 1.03 : 1})`,
            }}
            onMouseEnter={() => setHoveredBlob(4)}
            onMouseLeave={() => setHoveredBlob(null)}
          ></div>

          {/* Medium Interactive Morphing Gradient Blob 5 */}
          <div
            className="absolute bottom-20 right-1/4 w-56 h-56 rounded-full opacity-38 blur-2xl transition-all duration-500 ease-out will-change-transform"
            style={{
              background:
                "radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, rgba(37, 99, 235, 0.2) 50%, transparent 70%)",
              animation: "morphing5 38s ease-in-out infinite, float2 25s ease-in-out infinite",
              transform: `translate(${parallaxOffset.x * 0.5}px, ${parallaxOffset.y * -0.15}px) scale(${hoveredBlob === 5 ? 1.03 : 1})`,
            }}
            onMouseEnter={() => setHoveredBlob(5)}
            onMouseLeave={() => setHoveredBlob(null)}
          ></div>

          {/* Smaller accent blobs with enhanced interactivity */}
          <div
            className="absolute top-32 left-1/2 w-40 h-40 rounded-full opacity-25 blur-xl transition-all duration-500 ease-out will-change-transform"
            style={{
              background: "radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, transparent 70%)",
              animation: "float1 22s ease-in-out infinite, pulse1 8s ease-in-out infinite",
              transform: `translate(${parallaxOffset.x * 0.6}px, ${parallaxOffset.y * 0.6}px)`,
            }}
          ></div>

          <div
            className="absolute bottom-40 left-20 w-32 h-32 rounded-full opacity-20 blur-xl transition-all duration-500 ease-out will-change-transform"
            style={{
              background: "radial-gradient(circle, rgba(37, 99, 235, 0.3) 0%, transparent 70%)",
              animation: "float2 28s ease-in-out infinite, pulse2 10s ease-in-out infinite",
              transform: `translate(${parallaxOffset.x * -0.3}px, ${parallaxOffset.y * -0.3}px)`,
            }}
          ></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-20">
          <div
            className="transition-all duration-1000 ease-out"
            style={{
              transform: `translateY(${scrollY * 0.08}px)`,
            }}
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-slate-900 mb-8 leading-tight tracking-tight animate-in fade-in slide-in-from-bottom duration-1000 relative">
              <span className="relative">
                Experience News Like Never Before.
                <div
                  className="absolute -bottom-2 left-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 rounded-full opacity-60"
                  style={{
                    width: "0%",
                    animation: "underlineDraw 2s ease-out 1s forwards",
                  }}
                ></div>
              </span>
            </h1>

            <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
              NewsGlide uses AI to synthesize information from thousands of sources, creating the most interactive and
              unbiased news experience you've ever had.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-in fade-in slide-in-from-bottom duration-1000 delay-400">
              <Button
                size="lg"
                className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 text-base transition-all duration-300 hover:scale-105 hover:shadow-xl group cta-pulse"
                onClick={handleStartReading}
              >
                Start Reading Free
                <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-slate-600 px-8 py-4 text-base transition-all duration-300 hover:scale-105 group"
              >
                <Play className="mr-2 w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                Watch Demo
              </Button>
            </div>

            <p className="text-sm text-slate-500 animate-in fade-in duration-1000 delay-600">No credit card required</p>
          </div>
        </div>
      </section>

      {/* Animated Text Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Our news is{" "}
            <span
              className={`inline-block transition-all duration-200 ${
                isVisible
                  ? "opacity-100 transform translate-y-0 scale-100"
                  : "opacity-0 transform translate-y-1 scale-95"
              }`}
              style={{ minWidth: "200px" }}
            >
              <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent relative">
                {rotatingWords[currentWordIndex]}
                <div
                  className="absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full opacity-60"
                  style={{
                    width: "100%",
                    animation: "flowingUnderline 1.8s ease-in-out infinite",
                  }}
                />
              </span>
            </span>
            .
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Traditional news serves agendas. We serve you the facts, personalized and interactive.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" ref={stepsRef} className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">How it works</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Three simple steps to revolutionize how you consume news
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                icon: Globe,
                title: "Aggregate",
                description:
                  "Our AI scans thousands of sources in real-time, identifying key stories and cross-referencing facts.",
                delay: "delay-100",
              },
              {
                icon: Brain,
                title: "Synthesize",
                description:
                  "Complex stories are broken down into clear, unbiased overviews that highlight what matters most.",
                delay: "delay-200",
              },
              {
                icon: Filter,
                title: "Interact",
                description: "Ask questions, explore connections, and dive deeper into stories that matter to you.",
                delay: "delay-300",
              },
            ].map((step, index) => (
              <div
                key={index}
                className={`text-center animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ${step.delay} group`}
              >
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mx-auto mb-6 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-50">
                  <step.icon className="w-6 h-6 text-slate-700 transition-all duration-300 group-hover:scale-110 group-hover:text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4 transition-colors duration-300 group-hover:text-blue-600">
                  {step.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" ref={featuresRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-white/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="animate-on-scroll opacity-0 translate-x-8 transition-all duration-1000">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">The future of news consumption</h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                While traditional media serves advertisers and agendas, we serve you unbiased, intelligent news that
                adapts to how you think.
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: Shield,
                    title: "Bias-free intelligence",
                    description:
                      "Our AI identifies and neutralizes bias, presenting facts without political or corporate agenda.",
                    delay: "delay-100",
                  },
                  {
                    icon: TrendingUp,
                    title: "Real-time synthesis",
                    description:
                      "Stories update as they develop, with AI continuously refining understanding and context.",
                    delay: "delay-200",
                  },
                  {
                    icon: Users,
                    title: "Interactive experience",
                    description:
                      "Ask questions, explore connections, and customize your news experience like never before.",
                    delay: "delay-300",
                  },
                ].map((feature, index) => (
                  <div
                    key={index}
                    className={`flex items-start space-x-4 animate-on-scroll opacity-0 translate-x-4 transition-all duration-1000 ${feature.delay} group`}
                  >
                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-100">
                      <feature.icon className="w-3 h-3 text-slate-700 transition-colors duration-300 group-hover:text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-2 transition-colors duration-300 group-hover:text-blue-600">
                        {feature.title}
                      </h3>
                      <p className="text-slate-600">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative animate-on-scroll opacity-0 translate-x-8 transition-all duration-1000 delay-200">
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 transition-all duration-500 hover:shadow-xl hover:scale-105 group">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm">Breaking News</span>
                    <span className="bg-slate-900 text-white text-xs px-2 py-1 rounded transition-all duration-300 group-hover:bg-blue-600">
                      Live
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 transition-colors duration-300 group-hover:text-blue-600">
                    Global Climate Summit Reaches Historic Agreement
                  </h3>
                  <p className="text-slate-600 text-sm">
                    AI-synthesized from 247 sources • Bias score: Neutral • Confidence: 94%
                  </p>
                  <div className="flex space-x-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs bg-transparent transition-all duration-300 hover:scale-105"
                    >
                      Ask AI
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs bg-transparent transition-all duration-300 hover:scale-105"
                    >
                      Explore
                    </Button>
                  </div>
                </div>
              </div>

              {/* Floating animation elements */}
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-200 rounded-full animate-pulse opacity-60"></div>
              <div
                className="absolute -bottom-2 -left-2 w-3 h-3 bg-cyan-200 rounded-full animate-pulse opacity-40"
                style={{ animationDelay: "1s" }}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Elements Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-6xl mx-auto text-center relative z-10 animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">Join the news revolution</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
            Thousands of readers have already discovered a better way to stay informed
          </p>
          <Button
            size="lg"
            className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 transition-all duration-300 hover:scale-105 hover:shadow-xl group cta-pulse"
            onClick={handleStartReading}
          >
            Start Reading Free
            <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
        </div>

        {/* Enhanced Floating Elements */}
        <div className="absolute inset-0 pointer-events-none">
          {[
            { size: "w-2 h-2", color: "bg-blue-200", position: "top-20 left-10", delay: "0s" },
            { size: "w-3 h-3", color: "bg-cyan-200", position: "top-40 right-20", delay: "1s" },
            { size: "w-2 h-2", color: "bg-sky-200", position: "bottom-32 left-20", delay: "2s" },
            { size: "w-1 h-1", color: "bg-blue-300", position: "bottom-20 right-10", delay: "0.5s" },
            { size: "w-2 h-2", color: "bg-cyan-300", position: "top-60 left-1/2", delay: "1.5s" },
            { size: "w-1 h-1", color: "bg-sky-300", position: "top-32 left-1/3", delay: "2.5s" },
            { size: "w-2 h-2", color: "bg-blue-400", position: "bottom-40 right-1/3", delay: "3s" },
          ].map((dot, index) => (
            <div
              key={index}
              className={`absolute ${dot.size} ${dot.color} rounded-full animate-pulse opacity-60 transition-all duration-1000 hover:scale-150 ${dot.position}`}
              style={{
                animationDelay: dot.delay,
                animationDuration: "3s",
              }}
            />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900 animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Ready to upgrade your news?</h2>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
            Join thousands who've already left traditional news behind for something better.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-4 transition-all duration-300 hover:scale-105 hover:shadow-xl group"
              onClick={handleStartReading}
            >
              Start Reading Free
              <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-600 text-white hover:bg-slate-800 px-8 py-4 bg-transparent transition-all duration-300 hover:scale-105"
            >
              Schedule Demo
            </Button>
          </div>
          <p className="text-slate-400 text-sm mt-4">No credit card required • 14-day free trial</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="animate-on-scroll opacity-0 translate-y-4 transition-all duration-1000">
              {/* Footer logo */}
              <div className="flex items-center space-x-3 mb-4 group cursor-pointer" onClick={() => navigate('/')}>
                <img
                  src="/images/newsglide-icon.png"
                  alt="NewsGlide"
                  className="w-7 h-7 transition-transform duration-300 group-hover:scale-110"
                />
                <span className="font-semibold text-slate-900">NewsGlide</span>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed">
                Revolutionizing news consumption with AI-powered synthesis and interactive experiences.
              </p>
            </div>

            {[
              { title: "Product", links: ["Features", "Pricing", "API", "Enterprise"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Press"] },
              { title: "Support", links: ["Help Center", "Contact", "Privacy", "Terms"] },
            ].map((section, index) => (
              <div
                key={index}
                className={`animate-on-scroll opacity-0 translate-y-4 transition-all duration-1000 delay-${(index + 1) * 100}`}
              >
                <h3 className="font-semibold text-slate-900 mb-4 text-sm">{section.title}</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  {section.links.map((link, linkIndex) => (
                    <li key={linkIndex}>
                      <Link 
                        to={`/${link.toLowerCase().replace(' ', '-')}`} 
                        className="hover:text-slate-900 transition-all duration-300 hover:translate-x-1 inline-block"
                      >
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-8 flex flex-col sm:flex-row justify-between items-center animate-on-scroll opacity-0 translate-y-4 transition-all duration-1000 delay-400">
            <p className="text-slate-500 text-sm">© 2024 NewsGlide. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 sm:mt-0">
              {["Twitter", "LinkedIn", "GitHub"].map((social, index) => (
                <a
                  key={index}
                  href="#"
                  className="text-slate-500 hover:text-slate-900 transition-all duration-300 text-sm hover:scale-110"
                >
                  {social}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Enhanced Premium Animations CSS */}
      <style>{`
        .animate-in {
          opacity: 1 !important;
          transform: translateY(0) translateX(0) !important;
        }
        
        /* Hero section glow activation */
        .hero-section:hover .hero-glow {
          opacity: 1;
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-in-from-bottom {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slide-in-from-top {
          from { 
            opacity: 0;
            transform: translateY(-10px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Breathing Gradient Background */
        @keyframes gradientBreathe {
          0%, 100% { 
            filter: hue-rotate(0deg) brightness(1) saturate(1);
          }
          25% { 
            filter: hue-rotate(2deg) brightness(1.02) saturate(1.05);
          }
          50% { 
            filter: hue-rotate(-1deg) brightness(0.98) saturate(0.95);
          }
          75% { 
            filter: hue-rotate(1deg) brightness(1.01) saturate(1.02);
          }
        }

        /* Subtle Background Texture */
        @keyframes textureShift {
          0% { transform: translate(0, 0); }
          100% { transform: translate(24px, 24px); }
        }

        /* Floating Light Particles */
        @keyframes floatUp {
          0% { 
            transform: translateY(100vh) translateX(0px);
            opacity: 0;
          }
          10% {
            opacity: 0.4;
          }
          90% {
            opacity: 0.4;
          }
          100% { 
            transform: translateY(-100px) translateX(20px);
            opacity: 0;
          }
        }

        @keyframes fadeInOut {
          0%, 100% { opacity: 0; }
          10%, 90% { opacity: 0.15; }
          50% { opacity: 0.4; }
        }

        /* Headline Underline Draw */
        @keyframes underlineDraw {
          from { width: 0%; }
          to { width: 100%; }
        }

        /* CTA Button Pulse */
        .cta-pulse {
          animation: ctaPulse 4s ease-in-out infinite;
        }

        @keyframes ctaPulse {
          0%, 100% { 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          50% { 
            box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.2), 0 4px 6px -2px rgba(59, 130, 246, 0.1);
          }
        }

        /* Enhanced Interactive Gradient Mesh Animations - More Subtle */
        @keyframes morphing1 {
          0%, 100% { 
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          33% { 
            transform: translate(15px, -15px) scale(1.02) rotate(60deg);
          }
          66% { 
            transform: translate(-10px, 10px) scale(0.98) rotate(120deg);
          }
        }

        @keyframes morphing2 {
          0%, 100% { 
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          25% { 
            transform: translate(-20px, 15px) scale(1.03) rotate(45deg);
          }
          50% { 
            transform: translate(10px, -20px) scale(0.97) rotate(90deg);
          }
          75% { 
            transform: translate(20px, 10px) scale(1.01) rotate(135deg);
          }
        }

        @keyframes morphing3 {
          0%, 100% { 
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          40% { 
            transform: translate(12px, 18px) scale(1.02) rotate(72deg);
          }
          80% { 
            transform: translate(-18px, -12px) scale(0.98) rotate(144deg);
          }
        }

        @keyframes morphing4 {
          0%, 100% { 
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          30% { 
            transform: translate(-12px, -18px) scale(1.01) rotate(54deg);
          }
          60% { 
            transform: translate(18px, 8px) scale(0.99) rotate(108deg);
          }
        }

        @keyframes morphing5 {
          0%, 100% { 
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          50% { 
            transform: translate(-8px, 12px) scale(1.01) rotate(90deg);
          }
        }

        /* Subtle breathing animations for organic feel */
        @keyframes breathe1 {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.5; }
        }

        @keyframes breathe2 {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.45; }
        }

        @keyframes breathe3 {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.55; }
        }

        /* Enhanced floating animations - More subtle */
        @keyframes float1 {
          0%, 100% { 
            transform: translateY(0px) translateX(0px);
          }
          33% {
            transform: translateY(-8px) translateX(4px);
          }
          66% {
            transform: translateY(5px) translateX(-6px);
          }
        }

        @keyframes float2 {
          0%, 100% { 
            transform: translateY(0px) translateX(0px);
          }
          50% { 
            transform: translateY(6px) translateX(-4px);
          }
        }

        /* Subtle pulsing for accent elements */
        @keyframes pulse1 {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.35; }
        }

        @keyframes pulse2 {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.3; }
        }

        /* Smooth transitions for all animations */
        * {
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }

        .will-change-transform {
          will-change: transform, opacity;
        }

        /* Flowing animations inspired by the logo */
        @keyframes flowingMorph1 {
          0%, 100% { 
            transform: translate(0, 0) scale(1);
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
          }
          33% { 
            transform: translate(15px, -15px) scale(1.02);
            border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
          }
          66% { 
            transform: translate(-10px, 10px) scale(0.98);
            border-radius: 70% 30% 40% 60% / 40% 70% 60% 30%;
          }
        }

        @keyframes flowingMorph2 {
          0%, 100% { 
            transform: translate(0, 0) scale(1);
            border-radius: 40% 60% 60% 40% / 70% 30% 70% 30%;
          }
          25% { 
            transform: translate(-20px, 15px) scale(1.03);
            border-radius: 60% 40% 30% 70% / 40% 60% 40% 60%;
          }
          50% { 
            transform: translate(10px, -20px) scale(0.97);
            border-radius: 30% 70% 60% 40% / 60% 40% 30% 70%;
          }
          75% { 
            transform: translate(20px, 10px) scale(1.01);
            border-radius: 70% 30% 40% 60% / 30% 70% 60% 40%;
          }
        }

        @keyframes flowingUnderline {
          0%, 100% { 
            transform: scaleX(1) skewX(0deg);
            border-radius: 50%;
          }
          50% { 
            transform: scaleX(1.1) skewX(2deg);
            border-radius: 30% 70%;
          }
        }
      `}</style>
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </div>
  )
}