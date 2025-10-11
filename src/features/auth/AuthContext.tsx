import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@shared/hooks/use-toast'
import { sessionTrackingService } from '@/services/sessionTrackingService'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // Handle session tracking based on auth events (non-blocking)
      if (event === 'SIGNED_IN' && session?.user) {
        // Start tracking when user signs in (don't block auth state change)
        sessionTrackingService.startSession(session.user.id).catch((err) => {
          console.warn('Session tracking failed to start:', err)
        })
      } else if (event === 'SIGNED_OUT') {
        // End tracking when user signs out (don't block auth state change)
        sessionTrackingService.endSession().catch((err) => {
          console.warn('Session tracking failed to end:', err)
        })
      }
    })

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // Start tracking if user is already logged in (non-blocking)
      if (session?.user) {
        sessionTrackingService.startSession(session.user.id).catch((err) => {
          console.warn('Session tracking failed to start:', err)
        })
      }
    })

    // Clean up on unmount
    return () => {
      subscription.unsubscribe()
      // End session when component unmounts (e.g., user closes tab)
      sessionTrackingService.endSession()
    }
  }, [toast])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    })
    return { error }
  }

  const signOut = async () => {
    console.log('SignOut initiated...')

    // End session tracking before signing out
    try {
      await sessionTrackingService.endSession()
      console.log('Session tracking ended')
    } catch (error) {
      console.error('Error ending session tracking:', error)
    }

    // Fire off the sign out request but don't wait for it
    // This prevents the hanging issue
    supabase.auth.signOut().then(() => {
      console.log('SignOut completed successfully')
    }).catch((error) => {
      console.error('SignOut error (background):', error)
    })

    // Show immediate feedback to user
    toast({
      title: 'Signing out...',
      description: 'You are being signed out.',
      duration: 2000,
    })

    // Immediately redirect to home page without waiting
    // Use a small delay to allow the toast to show
    setTimeout(() => {
      console.log('Redirecting to home page...')
      window.location.href = '/'
    }, 500)
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
