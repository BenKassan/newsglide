import { useState, useEffect, useRef } from "react"
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@ui/button'
import {
  ArrowRight,
  Globe,
  Brain,
  MessageCircle,
  Linkedin,
  Instagram,
  Compass,
  Sparkles,
  SlidersHorizontal,
  FileText,
  Volume2,
} from "lucide-react"
import MarketingNavigation from "./MarketingNavigation"
import { useSavedLoginAutoSignIn } from '@features/auth'

const rotatingWords = ["active", "personalized", "voice-ready", "debate-driven", "curiosity-led"]
const heroHighlights = [
  "Explore & Discover anything in seconds",
  "Chat with Glidey while you read",
  "Morgan Freeman narrates on demand",
]

export default function NewsGlideLanding() {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [scrollY, setScrollY] = useState(0)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 })
  const [hoveredBlob, setHoveredBlob] = useState<number | null>(null)
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])
  const { attemptAutoSignIn } = useSavedLoginAutoSignIn()

  const heroRef = useRef<HTMLElement>(null)
  const featuresRef = useRef<HTMLElement>(null)
  const stepsRef = useRef<HTMLElement>(null)
  const missionRef = useRef<HTMLElement>(null)
  
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

    window.addEventListener("scroll", handleScroll)
    window.addEventListener("mousemove", handleMouseMove)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("mousemove", handleMouseMove)
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

  // Support deep links to landing page sections
  useEffect(() => {
    if (!location.hash) {
      return
    }

    const sectionId = location.hash.replace('#', '')
    const section = document.getElementById(sectionId)

    if (!section) {
      return
    }

    const scrollToSection = () => section.scrollIntoView({ behavior: 'smooth' })

    // Wait for layout to settle when navigating between routes
    requestAnimationFrame(() => {
      scrollToSection()
    })
  }, [location])
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
    navigate('/sign-up', { state: { from: location.pathname } })
  }

  const handleLogin = async () => {
    const { success } = await attemptAutoSignIn()

    if (success) {
      navigate('/', { replace: true })
      return
    }

    navigate('/sign-in', { state: { from: location.pathname } })
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Enhanced Breathing Gradient Background */}
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

      <MarketingNavigation />

      {/* Main Content Wrapper */}
      <div className="flex-grow">
      {/* Hero Section with Enhanced Interactive Gradient Mesh */}
      <section
        ref={heroRef}
        className="pt-28 sm:pt-32 lg:pt-36 pb-24 px-4 sm:px-6 lg:px-8 relative z-10 overflow-hidden min-h-[90vh] flex items-center justify-center hero-section"
      >
        {/* Enhanced Interactive Gradient Mesh Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Large Interactive Morphing Gradient Blob 1 */}
          <div
            className="absolute top-20 left-10 w-80 h-80 rounded-full opacity-45 blur-3xl transition-all duration-500 ease-out will-change-transform"
            style={{
              background:
                "radial-gradient(ellipse 120% 80%, rgba(59, 130, 246, 0.5) 0%, rgba(6, 182, 212, 0.3) 50%, transparent 70%)",
              transform: `translate(${parallaxOffset.x * 0.3}px, ${parallaxOffset.y * 0.3}px) scale(${hoveredBlob === 1 ? 1.03 : 1})`,
              borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
            }}
            onMouseEnter={() => setHoveredBlob(1)}
            onMouseLeave={() => setHoveredBlob(null)}
          ></div>

          {/* Large Interactive Morphing Gradient Blob 2 */}
          <div
            className="absolute top-40 right-20 w-96 h-96 rounded-full opacity-40 blur-3xl transition-all duration-500 ease-out will-change-transform"
            style={{
              background:
                "radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, rgba(14, 165, 233, 0.3) 50%, transparent 70%)",
              transform: `translate(${parallaxOffset.x * -0.2}px, ${parallaxOffset.y * 0.2}px) scale(${hoveredBlob === 2 ? 1.03 : 1})`,
            }}
            onMouseEnter={() => setHoveredBlob(2)}
            onMouseLeave={() => setHoveredBlob(null)}
          ></div>

          {/* Large Interactive Morphing Gradient Blob 3 */}
          <div
            className="absolute bottom-32 left-1/3 w-72 h-72 rounded-full opacity-50 blur-3xl transition-all duration-500 ease-out will-change-transform"
            style={{
              background:
                "radial-gradient(circle, rgba(37, 99, 235, 0.5) 0%, rgba(59, 130, 246, 0.25) 50%, transparent 70%)",
              transform: `translate(${parallaxOffset.x * 0.25}px, ${parallaxOffset.y * -0.25}px) scale(${hoveredBlob === 3 ? 1.03 : 1})`,
            }}
            onMouseEnter={() => setHoveredBlob(3)}
            onMouseLeave={() => setHoveredBlob(null)}
          ></div>

          {/* Medium Interactive Morphing Gradient Blob 4 */}
          <div
            className="absolute top-60 left-2/3 w-64 h-64 rounded-full opacity-35 blur-2xl transition-all duration-500 ease-out will-change-transform"
            style={{
              background:
                "radial-gradient(circle, rgba(14, 165, 233, 0.3) 0%, rgba(6, 182, 212, 0.2) 50%, transparent 70%)",
              transform: `translate(${parallaxOffset.x * -0.4}px, ${parallaxOffset.y * 0.4}px) scale(${hoveredBlob === 4 ? 1.03 : 1})`,
            }}
            onMouseEnter={() => setHoveredBlob(4)}
            onMouseLeave={() => setHoveredBlob(null)}
          ></div>

          {/* Medium Interactive Morphing Gradient Blob 5 */}
          <div
            className="absolute bottom-20 right-1/4 w-56 h-56 rounded-full opacity-43 blur-2xl transition-all duration-500 ease-out will-change-transform"
            style={{
              background:
                "radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, rgba(37, 99, 235, 0.2) 50%, transparent 70%)",
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
              transform: `translate(${parallaxOffset.x * 0.6}px, ${parallaxOffset.y * 0.6}px)`,
            }}
          ></div>

          <div
            className="absolute bottom-40 left-20 w-32 h-32 rounded-full opacity-20 blur-xl transition-all duration-500 ease-out will-change-transform"
            style={{
              background: "radial-gradient(circle, rgba(37, 99, 235, 0.3) 0%, transparent 70%)",
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
                Turn Passive Scrolling Into Active Discovery.
                <div
                  className="absolute -bottom-2 left-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 rounded-full opacity-60"
                  style={{
                    width: "0%",
                    animation: "underlineDraw 2s ease-out 1s forwards",
                  }}
                ></div>
              </span>
            </h1>

            <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom duration-1000 delay-200">
              NewsGlide hands you the controls to explore any topic, converse with Glidey, and shape every story around how you think.
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-12 animate-in fade-in slide-in-from-bottom duration-1000 delay-300">
              {heroHighlights.map((highlight) => (
                <span
                  key={highlight}
                  className="px-4 py-2 rounded-full bg-white/80 text-sm font-medium text-slate-600 border border-slate-200/70 shadow-sm backdrop-blur"
                >
                  {highlight}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16 animate-in fade-in slide-in-from-bottom duration-1000 delay-400">
              <Button
                size="lg"
                className="bg-slate-900 hover:bg-slate-800 text-white px-12 py-6 text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl group cta-pulse"
                onClick={handleStartReading}
              >
                Glide With Us
                <ArrowRight className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-50 px-12 py-6 text-lg font-semibold transition-all duration-300 hover:scale-105"
                onClick={() => {
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Learn More
              </Button>
            </div>

            <p className="text-sm text-slate-500 animate-in fade-in duration-1000 delay-600">
              No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Animated Text Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Your news becomes{" "}
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
            Instead of scrolling what the feed decides, NewsGlide learns your curiosity, adapts with every interaction, and keeps you in the driver's seat.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" ref={stepsRef} className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">How it works</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Three simple flows that turn your curiosity into clarity
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                icon: Compass,
                title: "Discover without limits",
                description:
                  "Dive into Explore & Discover to surface any topic, angle, or what-if across a universe of sources.",
                delay: "delay-100",
              },
              {
                icon: MessageCircle,
                title: "Dialogue with Glidey",
                description:
                  "Ask Glidey follow-up questions, request part twos, and keep the conversation going while you read.",
                delay: "delay-200",
              },
              {
                icon: SlidersHorizontal,
                title: "Design your digest",
                description:
                  "Choose format, tone, length, and audio preferences—NewsGlide remembers and evolves with every session.",
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
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Why curious minds choose NewsGlide</h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Every part of the platform is built to keep you directing the story instead of scrolling a feed.
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: Globe,
                    title: "Explore & Discover anything",
                    description:
                      "Map limitless combinations of topics, sources, and queries in the Explore & Discover workspace.",
                    delay: "delay-100",
                  },
                  {
                    icon: Brain,
                    title: "Learns your curiosity",
                    description:
                      "NewsGlide builds a living profile of what you follow and adapts recommendations, follow-ups, and reminders.",
                    delay: "delay-200",
                  },
                  {
                    icon: MessageCircle,
                    title: "Glidey, your co-pilot",
                    description:
                      "Chat inside every article to fact-check, unpack nuance, or spin up a Part 2 the moment you ask.",
                    delay: "delay-300",
                  },
                  {
                    icon: Sparkles,
                    title: "Interactive articles",
                    description:
                      "Tap through key points, generate new angles, and keep refining each story until it matches what you need.",
                    delay: "delay-400",
                  },
                  {
                    icon: FileText,
                    title: "Formats that fit you",
                    description:
                      "Switch between paragraphs or bullet points, set article length, and pick PhD analysis or explain-it-like-I'm-five tone.",
                    delay: "delay-500",
                  },
                  {
                    icon: Volume2,
                    title: "Voices & debates",
                    description:
                      "Listen with custom narrators like Morgan Freeman and cue AI debates between notable voices to test every viewpoint.",
                    delay: "delay-600",
                  },
                ].map((feature, index) => (
                  <div
                    key={index}
                    className={`flex items-start space-x-4 animate-on-scroll opacity-0 translate-y-8 transition-all duration-700 ${feature.delay} group hover:translate-x-2`}
                  >
                    <div className="relative w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center flex-shrink-0 mt-1 transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-200/50">
                      <feature.icon className="w-6 h-6 text-blue-600 transition-all duration-500 group-hover:text-blue-700 group-hover:scale-110" />
                      <div className="absolute inset-0 rounded-full bg-blue-400 opacity-0 group-hover:opacity-20 transition-opacity duration-500 animate-pulse"></div>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 mb-2 transition-colors duration-300 group-hover:text-blue-600">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed transition-colors duration-300 group-hover:text-slate-700">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative animate-on-scroll opacity-0 translate-x-8 transition-all duration-1000 delay-200">
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 transition-all duration-500 hover:shadow-xl hover:scale-105 group">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-xs uppercase tracking-wide">Your NewsGlide cockpit</span>
                    <span className="bg-slate-900 text-white text-xs px-2 py-1 rounded transition-all duration-300 group-hover:bg-blue-600">
                      Synced
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-2">
                        <span>Format</span>
                        <span className="text-blue-600">Bullet Points</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Switch to paragraphs anytime; NewsGlide remembers your flow across sessions.
                      </p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-2">
                        <span>Tone & depth</span>
                        <span className="text-blue-600">
                          PhD {'<>'} ELI5
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Jump between academic-grade analysis, classic reporting, or explain-it-like-I'm-five clarity.
                      </p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-2">
                        <span>Audio & debate</span>
                        <span className="text-blue-600">Morgan Freeman</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Cue custom voices and launch AI debates between notable people to stress-test every angle.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 text-white rounded-xl p-5 shadow-lg space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Sparkles className="w-4 h-4 text-cyan-300" />
                      <span>Glidey is listening</span>
                    </div>
                    <p className="text-sm text-slate-100">
                      "Want me to spin up a Part 2 on energy storage or compare how engineers and policymakers see it?"
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs bg-white/5 border-white/30 text-white hover:bg-white/10 hover:text-white"
                      >
                        Ask follow-up
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs bg-white text-slate-900 hover:bg-slate-100"
                      >
                        Generate Part 2
                      </Button>
                    </div>
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

      {/* Mission */}
      <section id="mission" ref={missionRef} className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Our Mission</h2>
            <div className="h-1 w-24 mx-auto bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 rounded-full opacity-60"></div>
          </div>
          <p className="text-lg text-slate-600 animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000 delay-100">
            Coming soon...
          </p>
          <p className="text-base text-slate-500 max-w-2xl mx-auto animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000 delay-200">
            We&apos;re crafting a concise story about why we built NewsGlide&mdash;stay tuned for the vision that keeps us shipping everyday.
          </p>
        </div>
      </section>

      {/* Personalization Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Personalize every detail</h2>
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Tailor each read to the way you learn. NewsGlide syncs your preferences across devices and keeps adapting as your curiosity evolves.
            </p>
          </div>

          <div className="grid gap-10 lg:grid-cols-3">
            {[
              {
                icon: FileText,
                title: "Formats & length",
                points: [
                  "Flip between paragraph narratives and bullet-point briefings instantly.",
                  "Choose flash summaries, standard reads, or full investigative deep dives.",
                ],
                delay: "delay-100",
              },
              {
                icon: Brain,
                title: "Tone & guidance",
                points: [
                  "Select classic newsroom, explain-it-like-I'm-five, or PhD-level analysis on demand.",
                  "Glidey queues follow-up prompts and spins up Part 2s the moment you ask.",
                ],
                delay: "delay-200",
              },
              {
                icon: Volume2,
                title: "Listen & debate",
                points: [
                  "Listen with custom voices—Morgan Freeman, newsroom anchors, or voices you design.",
                  "Launch AI debates between notable people to hear every angle challenged.",
                ],
                delay: "delay-300",
              },
            ].map((card, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-lg transition-all duration-300 animate-on-scroll opacity-0 translate-y-8 ${card.delay}`}
              >
                <div className="flex items-center gap-3 mb-5">
                  <card.icon className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-semibold text-slate-900">{card.title}</h3>
                </div>
                <ul className="space-y-3 text-sm text-slate-600 leading-relaxed">
                  {card.points.map((point, pointIndex) => (
                    <li key={pointIndex} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0"></span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Floating Elements Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-6xl mx-auto text-center relative z-10 animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">Fuel your curiosity every day</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
            Build living news playlists, follow threads you care about, and keep challenging every viewpoint with Glidey by your side.
          </p>
          <Button
            size="lg"
            className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 transition-all duration-300 hover:scale-105 hover:shadow-xl group cta-pulse"
            onClick={handleStartReading}
          >
            Start exploring
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
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Ready to steer your news?</h2>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
            Step into an interactive newsroom that learns you, adapts with you, and keeps you in command of every story.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-4 transition-all duration-300 hover:scale-105 hover:shadow-xl group"
              onClick={handleStartReading}
            >
              Glide With Us
              <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-600 text-white hover:bg-slate-800 px-8 py-4 bg-transparent transition-all duration-300 hover:scale-105"
            >
              See Pricing
            </Button>
          </div>
          <p className="text-slate-400 text-sm mt-4">No credit card required • 14-day free trial</p>
        </div>
      </section>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-slate-200/50 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-500">
            <p>© 2025 NewsGlide. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-slate-900 transition-colors duration-300" aria-label="X (formerly Twitter)">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="#" className="hover:text-slate-900 transition-colors duration-300" aria-label="LinkedIn">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-slate-900 transition-colors duration-300" aria-label="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
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
    </div>
  )
}
