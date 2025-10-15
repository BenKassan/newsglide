import { useEffect, useState, type CSSProperties } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  delay: number
}

type AmbientBackgroundVariant =
  | 'default'
  | 'glidey'
  | 'discover'
  | 'history'
  | 'profile'
  | 'preferences'
  | 'mission'

interface BlobConfig {
  width: string
  height: string
  top?: string
  bottom?: string
  left?: string
  right?: string
  background: string
  opacity: number
  borderRadius?: string
  blur?: string
  transformMultiplier: {
    x: number
    y: number
  }
  mixBlendMode?: CSSProperties['mixBlendMode']
}

interface SpotlightConfig {
  inner: string
  middle: string
  outer?: string
  opacity?: number
}

interface VariantConfig {
  gradientBackground: string
  textureColor: string
  textureOpacity: number
  blobs: BlobConfig[]
  spotlight: SpotlightConfig
  particleColor: string
}

const VARIANT_CONFIGS: Record<AmbientBackgroundVariant, VariantConfig> = {
  default: {
    gradientBackground: `linear-gradient(135deg,
      hsl(212, 42%, 97%) 0%,
      hsl(210, 44%, 95%) 25%,
      hsl(215, 42%, 96%) 50%,
      hsl(213, 43%, 98%) 75%,
      hsl(210, 41%, 98%) 100%)`,
    textureColor: 'rgba(59, 130, 246, 0.3)',
    textureOpacity: 0.03,
    blobs: [
      {
        width: '28rem',
        height: '28rem',
        top: '4rem',
        left: '-5rem',
        background:
          'radial-gradient(ellipse 120% 80%, rgba(59, 130, 246, 0.5) 0%, rgba(6, 182, 212, 0.35) 55%, transparent 75%)',
        opacity: 0.4,
        borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
        blur: 'blur(64px)',
        transformMultiplier: { x: 0.35, y: 0.2 },
      },
      {
        width: '34rem',
        height: '34rem',
        top: '10rem',
        right: '1rem',
        background:
          'radial-gradient(circle, rgba(14, 165, 233, 0.35) 0%, rgba(59, 130, 246, 0.25) 55%, transparent 75%)',
        opacity: 0.35,
        blur: 'blur(64px)',
        transformMultiplier: { x: -0.25, y: 0.25 },
      },
      {
        width: '24rem',
        height: '24rem',
        bottom: '-2.5rem',
        left: '33%',
        background:
          'radial-gradient(circle, rgba(37, 99, 235, 0.45) 0%, rgba(59, 130, 246, 0.25) 55%, transparent 75%)',
        opacity: 0.45,
        blur: 'blur(64px)',
        transformMultiplier: { x: 0.2, y: -0.3 },
      },
    ],
    spotlight: {
      inner: 'rgba(59, 130, 246, 0.08)',
      middle: 'rgba(6, 182, 212, 0.05)',
      outer: 'transparent 60%',
    },
    particleColor: 'rgba(96, 165, 250, 0.45)',
  },
  glidey: {
    gradientBackground: `linear-gradient(140deg,
      hsl(218, 58%, 97%) 0%,
      hsl(224, 74%, 95%) 30%,
      hsl(229, 86%, 96%) 55%,
      hsl(236, 78%, 97%) 80%,
      hsl(216, 60%, 98%) 100%)`,
    textureColor: 'rgba(109, 40, 217, 0.28)',
    textureOpacity: 0.035,
    blobs: [
      {
        width: '30rem',
        height: '30rem',
        top: '3rem',
        left: '-6rem',
        background:
          'radial-gradient(ellipse 110% 80%, rgba(99, 102, 241, 0.55) 0%, rgba(79, 70, 229, 0.35) 55%, transparent 75%)',
        opacity: 0.45,
        borderRadius: '55% 45% 30% 70% / 55% 35% 70% 45%',
        blur: 'blur(72px)',
        transformMultiplier: { x: 0.38, y: 0.18 },
      },
      {
        width: '36rem',
        height: '36rem',
        top: '12rem',
        right: '-2rem',
        background:
          'radial-gradient(circle, rgba(129, 140, 248, 0.4) 0%, rgba(56, 189, 248, 0.25) 55%, transparent 75%)',
        opacity: 0.35,
        blur: 'blur(70px)',
        transformMultiplier: { x: -0.28, y: 0.24 },
      },
      {
        width: '26rem',
        height: '26rem',
        bottom: '-3rem',
        left: '30%',
        background:
          'radial-gradient(circle, rgba(14, 165, 233, 0.4) 0%, rgba(99, 102, 241, 0.28) 55%, transparent 75%)',
        opacity: 0.5,
        blur: 'blur(60px)',
        transformMultiplier: { x: 0.18, y: -0.28 },
      },
    ],
    spotlight: {
      inner: 'rgba(129, 140, 248, 0.11)',
      middle: 'rgba(56, 189, 248, 0.06)',
      outer: 'transparent 60%',
    },
    particleColor: 'rgba(129, 140, 248, 0.4)',
  },
  discover: {
    gradientBackground: `linear-gradient(130deg,
      hsl(205, 68%, 97%) 0%,
      hsl(191, 74%, 95%) 25%,
      hsl(197, 78%, 96%) 55%,
      hsl(206, 68%, 97%) 80%,
      hsl(204, 70%, 98%) 100%)`,
    textureColor: 'rgba(16, 185, 129, 0.25)',
    textureOpacity: 0.028,
    blobs: [
      {
        width: '28rem',
        height: '28rem',
        top: '5rem',
        left: '-4rem',
        background:
          'radial-gradient(ellipse 110% 80%, rgba(94, 234, 212, 0.5) 0%, rgba(20, 184, 166, 0.35) 60%, transparent 78%)',
        opacity: 0.42,
        borderRadius: '58% 42% 35% 65% / 60% 40% 65% 35%',
        blur: 'blur(68px)',
        transformMultiplier: { x: 0.32, y: 0.18 },
      },
      {
        width: '32rem',
        height: '32rem',
        top: '11rem',
        right: '0',
        background:
          'radial-gradient(circle, rgba(59, 130, 246, 0.32) 0%, rgba(6, 182, 212, 0.26) 55%, transparent 75%)',
        opacity: 0.36,
        blur: 'blur(62px)',
        transformMultiplier: { x: -0.24, y: 0.26 },
      },
      {
        width: '25rem',
        height: '25rem',
        bottom: '-2rem',
        left: '35%',
        background:
          'radial-gradient(circle, rgba(45, 212, 191, 0.45) 0%, rgba(14, 165, 233, 0.25) 55%, transparent 75%)',
        opacity: 0.48,
        blur: 'blur(58px)',
        transformMultiplier: { x: 0.22, y: -0.26 },
      },
    ],
    spotlight: {
      inner: 'rgba(45, 212, 191, 0.1)',
      middle: 'rgba(14, 165, 233, 0.05)',
      outer: 'transparent 60%',
    },
    particleColor: 'rgba(94, 234, 212, 0.4)',
  },
  history: {
    gradientBackground: `linear-gradient(140deg,
      hsl(220, 58%, 97%) 0%,
      hsl(222, 60%, 95%) 28%,
      hsl(227, 58%, 95%) 55%,
      hsl(229, 60%, 97%) 80%,
      hsl(215, 56%, 98%) 100%)`,
    textureColor: 'rgba(30, 64, 175, 0.28)',
    textureOpacity: 0.035,
    blobs: [
      {
        width: '29rem',
        height: '29rem',
        top: '4rem',
        left: '-5rem',
        background:
          'radial-gradient(ellipse 120% 80%, rgba(79, 70, 229, 0.5) 0%, rgba(30, 64, 175, 0.35) 55%, transparent 75%)',
        opacity: 0.42,
        borderRadius: '60% 40% 40% 60% / 60% 40% 60% 40%',
        blur: 'blur(72px)',
        transformMultiplier: { x: 0.34, y: 0.22 },
      },
      {
        width: '33rem',
        height: '33rem',
        top: '13rem',
        right: '0',
        background:
          'radial-gradient(circle, rgba(96, 165, 250, 0.3) 0%, rgba(129, 140, 248, 0.28) 55%, transparent 75%)',
        opacity: 0.36,
        blur: 'blur(68px)',
        transformMultiplier: { x: -0.26, y: 0.24 },
      },
      {
        width: '24rem',
        height: '24rem',
        bottom: '-2.5rem',
        left: '32%',
        background:
          'radial-gradient(circle, rgba(59, 130, 246, 0.45) 0%, rgba(79, 70, 229, 0.25) 55%, transparent 75%)',
        opacity: 0.5,
        blur: 'blur(60px)',
        transformMultiplier: { x: 0.18, y: -0.28 },
      },
    ],
    spotlight: {
      inner: 'rgba(59, 130, 246, 0.1)',
      middle: 'rgba(79, 70, 229, 0.06)',
      outer: 'transparent 60%',
    },
    particleColor: 'rgba(96, 165, 250, 0.45)',
  },
  profile: {
    gradientBackground: `linear-gradient(135deg,
      hsl(218, 70%, 98%) 0%,
      hsl(232, 78%, 96%) 30%,
      hsl(248, 74%, 97%) 55%,
      hsl(226, 72%, 98%) 85%,
      hsl(216, 60%, 99%) 100%)`,
    textureColor: 'rgba(147, 51, 234, 0.25)',
    textureOpacity: 0.03,
    blobs: [
      {
        width: '27rem',
        height: '27rem',
        top: '5rem',
        left: '-4.5rem',
        background:
          'radial-gradient(ellipse 110% 80%, rgba(168, 85, 247, 0.5) 0%, rgba(129, 140, 248, 0.35) 55%, transparent 75%)',
        opacity: 0.4,
        borderRadius: '62% 38% 36% 64% / 55% 42% 58% 45%',
        blur: 'blur(70px)',
        transformMultiplier: { x: 0.33, y: 0.2 },
      },
      {
        width: '34rem',
        height: '34rem',
        top: '12rem',
        right: '-1rem',
        background:
          'radial-gradient(circle, rgba(192, 132, 252, 0.35) 0%, rgba(59, 130, 246, 0.25) 55%, transparent 75%)',
        opacity: 0.34,
        blur: 'blur(68px)',
        transformMultiplier: { x: -0.27, y: 0.24 },
      },
      {
        width: '25rem',
        height: '25rem',
        bottom: '-2rem',
        left: '34%',
        background:
          'radial-gradient(circle, rgba(129, 140, 248, 0.42) 0%, rgba(236, 72, 153, 0.22) 55%, transparent 75%)',
        opacity: 0.52,
        blur: 'blur(60px)',
        transformMultiplier: { x: 0.2, y: -0.3 },
      },
    ],
    spotlight: {
      inner: 'rgba(168, 85, 247, 0.12)',
      middle: 'rgba(236, 72, 153, 0.06)',
      outer: 'transparent 60%',
    },
    particleColor: 'rgba(192, 132, 252, 0.42)',
  },
  preferences: {
    gradientBackground: `linear-gradient(132deg,
      hsl(205, 72%, 98%) 0%,
      hsl(197, 76%, 96%) 28%,
      hsl(189, 78%, 97%) 55%,
      hsl(201, 70%, 98%) 82%,
      hsl(210, 70%, 99%) 100%)`,
    textureColor: 'rgba(14, 165, 233, 0.3)',
    textureOpacity: 0.026,
    blobs: [
      {
        width: '29rem',
        height: '29rem',
        top: '4rem',
        left: '-4rem',
        background:
          'radial-gradient(ellipse 120% 80%, rgba(59, 130, 246, 0.45) 0%, rgba(14, 165, 233, 0.35) 55%, transparent 75%)',
        opacity: 0.42,
        borderRadius: '58% 42% 36% 64% / 58% 38% 64% 42%',
        blur: 'blur(68px)',
        transformMultiplier: { x: 0.36, y: 0.2 },
      },
      {
        width: '34rem',
        height: '34rem',
        top: '11rem',
        right: '-2rem',
        background:
          'radial-gradient(circle, rgba(56, 189, 248, 0.32) 0%, rgba(124, 58, 237, 0.22) 55%, transparent 75%)',
        opacity: 0.34,
        blur: 'blur(66px)',
        transformMultiplier: { x: -0.25, y: 0.26 },
      },
      {
        width: '24rem',
        height: '24rem',
        bottom: '-2.5rem',
        left: '31%',
        background:
          'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, rgba(20, 184, 166, 0.28) 55%, transparent 75%)',
        opacity: 0.48,
        blur: 'blur(60px)',
        transformMultiplier: { x: 0.2, y: -0.28 },
      },
    ],
    spotlight: {
      inner: 'rgba(56, 189, 248, 0.1)',
      middle: 'rgba(59, 130, 246, 0.05)',
      outer: 'transparent 60%',
    },
    particleColor: 'rgba(59, 130, 246, 0.42)',
  },
  mission: {
    gradientBackground: `linear-gradient(135deg,
      hsl(214, 72%, 97%) 0%,
      hsl(219, 68%, 95%) 30%,
      hsl(227, 70%, 96%) 55%,
      hsl(216, 70%, 97%) 82%,
      hsl(210, 62%, 98%) 100%)`,
    textureColor: 'rgba(37, 99, 235, 0.28)',
    textureOpacity: 0.03,
    blobs: [
      {
        width: '30rem',
        height: '30rem',
        top: '3.5rem',
        left: '-5.5rem',
        background:
          'radial-gradient(ellipse 115% 80%, rgba(59, 130, 246, 0.48) 0%, rgba(14, 165, 233, 0.32) 55%, transparent 75%)',
        opacity: 0.4,
        borderRadius: '60% 40% 35% 65% / 60% 35% 65% 40%',
        blur: 'blur(70px)',
        transformMultiplier: { x: 0.34, y: 0.19 },
      },
      {
        width: '35rem',
        height: '35rem',
        top: '10rem',
        right: '-1.5rem',
        background:
          'radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(59, 130, 246, 0.24) 55%, transparent 75%)',
        opacity: 0.33,
        blur: 'blur(66px)',
        transformMultiplier: { x: -0.27, y: 0.24 },
      },
      {
        width: '26rem',
        height: '26rem',
        bottom: '-2rem',
        left: '32%',
        background:
          'radial-gradient(circle, rgba(59, 130, 246, 0.42) 0%, rgba(14, 165, 233, 0.23) 55%, transparent 75%)',
        opacity: 0.47,
        blur: 'blur(60px)',
        transformMultiplier: { x: 0.19, y: -0.28 },
      },
    ],
    spotlight: {
      inner: 'rgba(59, 130, 246, 0.1)',
      middle: 'rgba(14, 165, 233, 0.05)',
      outer: 'transparent 60%',
    },
    particleColor: 'rgba(96, 165, 250, 0.45)',
  },
}

