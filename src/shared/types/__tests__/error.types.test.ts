import { describe, it, expect } from 'vitest'
import { isApiError, getErrorMessage } from '../error.types'

describe('Error Type Guards and Utilities', () => {
  describe('isApiError', () => {
    it('should return true for valid ApiError', () => {
      const error = {
        message: 'API Error',
        code: 'API_ERROR',
        status: 400,
      }
      expect(isApiError(error)).toBe(true)
    })

    it('should return true for minimal ApiError', () => {
      const error = { message: 'Error' }
      expect(isApiError(error)).toBe(true)
    })

    it('should return false for non-object values', () => {
      expect(isApiError('string')).toBe(false)
      expect(isApiError(123)).toBe(false)
      expect(isApiError(null)).toBe(false)
      expect(isApiError(undefined)).toBe(false)
    })

    it('should return false for objects without message', () => {
      expect(isApiError({ code: 'ERROR' })).toBe(false)
      expect(isApiError({ status: 400 })).toBe(false)
    })

    it('should return false for objects with non-string message', () => {
      expect(isApiError({ message: 123 })).toBe(false)
      expect(isApiError({ message: null })).toBe(false)
    })
  })

  describe('getErrorMessage', () => {
    it('should extract message from ApiError', () => {
      const error = {
        message: 'API Error Message',
        code: 'API_ERROR',
      }
      expect(getErrorMessage(error)).toBe('API Error Message')
    })

    it('should extract message from Error instance', () => {
      const error = new Error('Standard Error')
      expect(getErrorMessage(error)).toBe('Standard Error')
    })

    it('should return string errors as-is', () => {
      expect(getErrorMessage('String error')).toBe('String error')
    })

    it('should return default message for unknown errors', () => {
      expect(getErrorMessage(null)).toBe('An unknown error occurred')
      expect(getErrorMessage(undefined)).toBe('An unknown error occurred')
      expect(getErrorMessage(123)).toBe('An unknown error occurred')
      expect(getErrorMessage({})).toBe('An unknown error occurred')
      expect(getErrorMessage({ notMessage: 'value' })).toBe('An unknown error occurred')
    })
  })
})
