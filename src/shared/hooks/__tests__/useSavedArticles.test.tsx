import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSavedArticles } from '../useSavedArticles'
import { mockSupabase } from '@/test/mocks/supabase'
import React from 'react'
import * as authModule from '@features/auth'

vi.mock('@features/auth', () => ({
  useAuth: vi.fn(),
}))

describe('useSavedArticles', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('should return loading state initially', () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: { id: 'test-user' },
      session: null,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
    })

    const { result } = renderHook(() => useSavedArticles(), { wrapper })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.articles).toEqual([])
  })

  it('should fetch saved articles successfully', async () => {
    const mockArticles = [
      {
        id: '1',
        user_id: 'test-user',
        news_data: { topic: 'Test Topic', headline: 'Test Headline' },
        created_at: new Date().toISOString(),
        tags: ['test'],
      },
    ]

    vi.mocked(authModule.useAuth).mockReturnValue({
      user: { id: 'test-user' },
      session: null,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
    })

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockArticles,
        error: null,
      }),
    } as ReturnType<typeof mockSupabase.from>)

    const { result } = renderHook(() => useSavedArticles(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.articles).toEqual(mockArticles)
    })
  })

  it('should handle error when fetching articles', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.mocked(authModule.useAuth).mockReturnValue({
      user: { id: 'test-user' },
      session: null,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
    })

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    } as ReturnType<typeof mockSupabase.from>)

    const { result } = renderHook(() => useSavedArticles(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
      expect(result.current.error).toBeDefined()
    })

    consoleError.mockRestore()
  })

  it('should return empty array when user is not authenticated', async () => {
    vi.mocked(authModule.useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
    })

    const { result } = renderHook(() => useSavedArticles(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.articles).toEqual([])
    })
  })
})