interface AmbientBackgroundProps {
  variant?: AmbientBackgroundVariant
}

export const AmbientBackground = ({ variant = 'default' }: AmbientBackgroundProps) => {
  const config = VARIANT_CONFIGS[variant] ?? VARIANT_CONFIGS.default
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
          style={{ background: config.gradientBackground }}
        />

        <div
          className="absolute inset-0"
          style={{
            opacity: config.textureOpacity,
            backgroundImage: `radial-gradient(circle at 1px 1px, ${config.textureColor} 1px, transparent 0)`,
            backgroundSize: '24px 24px',
            animation: 'textureShift 60s linear infinite',
          }}
        />
      </div>

      <div className="fixed inset-0 pointer-events-none z-[0] hidden md:block">
        {config.blobs.map((blob, index) => (
          <div
            key={index}
            className="absolute rounded-full transition-transform duration-700 ease-out"
            style={{
              width: blob.width,
              height: blob.height,
              top: blob.top,
              bottom: blob.bottom,
              left: blob.left,
              right: blob.right,
              background: blob.background,
              opacity: blob.opacity,
              borderRadius: blob.borderRadius,
              filter: blob.blur,
              mixBlendMode: blob.mixBlendMode,
              transform: `translate(${parallaxOffset.x * blob.transformMultiplier.x}px, ${parallaxOffset.y * blob.transformMultiplier.y}px)`,
            }}
          />
        ))}
      </div>

      <div
        className="fixed inset-0 pointer-events-none z-1 opacity-0 transition-opacity duration-500 hover:opacity-100"
        style={{
          opacity: config.spotlight.opacity,
          background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, ${config.spotlight.inner}, ${config.spotlight.middle}, ${
            config.spotlight.outer ?? 'transparent 60%'
          })`,
        }}
      />

      <div className="fixed inset-0 pointer-events-none z-1">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              backgroundColor: config.particleColor,
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
