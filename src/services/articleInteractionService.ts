import { supabase } from '@/integrations/supabase/client';

export type InteractionType =
  | 'view'
  | 'read'
  | 'abandon'
  | 'save'
  | 'share'
  | 'reading_level_change'
  | 'source_click'
  | 'copy'
  | 'debate_view';

export type ReadingLevel = 'eli5' | 'high_school' | 'college' | 'phd';

interface TrackInteractionParams {
  topic: string;
  actionType: InteractionType;
  readingLevel?: ReadingLevel;
  durationSeconds?: number;
  scrollDepth?: number;
  sourceOutlet?: string;
  metadata?: Record<string, any>;
}

// Circuit Breaker for tracking errors
class TrackingCircuitBreaker {
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly failureThreshold = 3;
  private readonly resetTimeout = 60000; // 1 minute
  private readonly halfOpenTimeout = 10000; // 10 seconds

  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.warn(
        `⚠️ Interaction tracking temporarily disabled after ${this.failureCount} failures. ` +
        `Will retry in ${this.resetTimeout / 1000}s. ` +
        `This usually means database schema is not deployed. ` +
        `See PERSONALIZATION_ERRORS_ANALYSIS.md for fix.`
      );
    } else {
      console.error(`Tracking error ${this.failureCount}/${this.failureThreshold}`);
    }
  }

  shouldAllowRequest(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }

    const timeSinceLastFailure = Date.now() - this.lastFailureTime;

    if (this.state === 'OPEN' && timeSinceLastFailure > this.resetTimeout) {
      this.state = 'HALF_OPEN';
      console.log('🔄 Attempting to resume interaction tracking...');
      return true;
    }

    if (this.state === 'HALF_OPEN') {
      return true;
    }

    return false; // Circuit is OPEN
  }

  getStatus(): string {
    return this.state;
  }
}

class ArticleInteractionTracker {
  private startTime: number | null = null;
  private scrollHandler: ((e: Event) => void) | null = null;
  private visibilityHandler: ((e: Event) => void) | null = null;
  private currentTopic: string | null = null;
  private currentReadingLevel: ReadingLevel = 'college';
  private maxScrollDepth: number = 0;
  private isTracking: boolean = false;
  private trackingTimeout: NodeJS.Timeout | null = null;
  private circuitBreaker: TrackingCircuitBreaker = new TrackingCircuitBreaker();

  /**
   * Start tracking an article view
   */
  startTracking(topic: string, readingLevel: ReadingLevel = 'college') {
    // Clean up any existing tracking
    this.stopTracking();

    this.currentTopic = topic;
    this.currentReadingLevel = readingLevel;
    this.startTime = Date.now();
    this.maxScrollDepth = 0;
    this.isTracking = true;

    // Track initial view
    this.trackInteraction({
      topic,
      actionType: 'view',
      readingLevel,
      metadata: {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        device: this.getDeviceType()
      }
    });

    // Set up scroll tracking
    this.setupScrollTracking();

    // Set up visibility tracking (for tab switches)
    this.setupVisibilityTracking();

    // Auto-mark as abandoned if user leaves quickly
    this.trackingTimeout = setTimeout(() => {
      if (this.isTracking && this.getDuration() < 10) {
        this.trackAbandon();
      }
    }, 10000);
  }

