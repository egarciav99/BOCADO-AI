/**
 * Fetch wrapper that enforces timeouts on ALL external requests.
 * Prevents hanging requests from blocking your API.
 * 
 * Usage:
 * ```typescript
 * import { fetchWithTimeout, fetchJsonWithTimeout } from "./fetch-with-timeout";
 * 
 * // Basic fetch with timeout
 * const response = await fetchWithTimeout(url, { timeoutMs: 5000 });
 * 
 * // JSON fetch with timeout
 * const data = await fetchJsonWithTimeout<MyType>(url, { timeoutMs: 8000 });
 * ```
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Fetch with enforced timeout.
 * Throws AbortError if timeout is exceeded.
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const { timeoutMs = 5000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  }
}

/**
 * Fetch JSON with timeout and error handling.
 * Automatically parses JSON response.
 */
export async function fetchJsonWithTimeout<T = any>(
  url: string,
  options: FetchWithTimeoutOptions = {},
): Promise<T> {
  const { timeoutMs = 8000, ...fetchOptions } = options;

  const response = await fetchWithTimeout(url, {
    ...fetchOptions,
    timeoutMs,
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${response.statusText} - ${url}`
    );
  }

  return response.json() as Promise<T>;
}
