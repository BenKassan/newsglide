import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth, AuthProvider } from '../AuthContext'
import { mockSupabase } from '@/test/mocks/supabase'
import React from 'react'

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  )

  it('should throw error when used outside of AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleError.mockRestore()
  })

  it('should provide auth context values', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current.user).toBeNull()
      expect(result.current.session).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.signIn).toBeInstanceOf(Function)
      expect(result.current.signUp).toBeInstanceOf(Function)
      expect(result.current.signOut).toBeInstanceOf(Function)
      expect(result.current.resetPassword).toBeInstanceOf(Function)
    })
  })

  it('should handle successful sign in', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      error: null,
      data: { user: { id: 'test-user' }, session: { access_token: 'test-token' } },
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      const response = await result.current.signIn('test@example.com', 'password')
      expect(response.error).toBeNull()
    })

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    })
  })

  it('should handle sign in error', async () => {
    const error = { message: 'Invalid credentials', code: 'invalid_credentials' }
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      error,
      data: { user: null, session: null },
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      const response = await result.current.signIn('test@example.com', 'wrong-password')
      expect(response.error).toEqual(error)
    })
  })

  it('should handle successful sign up', async () => {
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      error: null,
      data: { user: { id: 'new-user' }, session: null },
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      const response = await result.current.signUp('newuser@example.com', 'password', 'New User')
      expect(response.error).toBeNull()
    })

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'newuser@example.com',
      password: 'password',
      options: {
        emailRedirectTo: expect.stringContaining('/'),
        data: {
          full_name: 'New User',
        },
      },
    })
  })

  it('should handle password reset', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
      error: null,
      data: {},
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      const response = await result.current.resetPassword('test@example.com')
      expect(response.error).toBeNull()
    })

    expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
      redirectTo: expect.stringContaining('/reset-password'),
    })
  })
})