  /**
   * Stop tracking and finalize the session
   */
  stopTracking() {
    if (!this.isTracking) return;

    // Clear timeout
    if (this.trackingTimeout) {
      clearTimeout(this.trackingTimeout);
      this.trackingTimeout = null;
    }

    // Calculate final metrics
    const duration = this.getDuration();
    const scrollDepth = this.maxScrollDepth;

    // Determine if this was a read or abandon
    if (duration > 30 || scrollDepth > 0.5) {
      this.trackInteraction({
        topic: this.currentTopic!,
        actionType: 'read',
        readingLevel: this.currentReadingLevel,
        durationSeconds: duration,
        scrollDepth: scrollDepth
      });
    } else if (duration < 10) {
      this.trackInteraction({
        topic: this.currentTopic!,
        actionType: 'abandon',
        durationSeconds: duration,
        scrollDepth: scrollDepth
      });
    }

    // Clean up event listeners
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
      this.scrollHandler = null;
    }

    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    // Reset state
    this.isTracking = false;
    this.startTime = null;
    this.currentTopic = null;
    this.maxScrollDepth = 0;
  }

  /**
   * Track a reading level change
   */
  trackReadingLevelChange(newLevel: ReadingLevel) {
    if (!this.isTracking || !this.currentTopic) return;

    this.trackInteraction({
      topic: this.currentTopic,
      actionType: 'reading_level_change',
      readingLevel: newLevel,
      durationSeconds: this.getDuration(),
      scrollDepth: this.maxScrollDepth,
      metadata: {
        previousLevel: this.currentReadingLevel
      }
    });

    this.currentReadingLevel = newLevel;
  }

  /**
   * Track a source link click
   */
  trackSourceClick(sourceOutlet: string) {
    if (!this.currentTopic) return;

    this.trackInteraction({
      topic: this.currentTopic,
      actionType: 'source_click',
      sourceOutlet,
      durationSeconds: this.getDuration()
    });
  }

  /**
   * Track viewing an AI debate
   */
  trackDebateView() {
    if (!this.currentTopic) return;

    this.trackInteraction({
      topic: this.currentTopic,
      actionType: 'debate_view',
      durationSeconds: this.getDuration()
    });
  }

  /**
   * Track content copy
   */
  trackContentCopy() {
    if (!this.currentTopic) return;

    this.trackInteraction({
      topic: this.currentTopic,
      actionType: 'copy',
      durationSeconds: this.getDuration(),
      scrollDepth: this.maxScrollDepth
    });
  }

  /**
   * Core method to send interaction to backend with circuit breaker
   */
  private async trackInteraction(params: TrackInteractionParams) {
    // Check circuit breaker before attempting request
    if (!this.circuitBreaker.shouldAllowRequest()) {
      // Circuit is open, skip tracking silently
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('User not authenticated, skipping interaction tracking');
        return;
      }

      const response = await supabase.functions.invoke('track-interaction', {
        body: {
          topic: params.topic,
          action_type: params.actionType,
          reading_level: params.readingLevel,
          duration_seconds: params.durationSeconds,
          scroll_depth: params.scrollDepth,
          source_outlet: params.sourceOutlet,
          metadata: params.metadata
        }
      });

      if (response.error) {
        this.circuitBreaker.recordFailure();
      } else {
        this.circuitBreaker.recordSuccess();
        console.log('✅ Interaction tracked:', params.actionType);
      }
    } catch (error) {
      this.circuitBreaker.recordFailure();
    }
  }

  /**
   * Track abandonment (user left quickly)
   */
  private trackAbandon() {
    if (!this.currentTopic) return;

    this.trackInteraction({
      topic: this.currentTopic,
      actionType: 'abandon',
      durationSeconds: this.getDuration(),
      scrollDepth: this.maxScrollDepth
    });
  }

  /**
   * Set up scroll depth tracking
   */
  private setupScrollTracking() {
    this.scrollHandler = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = window.scrollY;
      const scrollDepth = scrollHeight > 0 ? scrolled / scrollHeight : 0;

      this.maxScrollDepth = Math.max(this.maxScrollDepth, Math.min(1, scrollDepth));
    };

    window.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  /**
   * Set up visibility tracking for tab switches
   */
  private setupVisibilityTracking() {
    let hiddenTime: number | null = null;

    this.visibilityHandler = () => {
      if (document.hidden) {
        hiddenTime = Date.now();
      } else if (hiddenTime && this.startTime) {
        // Subtract hidden time from duration
        const hiddenDuration = Date.now() - hiddenTime;
        this.startTime += hiddenDuration;
        hiddenTime = null;
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  /**
   * Get current session duration in seconds
   */
  private getDuration(): number {
    if (!this.startTime) return 0;
    return Math.round((Date.now() - this.startTime) / 1000);
  }

  /**
   * Detect device type
   */
  private getDeviceType(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone/i.test(userAgent)) {
      return 'mobile';
    } else if (/tablet|ipad/i.test(userAgent)) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }
}

// Create singleton instance
export const articleTracker = new ArticleInteractionTracker();

// Convenience functions for common operations
export async function trackArticleSave(topic: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const response = await supabase.functions.invoke('track-interaction', {
      body: {
        topic,
        action_type: 'save'
      }
    });

    if (response.error) {
      console.error('Failed to track save:', response.error);
    } else {
      console.log('✅ Save tracked for:', topic);
    }
  } catch (error) {
    console.error('Error tracking save:', error);
  }
}

export async function trackArticleShare(topic: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const response = await supabase.functions.invoke('track-interaction', {
      body: {
        topic,
        action_type: 'share'
      }
    });

    if (response.error) {
      console.error('Failed to track share:', response.error);
    } else {
      console.log('✅ Share tracked for:', topic);
    }
  } catch (error) {
    console.error('Error tracking share:', error);
  }
}

// Export circuit breaker status for debugging
export function getTrackingStatus(): string {
  return articleTracker['circuitBreaker']?.getStatus() || 'UNKNOWN';
}
