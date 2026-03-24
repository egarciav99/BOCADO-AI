/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures when external services are down
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, reject requests immediately
 * - HALF_OPEN: Testing if service recovered, allow limited requests
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  
  /** Time to wait before trying again (milliseconds) */
  resetTimeout: number;
  
  /** Name for logging purposes */
  name: string;
}

interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private nextAttemptTime: number = 0;
  
  constructor(private config: CircuitBreakerConfig) {}
  
  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error(`Circuit breaker [${this.config.name}] is OPEN. Service unavailable.`);
      }
      
      // Try to recover - move to HALF_OPEN
      this.state = 'HALF_OPEN';
      console.log(`[CircuitBreaker:${this.config.name}] Attempting recovery (HALF_OPEN)`);
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failureCount = 0;
    this.lastSuccessTime = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      console.log(`[CircuitBreaker:${this.config.name}] Service recovered, circuit CLOSED`);
    }
  }
  
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.config.resetTimeout;
      console.error(
        `[CircuitBreaker:${this.config.name}] Circuit OPEN after ${this.failureCount} failures. ` +
        `Will retry in ${Math.round(this.config.resetTimeout / 1000)}s`
      );
    }
  }
  
  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failureCount,
      successes: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
    };
  }
  
  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = 0;
    console.log(`[CircuitBreaker:${this.config.name}] Manually reset`);
  }
  
  /**
   * Check if circuit is open (service unavailable)
   */
  isOpen(): boolean {
    return this.state === 'OPEN' && Date.now() < this.nextAttemptTime;
  }
}

// ============================================
// PRE-CONFIGURED CIRCUIT BREAKERS
// ============================================

/** Circuit breaker for FatSecret API */
export const fatSecretCircuitBreaker = new CircuitBreaker({
  name: 'FatSecret',
  failureThreshold: 3, // Open after 3 consecutive failures
  resetTimeout: 30000, // Wait 30s before retry
});

/** Circuit breaker for Google Maps API */
export const googleMapsCircuitBreaker = new CircuitBreaker({
  name: 'GoogleMaps',
  failureThreshold: 3,
  resetTimeout: 30000,
});

/** Circuit breaker for Airtable API */
export const airtableCircuitBreaker = new CircuitBreaker({
  name: 'Airtable',
  failureThreshold: 3,
  resetTimeout: 60000, // Wait 1min for Airtable (slower to recover)
});

/** Circuit breaker for Gemini AI */
export const geminiCircuitBreaker = new CircuitBreaker({
  name: 'Gemini',
  failureThreshold: 2, // More aggressive for AI (expensive)
  resetTimeout: 60000,
});
