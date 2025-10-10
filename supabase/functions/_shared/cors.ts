/**
 * Secure CORS Configuration for NewsGlide Edge Functions
 *
 * This module provides production-ready CORS headers that restrict
 * API access to only authorized origins, preventing unauthorized
 * cross-origin requests while maintaining full functionality.
 */

/**
 * Allowed origins for CORS requests
 * Add your production and development URLs here
 */
const ALLOWED_ORIGINS = [
  'https://newsglide.org',
  'https://www.newsglide.org',
  'http://localhost:3000',
  'http://localhost:5173',  // Vite dev server
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

/**
 * Get CORS headers for a request
 * Validates the origin and returns appropriate headers
 *
 * @param req - The incoming request
 * @returns CORS headers object
 */
export function getCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('origin');

  // Check if origin is allowed
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0]; // Default to production URL

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  };
}

/**
 * Handle CORS preflight requests
 *
 * @param req - The incoming OPTIONS request
 * @returns Response with CORS headers
 */
export function handleCorsPreflightRequest(req: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}

/**
 * Create a response with CORS headers
 *
 * @param body - Response body
 * @param init - ResponseInit options
 * @param req - The incoming request (for CORS headers)
 * @returns Response with CORS headers
 */
export function corsResponse(
  body: BodyInit | null,
  init: ResponseInit,
  req: Request
): Response {
  const corsHeaders = getCorsHeaders(req);
  const headers = new Headers(init.headers || {});

  // Add CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(body, {
    ...init,
    headers,
  });
}
