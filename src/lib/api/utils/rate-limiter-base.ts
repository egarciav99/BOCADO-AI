import { FieldValue } from "firebase-admin/firestore";

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests allowed in window
  cooldownMs?: number; // Minimum time between requests (optional)
}

export interface RateLimitResult {
  allowed: boolean;
  secondsLeft?: number;
  error?: string;
  remainingRequests?: number;
}

/**
 * Abstract rate limiter for different identifier types (IP, userID, etc).
 * Implements common logic to prevent duplication across API endpoints.
 * 
 * Subclasses must implement:
 * - getDocRef(): Returns where to store rate limit data in Firestore
 * - formatError(): Optional - customize error messages
 */
export abstract class RateLimiter {
  protected config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      ...config,
      cooldownMs: config.cooldownMs || 0,
    };
  }

  /**
   * Get Firestore document reference for this identifier.
   * Subclasses implement where to store (rate_limit_v2, maps_proxy_rate_limits, etc)
   */
  protected abstract getDocRef(identifier: string): any;

  /**
   * Check if request is allowed and record it.
   * Uses Firestore transactions for atomicity.
   */
  async checkRateLimit(identifier: string): Promise<RateLimitResult> {
    const docRef = this.getDocRef(identifier);
    const now = Date.now();

    try {
      // Get the Firestore database from docRef
      const db = docRef.firestore || docRef.parent.parent;

      return await db.runTransaction(async (t: any) => {
        const doc = await t.get(docRef);
        const data = doc.exists ? doc.data() : null;

        // Filter requests that are still within the current window
        const validRequests = (data?.requests || []).filter(
          (ts: number) => now - ts < this.config.windowMs,
        );

        // Check if exceeded max requests
        if (validRequests.length >= this.config.maxRequests) {
          const oldestRequest = Math.min(...validRequests);
          const retryAfter = Math.ceil(
            (oldestRequest + this.config.windowMs - now) / 1000,
          );
          return {
            allowed: false,
            secondsLeft: Math.max(1, retryAfter),
            error: this.formatError("window_exceeded", retryAfter),
            remainingRequests: 0,
          };
        }

        // Check cooldown between requests (if configured)
        if (this.config.cooldownMs > 0 && validRequests.length > 0) {
          const lastRequest = Math.max(...validRequests);
          const timeSinceLastRequest = now - lastRequest;

          if (timeSinceLastRequest < this.config.cooldownMs) {
            const secondsLeft = Math.ceil(
              (this.config.cooldownMs - timeSinceLastRequest) / 1000,
            );
            return {
              allowed: false,
              secondsLeft,
              error: this.formatError("cooldown", secondsLeft),
              remainingRequests: this.config.maxRequests - validRequests.length,
            };
          }
        }

        // ✅ Request is allowed - record it
        t.set(docRef, {
          requests: [...validRequests, now],
          updatedAt: FieldValue.serverTimestamp(),
          metadata: {
            lastCheck: now,
            windowSize: this.config.windowMs,
            maxRequests: this.config.maxRequests,
          },
        });

        return {
          allowed: true,
          remainingRequests: this.config.maxRequests - validRequests.length - 1,
        };
      });
    } catch (error) {
      console.error("Rate limit check error:", error);
      // FAIL-CLOSED: Deny on any error for security
      return {
        allowed: false,
        error: "Rate limit service unavailable",
      };
    }
  }

  /**
   * Format error message (override in subclass for custom messages).
   */
  protected formatError(type: string, secondsLeft: number): string {
    if (type === "window_exceeded") {
      return `Too many requests. Please retry in ${secondsLeft}s.`;
    }
    return `Please wait ${secondsLeft}s before trying again.`;
  }
}
