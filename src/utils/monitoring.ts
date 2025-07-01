
import { supabase } from '@/integrations/supabase/client';

export const logPerformance = async (operation: string, duration: number, userId?: string) => {
  try {
    // Only log slow operations over 5 seconds to avoid noise
    if (duration > 5000) {
      await supabase
        .from('performance_logs')
        .insert({
          operation,
          duration,
          user_id: userId || null
        });
    }
  } catch (error) {
    console.error('Failed to log performance:', error);
  }
};

export const withPerformanceLogging = async <T>(
  operation: string,
  fn: () => Promise<T>,
  userId?: string
): Promise<T> => {
  const startTime = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    await logPerformance(operation, duration, userId);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    await logPerformance(`${operation}_error`, duration, userId);
    throw error;
  }
};
