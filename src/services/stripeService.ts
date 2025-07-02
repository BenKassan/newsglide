import { supabase } from '@/integrations/supabase/client';

export interface CheckoutSessionResponse {
  url: string;
}

export interface PortalSessionResponse {
  url: string;
}

export const createCheckoutSession = async (): Promise<CheckoutSessionResponse> => {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {}
  });

  if (error) {
    throw new Error(error.message || 'Failed to create checkout session');
  }

  return data;
};

export const createPortalSession = async (): Promise<PortalSessionResponse> => {
  const { data, error } = await supabase.functions.invoke('create-portal-session', {
    body: {}
  });

  if (error) {
    throw new Error(error.message || 'Failed to create portal session');
  }

  return data;
};