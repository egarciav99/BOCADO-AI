import { RateLimiter, RateLimitConfig } from "./rate-limiter-base";

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute for unauthenticated
};

/**
 * IP-based rate limiter (for unauthenticated or public endpoints).
 * Stores rate limit data per IP address in Firestore.
 */
export class IPRateLimiter extends RateLimiter {
  private db: any;

  constructor(db: any, config: Partial<RateLimitConfig> = {}) {
    super({ ...DEFAULT_CONFIG, ...config });
    this.db = db;
  }

  protected getDocRef(ip: string) {
    return this.db.collection("rate_limits_ip").doc(ip);
  }

  protected formatError(type: string, secondsLeft: number): string {
    if (type === "window_exceeded") {
      return `Too many requests from this IP. Please retry in ${secondsLeft}s.`;
    }
    return `Please wait ${secondsLeft}s before trying again.`;
  }
}
