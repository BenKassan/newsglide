import { supabase } from '@/integrations/supabase/client'

export interface CheckoutSessionResponse {
  url: string
}

export interface PortalSessionResponse {
  url: string
}

export const createCheckoutSession = async (): Promise<CheckoutSessionResponse> => {
  console.log('[STRIPE SERVICE] Starting checkout session creation...')

  try {
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {},
    })

    console.log('[STRIPE SERVICE] Edge function response:', {
      hasData: !!data,
      hasError: !!error,
      data: data,
      error: error,
    })

    if (error) {
      console.error('[STRIPE SERVICE] Edge function error:', error)
      throw new Error(error.message || 'Failed to create checkout session')
    }

    if (!data?.url) {
      console.error('[STRIPE SERVICE] No URL in response:', data)
      throw new Error('No checkout URL returned from payment service')
    }

    console.log('[STRIPE SERVICE] Checkout session created successfully')
    return data
  } catch (err: unknown) {
    console.error('[STRIPE SERVICE] Checkout session creation failed:', err)

    const errorMessage = err instanceof Error ? err.message : 'Unknown error'

    // Enhance error message with more context
    if (errorMessage.includes('Invalid price ID')) {
      throw new Error('Payment configuration error: Price ID not found in Stripe')
    } else if (errorMessage.includes('STRIPE_SECRET_KEY')) {
      throw new Error('Payment configuration error: Stripe API key not configured')
    } else if (errorMessage.includes('Authentication error')) {
      throw new Error('Authentication error: Please sign in again')
    }

    throw err
  }
}

export const createPortalSession = async (): Promise<PortalSessionResponse> => {
  const { data, error } = await supabase.functions.invoke('create-portal-session', {
    body: {},
  })

  if (error) {
    throw new Error(error.message || 'Failed to create portal session')
  }

  return data
}
