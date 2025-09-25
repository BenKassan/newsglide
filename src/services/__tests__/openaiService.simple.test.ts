import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isApiError, getErrorMessage } from '@shared/types/error.types'

describe('OpenAI Service - Error Handling', () => {
  it('should properly identify API errors', () => {
    const validApiError = {
      message: 'API Error',
      code: 'ERR001',
      status: 400,
    }

    expect(isApiError(validApiError)).toBe(true)
  })

  it('should extract error messages correctly', () => {
    const apiError = { message: 'API failed' }
    const standardError = new Error('Standard error')
    const stringError = 'String error'
    const unknownError = { someField: 'value' }

    expect(getErrorMessage(apiError)).toBe('API failed')
    expect(getErrorMessage(standardError)).toBe('Standard error')
    expect(getErrorMessage(stringError)).toBe('String error')
    expect(getErrorMessage(unknownError)).toBe('An unknown error occurred')
  })
})
