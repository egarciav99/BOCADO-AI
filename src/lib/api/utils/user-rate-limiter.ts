import { RateLimiter, RateLimitConfig, RateLimitResult } from "./rate-limiter-base";
import { FieldValue } from "firebase-admin/firestore";

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 5, // 5 requests per 10 minutes
  cooldownMs: 30 * 1000, // 30s minimum between requests
};

/**
 * User-based rate limiter (for authenticated endpoints).
 * Stores rate limit data per user ID in Firestore.
 * Also tracks "stuck" processes (requests that didn't complete properly).
 */
export class UserRateLimiter extends RateLimiter {
  private db: any;
  private stuckThresholdMs = 2 * 60 * 1000; // 2 minutes to consider a process stuck

  constructor(db: any, config: Partial<RateLimitConfig> = {}) {
    super({ ...DEFAULT_CONFIG, ...config });
    this.db = db;
  }

  protected getDocRef(userId: string) {
    return this.db.collection("rate_limit_v2").doc(userId);
  }

  /**
   * Check and clean up stuck processes (incomplete requests).
   * A process is considered stuck if it's been in progress for > 2 minutes.
   */
  async checkAndCleanupStuckProcess(userId: string): Promise<boolean> {
    const docRef = this.getDocRef(userId);
    const now = Date.now();

    try {
      const doc = await docRef.get();
      if (!doc.exists) return false;

      const { currentProcess } = doc.data();
      if (!currentProcess) return false;

      const processAge = now - currentProcess.startedAt;
      if (processAge > this.stuckThresholdMs) {
        await docRef.update({
          currentProcess: null,
          metadata: {
            cleanedUp: true,
            cleanupReason: "stuck_process",
            cleanupTime: new Date(),
          },
        });
        console.log(
          `🧹 Cleaned up stuck process for ${userId.substring(0, 8)}... (age: ${Math.round(processAge / 1000)}s)`,
        );
        return true;
      }
    } catch (error) {
      console.error("Error checking stuck process:", error);
    }

    return false;
  }

  /**
   * Mark a request process as started.
   */
  async markProcessStarted(userId: string, interactionId: string): Promise<void> {
    const docRef = this.getDocRef(userId);
    try {
      await docRef.update({
        currentProcess: {
          startedAt: Date.now(),
          interactionId,
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("Error marking process started:", error);
    }
  }

  /**
   * Mark a request process as completed.
   */
  async markProcessCompleted(userId: string): Promise<void> {
    const docRef = this.getDocRef(userId);
    const now = Date.now();

    try {
      await this.db.runTransaction(async (t: any) => {
        const doc = await t.get(docRef);
        if (!doc.exists) {
          t.set(docRef, {
            requests: [now],
            currentProcess: null,
            updatedAt: FieldValue.serverTimestamp(),
          });
          return;
        }

        const data = doc.data();
        const validRequests = (data.requests || [])
          .filter((ts: number) => now - ts < this.config.windowMs)
          .concat(now)
          .slice(-this.config.maxRequests);

        t.update(docRef, {
          requests: validRequests,
          currentProcess: null,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
    } catch (error) {
      console.error("Error marking process completed:", error);
    }
  }

  /**
   * Mark a request process as failed.
   */
  async markProcessFailed(userId: string, errorMessage?: string): Promise<void> {
    const docRef = this.getDocRef(userId);
    try {
      await docRef.update({
        currentProcess: null,
        lastError: {
          message: errorMessage || "Unknown error",
          at: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("Error marking process failed:", error);
    }
  }

  protected formatError(type: string, secondsLeft: number): string {
    if (type === "window_exceeded") {
      return `Limit of ${this.config.maxRequests} requests per ${this.config.windowMs / 60000} minutes. Retry in ${secondsLeft}s.`;
    }
    return `Please wait ${secondsLeft}s before trying again.`;
  }

  /**
   * Get current rate limit status for a user.
   */
  async getStatus(userId: string): Promise<{
    requestsInWindow: number;
    currentProcess?: { startedAt: number; interactionId: string };
    canRequest: boolean;
    nextAvailableAt?: number;
  } | null> {
    const docRef = this.getDocRef(userId);
    const now = Date.now();

    try {
      const doc = await docRef.get();
      if (!doc.exists) return null;

      const data = doc.data();
      const validRequests = (data?.requests || []).filter(
        (ts: number) => now - ts < this.config.windowMs,
      );

      let nextAvailableAt: number | undefined;

      if (data.currentProcess) {
        nextAvailableAt = data.currentProcess.startedAt + this.config.cooldownMs;
      } else if (validRequests.length >= this.config.maxRequests) {
        const oldestRequest = validRequests.length > 0 ? Math.min(...validRequests) : now;
        nextAvailableAt = oldestRequest + this.config.windowMs;
      } else if (validRequests.length > 0) {
        const lastRequest = Math.max(...validRequests);
        const cooldownEnd = lastRequest + this.config.cooldownMs;
        if (cooldownEnd > now) {
          nextAvailableAt = cooldownEnd;
        }
      }

      return {
        requestsInWindow: validRequests.length,
        currentProcess: data.currentProcess,
        canRequest: !data.currentProcess && validRequests.length < this.config.maxRequests,
        nextAvailableAt,
      };
    } catch (error) {
      console.error("Error getting status:", error);
      return null;
    }
  }

  /**
   * Alias for markProcessCompleted (backward compatibility).
   */
  async completeProcess(userId: string): Promise<void> {
    return this.markProcessCompleted(userId);
  }

  /**
   * Alias for markProcessFailed (backward compatibility).
   */
  async failProcess(userId: string, errorInfo?: string): Promise<void> {
    return this.markProcessFailed(userId, errorInfo);
  }
}
