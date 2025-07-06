/**
 * Environment variable validation and configuration
 */

interface EnvironmentVariables {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
  VITE_ELEVEN_LABS_VOICE_ID?: string
}

class EnvironmentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EnvironmentError'
  }
}

/**
 * Validates that all required environment variables are present
 * @throws {EnvironmentError} if any required variables are missing
 */
export function validateEnvironment(): void {
  const requiredVars: (keyof EnvironmentVariables)[] = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ]

  const missingVars: string[] = []

  for (const varName of requiredVars) {
    if (!import.meta.env[varName]) {
      missingVars.push(varName)
    }
  }

  if (missingVars.length > 0) {
    throw new EnvironmentError(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
        'Please check your .env.local file or environment configuration.'
    )
  }

  // Validate URL format
  try {
    new URL(import.meta.env.VITE_SUPABASE_URL)
  } catch {
    throw new EnvironmentError('VITE_SUPABASE_URL must be a valid URL')
  }

  // Validate JWT format (basic check)
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!anonKey.includes('.') || anonKey.split('.').length !== 3) {
    throw new EnvironmentError('VITE_SUPABASE_ANON_KEY must be a valid JWT token')
  }
}

/**
 * Get typed environment variables
 */
export function getEnv(): EnvironmentVariables {
  return {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_ELEVEN_LABS_VOICE_ID: import.meta.env.VITE_ELEVEN_LABS_VOICE_ID,
  }
}

// Validate environment on module load
if (import.meta.env.MODE !== 'test') {
  validateEnvironment()
}
