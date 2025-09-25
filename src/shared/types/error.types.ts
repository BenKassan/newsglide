export interface ApiError {
  message: string
  code?: string
  status?: number
  details?: unknown
}

export interface AuthError extends ApiError {
  authCode?: string
}

export interface StripeError extends ApiError {
  stripeCode?: string
  param?: string
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  )
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}
