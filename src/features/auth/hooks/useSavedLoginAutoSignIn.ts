import { useCallback, useState } from 'react'
import type { AuthError } from '@supabase/supabase-js'
import { useAuth } from '../AuthContext'
import { credentialStorageService } from '@/services/credentialStorageService'
import { useToast } from '@shared/hooks/use-toast'

type AutoSignInResult = {
  attempted: boolean
  success: boolean
  error?: AuthError | Error | null
}

type AutoSignInOptions = {
  showSuccessToast?: boolean
  successMessage?: string
}

export const useSavedLoginAutoSignIn = () => {
  const { signIn } = useAuth()
  const { toast } = useToast()
  const [isAutoSigningIn, setIsAutoSigningIn] = useState(false)

  const attemptAutoSignIn = useCallback(
    async (options?: AutoSignInOptions): Promise<AutoSignInResult> => {
      const credentials = credentialStorageService.getSavedCredentials()

      if (!credentials) {
        return { attempted: false, success: false }
      }

      setIsAutoSigningIn(true)

      try {
        const { error } = await signIn(credentials.email, credentials.password)

        if (error) {
          toast({
            title: 'Automatic sign-in failed',
            description: 'Please sign in manually to continue.',
            variant: 'destructive',
          })
          return { attempted: true, success: false, error }
        }

        if (options?.showSuccessToast) {
          toast({
            title: 'Welcome back',
            description: options.successMessage ?? 'Signed you in automatically using saved login info.',
            variant: 'success',
          })
        }

        return { attempted: true, success: true }
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error('Unexpected sign-in error')
        toast({
          title: 'Automatic sign-in failed',
          description: 'Please sign in manually to continue.',
          variant: 'destructive',
        })
        return { attempted: true, success: false, error: normalizedError }
      } finally {
        setIsAutoSigningIn(false)
      }
    },
    [signIn, toast],
  )

  return {
    attemptAutoSignIn,
    isAutoSigningIn,
  }
}
