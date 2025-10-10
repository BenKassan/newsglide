/**
 * Rate Limiting for NewsGlide Edge Functions
 *
 * Implements in-memory rate limiting to prevent abuse while allowing
 * generous limits for legitimate users. Limits are intentionally HIGH
 * to only catch malicious actors, not regular users.
 *
 * Note: This is an in-memory implementation suitable for development
 * and moderate production use. For high-scale production, consider
 * upgrading to Redis-based rate limiting (Upstash).
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests allowed */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Human-readable window description */
  windowDescription: string;
}

/**
 * Predefined rate limit tiers
 * INTENTIONALLY HIGH - only blocks obvious abuse
 */
export const RateLimits = {
  /** Standard operations: 100 requests per minute */
  STANDARD: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    windowDescription: '1 minute',
  } as RateLimitConfig,

  /** AI operations: 1000 requests per hour */
  AI_CALLS: {
    maxRequests: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
    windowDescription: '1 hour',
  } as RateLimitConfig,

  /** Expensive operations: 50 requests per hour */
  EXPENSIVE: {
    maxRequests: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    windowDescription: '1 hour',
  } as RateLimitConfig,

  /** Authentication attempts: 20 per 5 minutes */
  AUTH: {
    maxRequests: 20,
    windowMs: 5 * 60 * 1000, // 5 minutes
    windowDescription: '5 minutes',
  } as RateLimitConfig,

  /** Webhook processing: 500 per hour */
  WEBHOOK: {
    maxRequests: 500,
    windowMs: 60 * 60 * 1000, // 1 hour
    windowDescription: '1 hour',
  } as RateLimitConfig,
};

/**
 * In-memory storage for rate limit tracking
 * Key format: `${identifier}:${endpoint}`
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries periodically
 * Runs every 5 minutes to prevent memory leaks
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check rate limit for a user/IP
 *
 * @param identifier - User ID or IP address
 * @param endpoint - Endpoint name (for separate limits per endpoint)
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining count
 */
export function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  resetIn: number;
} {
  const key = `${identifier}:${endpoint}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Initialize or reset if window expired
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  // Increment count
  entry.count++;

  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const resetIn = Math.max(0, entry.resetTime - now);

  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
    resetIn,
  };
}

/**
 * Create a rate limit error response
 *
 * @param result - Rate limit check result
 * @param config - Rate limit configuration
 * @param corsHeaders - CORS headers to include
 * @returns Response object
 */
export function rateLimitExceededResponse(
  result: ReturnType<typeof checkRateLimit>,
  config: RateLimitConfig,
  corsHeaders: HeadersInit
): Response {
  const resetInSeconds = Math.ceil(result.resetIn / 1000);

  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${resetInSeconds} seconds.`,
      limit: config.maxRequests,
      window: config.windowDescription,
      resetIn: resetInSeconds,
      retryAfter: resetInSeconds,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': resetInSeconds.toString(),
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      },
    }
  );
}

/**
 * Helper to add rate limit headers to successful responses
 *
 * @param headers - Existing headers
 * @param result - Rate limit check result
 * @param config - Rate limit configuration
 * @returns Updated headers
 */
export function addRateLimitHeaders(
  headers: Headers,
  result: ReturnType<typeof checkRateLimit>,
  config: RateLimitConfig
): Headers {
  headers.set('X-RateLimit-Limit', config.maxRequests.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
  return headers;
}

/**
 * Get identifier from request
 * Prefers user ID from auth, falls back to IP address
 *
 * @param req - Request object
 * @param userId - Optional authenticated user ID
 * @returns Identifier string
 */
export function getIdentifier(req: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0].trim() || 'unknown';
  return `ip:${ip}`;
}
