import { supabase } from '@/integrations/supabase/client'

interface Session {
  id: string
  sessionStart: Date
  lastUpdate: Date
  isActive: boolean
}

class SessionTrackingService {
  private currentSession: Session | null = null
  private updateInterval: NodeJS.Timeout | null = null
  private visibilityChangeHandler: (() => void) | null = null
  private beforeUnloadHandler: (() => void) | null = null
  private readonly UPDATE_INTERVAL_MS = 60000 // Update every 1 minute
  private accumulatedMinutes = 0

  /**
   * Start tracking a new session for the current user
   * Non-blocking: Fails silently if table doesn't exist to not block page loads
   */
  async startSession(userId: string): Promise<void> {
    // Don't start a new session if one is already active
    if (this.currentSession?.isActive) {
      console.log('Session already active, skipping start')
      return
    }

    try {
      // Create new session in database with timeout to prevent hanging
      const insertPromise = supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          session_start: new Date().toISOString(),
          duration_minutes: 0,
        })
        .select()
        .single()

      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
        setTimeout(() => resolve({ data: null, error: { message: 'Insert timeout' } }), 3000)
      })

      const { data, error } = await Promise.race([insertPromise, timeoutPromise])

      if (error) {
        // Silently fail - table might not exist yet, don't block the app
        console.warn('Session tracking unavailable:', error.message)
        return
      }

      if (!data) {
        console.warn('Session tracking: No data returned')
        return
      }

      // Store session info locally
      this.currentSession = {
        id: data.id,
        sessionStart: new Date(),
        lastUpdate: new Date(),
        isActive: true,
      }

      this.accumulatedMinutes = 0

      // Start periodic updates
      this.startPeriodicUpdates()

      // Add visibility change listener
      this.setupVisibilityHandler()

      // Add beforeunload listener for cleanup
      this.setupBeforeUnloadHandler()

      console.log('Session started:', this.currentSession.id)
    } catch (error) {
      // Silently fail - don't block the app if session tracking fails
      console.warn('Session tracking initialization failed:', error)
    }
  }

  /**
   * End the current session
   */
  async endSession(): Promise<void> {
    if (!this.currentSession?.isActive) {
      return
    }

    try {
      // Calculate final duration
      this.updateSessionDuration()

      // Mark session as ended in database
      const { error } = await supabase
        .from('user_sessions')
        .update({
          session_end: new Date().toISOString(),
          duration_minutes: this.accumulatedMinutes,
        })
        .eq('id', this.currentSession.id)

      if (error) {
        console.error('Error ending session:', error)
      }

      console.log('Session ended:', this.currentSession.id, 'Duration:', this.accumulatedMinutes, 'minutes')

      // Cleanup
      this.cleanup()
    } catch (error) {
      console.error('Error ending session:', error)
    }
  }

  /**
   * Pause session tracking (when tab becomes hidden)
   */
  private pauseSession(): void {
    if (!this.currentSession?.isActive) {
      return
    }

    // Update duration one last time before pausing
    this.updateSessionDuration()

    // Stop periodic updates
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }

    this.currentSession.isActive = false
    console.log('Session paused')
  }

  /**
   * Resume session tracking (when tab becomes visible)
   */
  private resumeSession(): void {
    if (!this.currentSession) {
      return
    }

    this.currentSession.isActive = true
    this.currentSession.lastUpdate = new Date()

    // Restart periodic updates
    this.startPeriodicUpdates()

    console.log('Session resumed')
  }

  /**
   * Update session duration in database
   */
  private updateSessionDuration(): void {
    if (!this.currentSession?.isActive) {
      return
    }

    const now = new Date()
    const minutesSinceLastUpdate = Math.floor(
      (now.getTime() - this.currentSession.lastUpdate.getTime()) / 60000
    )

    if (minutesSinceLastUpdate > 0) {
      this.accumulatedMinutes += minutesSinceLastUpdate
      this.currentSession.lastUpdate = now

      // Update database (fire and forget, don't block)
      supabase
        .from('user_sessions')
        .update({
          duration_minutes: this.accumulatedMinutes,
        })
        .eq('id', this.currentSession.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error updating session duration:', error)
          }
        })
    }
  }

  /**
   * Start periodic updates every minute
   */
  private startPeriodicUpdates(): void {
    // Clear any existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }

    this.updateInterval = setInterval(() => {
      this.updateSessionDuration()
    }, this.UPDATE_INTERVAL_MS)
  }

  /**
   * Setup visibility change handler to pause/resume tracking
   */
  private setupVisibilityHandler(): void {
    this.visibilityChangeHandler = () => {
      if (document.hidden) {
        this.pauseSession()
      } else {
        this.resumeSession()
      }
    }

    document.addEventListener('visibilitychange', this.visibilityChangeHandler)
  }

  /**
   * Setup beforeunload handler to save session before page closes
   */
  private setupBeforeUnloadHandler(): void {
    this.beforeUnloadHandler = () => {
      // Synchronously update session one last time
      if (this.currentSession?.isActive) {
        this.updateSessionDuration()
      }
    }

    window.addEventListener('beforeunload', this.beforeUnloadHandler)
  }

  /**
   * Cleanup all listeners and intervals
   */
  private cleanup(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }

    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler)
      this.visibilityChangeHandler = null
    }

    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler)
      this.beforeUnloadHandler = null
    }

    this.currentSession = null
    this.accumulatedMinutes = 0
  }

  /**
   * Get total time spent across all sessions for a user
   * Returns 0 if query fails or times out
   */
  async getTotalTimeSpent(userId: string): Promise<number> {
    try {
      // Simplified timeout with Promise.race
      const queryPromise = (async () => {
        const { data, error } = await supabase
          .from('user_sessions')
          .select('duration_minutes')
          .eq('user_id', userId)

        return { data, error }
      })()

      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
        setTimeout(() => resolve({ data: null, error: { message: 'Query timeout' } }), 3000)
      })

      const { data, error } = await Promise.race([queryPromise, timeoutPromise])

      if (error) {
        // Timeout or other error - just return 0
        console.warn('User sessions query issue:', error.message)
        return 0
      }

      if (!data || !Array.isArray(data)) {
        return 0
      }

      // Sum all session durations
      const totalMinutes = data.reduce((sum: number, session: any) => sum + (session.duration_minutes || 0), 0)
      return totalMinutes
    } catch (error: any) {
      console.warn('Error in getTotalTimeSpent:', error?.message || 'Unknown error')
      return 0
    }
  }

  /**
   * Format minutes into a human-readable string
   */
  formatDuration(totalMinutes: number): string {
    if (totalMinutes < 1) {
      return '< 1m'
    }

    const days = Math.floor(totalMinutes / (60 * 24))
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
    const minutes = totalMinutes % 60

    const parts: string[] = []

    if (days > 0) {
      parts.push(`${days}d`)
    }
    if (hours > 0) {
      parts.push(`${hours}h`)
    }
    if (minutes > 0 || parts.length === 0) {
      parts.push(`${minutes}m`)
    }

    return parts.join(' ')
  }
}

// Export singleton instance
export const sessionTrackingService = new SessionTrackingService()
