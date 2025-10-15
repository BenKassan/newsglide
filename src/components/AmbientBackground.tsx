import { useEffect, useState } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  delay: number
}

const gradientBackground = `linear-gradient(135deg,
  hsl(212, 42%, 97%) 0%,
  hsl(210, 44%, 95%) 25%,
  hsl(215, 42%, 96%) 50%,
  hsl(213, 43%, 98%) 75%,
  hsl(210, 41%, 98%) 100%)`

export const AmbientBackground = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [particles, setParticles] = useState<Particle[]>([])
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const initialParticles = Array.from({ length: 12 }, (_, index) => ({
      id: index,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 20,
    }))
    setParticles(initialParticles)
  }, [])

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY })

      const moveX = (event.clientX - window.innerWidth / 2) * 0.015
      const moveY = (event.clientY - window.innerHeight / 2) * 0.015
      setParallaxOffset({ x: moveX, y: moveY })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <>
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 transition-all duration-1000 ease-in-out"
          style={{ background: gradientBackground }}
        />

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.3) 1px, transparent 0)`,
            backgroundSize: '24px 24px',
            animation: 'textureShift 60s linear infinite',
          }}
        />
      </div>

      {/* Gradient mesh blobs that follow the cursor */}
      <div className="fixed inset-0 pointer-events-none z-[0] hidden md:block">
        <div
          className="absolute top-16 -left-20 w-[28rem] h-[28rem] rounded-full opacity-40 blur-3xl transition-transform duration-700 ease-out"
          style={{
            background:
              'radial-gradient(ellipse 120% 80%, rgba(59, 130, 246, 0.5) 0%, rgba(6, 182, 212, 0.35) 55%, transparent 75%)',
            transform: `translate(${parallaxOffset.x * 0.35}px, ${parallaxOffset.y * 0.2}px)`,
            borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
          }}
        />
        <div
          className="absolute top-40 right-4 w-[34rem] h-[34rem] rounded-full opacity-35 blur-3xl transition-transform duration-700 ease-out"
          style={{
            background:
              'radial-gradient(circle, rgba(14, 165, 233, 0.35) 0%, rgba(59, 130, 246, 0.25) 55%, transparent 75%)',
            transform: `translate(${parallaxOffset.x * -0.25}px, ${parallaxOffset.y * 0.25}px)`,
          }}
        />
        <div
          className="absolute -bottom-10 left-1/3 w-[24rem] h-[24rem] rounded-full opacity-45 blur-3xl transition-transform duration-700 ease-out"
          style={{
            background:
              'radial-gradient(circle, rgba(37, 99, 235, 0.45) 0%, rgba(59, 130, 246, 0.25) 55%, transparent 75%)',
            transform: `translate(${parallaxOffset.x * 0.2}px, ${parallaxOffset.y * -0.3}px)`,
          }}
        />
      </div>

      <div
        className="fixed inset-0 pointer-events-none z-1 opacity-0 transition-opacity duration-500 hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.08), rgba(6, 182, 212, 0.05), transparent 60%)`,
        }}
      />

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
    </>
  )
}

export default AmbientBackground
