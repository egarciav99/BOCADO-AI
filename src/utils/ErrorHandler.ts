/**
 * Unified Error Handler for consistent error management across the app
 * Handles timeouts, network errors, validation errors, and async failures
 */

type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low';
type ErrorContext = Record<string, any>;

export interface StandardError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  context: ErrorContext;
  timestamp: number;
  retryable: boolean;
  originalError?: Error;
}

/**
 * Known error codes with metadata
 */
const ERROR_CODES = {
  // Network/Timeout
  TIMEOUT: { message: 'Operación tardó demasiado', severity: 'high' as const, retryable: true },
  NETWORK_ERROR: { message: 'Error de conexión', severity: 'high' as const, retryable: true },
  FETCH_FAILED: { message: 'Fallo al obtener datos', severity: 'high' as const, retryable: true },
  ABORT: { message: 'Operación cancelada', severity: 'low' as const, retryable: false },

  // Auth
  AUTH_FAILED: { message: 'Error de autenticación', severity: 'critical' as const, retryable: false },
  AUTH_EXPIRED: { message: 'Sesión expirada', severity: 'high' as const, retryable: true },

  // Validation
  VALIDATION_ERROR: { message: 'Datos inválidos', severity: 'medium' as const, retryable: false },
  MISSING_FIELD: { message: 'Campo requerido faltante', severity: 'medium' as const, retryable: false },

  // Firestore
  FIRESTORE_WRITE_FAILED: {
    message: 'Error al guardar datos',
    severity: 'critical' as const,
    retryable: true,
  },
  FIRESTORE_READ_FAILED: {
    message: 'Error al leer datos',
    severity: 'high' as const,
    retryable: true,
  },

  // Rate Limiting
  RATE_LIMITED: {
    message: 'Demasiadas solicitudes. Intenta más tarde.',
    severity: 'medium' as const,
    retryable: true,
  },

  // Location
  GEOLOCATION_FAILED: {
    message: 'No se pudo obtener tu ubicación',
    severity: 'medium' as const,
    retryable: true,
  },
  GEOLOCATION_DENIED: {
    message: 'Permiso de ubicación denegado',
    severity: 'low' as const,
    retryable: false,
  },

  // Unknown
  UNKNOWN_ERROR: { message: 'Error desconocido', severity: 'high' as const, retryable: false },
} as const;

/**
 * Convert any error to StandardError format
 */
export function normalizeError(
  error: unknown,
  defaultCode: keyof typeof ERROR_CODES = 'UNKNOWN_ERROR',
  context: ErrorContext = {},
): StandardError {
  const timestamp = Date.now();
  const metadata = ERROR_CODES[defaultCode];

  // Handle standard Error objects
  if (error instanceof Error) {
    let code = defaultCode;
    let detectedMetadata = ERROR_CODES[defaultCode];

    // Detect error type from message or name
    if (error.name === 'AbortError' || error.message.includes('abort')) {
      code = 'ABORT';
    } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      code = 'TIMEOUT';
    } else if (error.message.includes('validation') || error.message.includes('Validation')) {
      code = 'VALIDATION_ERROR';
    } else if (error.message.includes('authentication') || error.message.includes('Unauthorized')) {
      code = 'AUTH_FAILED';
    } else if (error.message.includes('rate') || error.message.includes('limit')) {
      code = 'RATE_LIMITED';
    }

    detectedMetadata = ERROR_CODES[code];
    return {
      code,
      message: error.message || detectedMetadata.message,
      severity: detectedMetadata.severity,
      context,
      timestamp,
      retryable: detectedMetadata.retryable,
      originalError: error,
    };
  }

  // Handle network errors
  if (error instanceof Response) {
    const code = error.status === 429 ? 'RATE_LIMITED' : 'FETCH_FAILED';
    const metadata = ERROR_CODES[code];
    return {
      code,
      message: `HTTP ${error.status}: ${metadata.message}`,
      severity: metadata.severity,
      context: { ...context, status: error.status },
      timestamp,
      retryable: metadata.retryable,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    const stringMetadata = ERROR_CODES[defaultCode];
    return {
      code: defaultCode,
      message: error,
      severity: stringMetadata.severity,
      context,
      timestamp,
      retryable: stringMetadata.retryable,
    };
  }

  // Handle object errors
  if (typeof error === 'object' && error !== null) {
    const objMetadata = ERROR_CODES[defaultCode];
    return {
      code: defaultCode,
      message: (error as Record<string, any>).message || objMetadata.message,
      severity: objMetadata.severity,
      context: { ...context, ...(error as Record<string, any>) },
      timestamp,
      retryable: objMetadata.retryable,
      originalError: error instanceof Error ? error : undefined,
    };
  }

  // Fallback
  const fallbackMetadata = ERROR_CODES.UNKNOWN_ERROR;
  return {
    code: 'UNKNOWN_ERROR',
    message: fallbackMetadata.message,
    severity: fallbackMetadata.severity,
    context,
    timestamp,
    retryable: fallbackMetadata.retryable,
  };
}

/**
 * Get user-friendly error message (translated key)
 */
export function getErrorMessageKey(error: StandardError): string {
  const keyMap: Record<string, string> = {
    TIMEOUT: 'errors.timeout',
    NETWORK_ERROR: 'errors.network',
    FETCH_FAILED: 'errors.fetchFailed',
    ABORT: 'errors.cancelled',
    AUTH_FAILED: 'errors.authFailed',
    AUTH_EXPIRED: 'errors.sessionExpired',
    VALIDATION_ERROR: 'errors.validation',
    MISSING_FIELD: 'errors.missingField',
    FIRESTORE_WRITE_FAILED: 'errors.saveFailed',
    FIRESTORE_READ_FAILED: 'errors.loadFailed',
    RATE_LIMITED: 'errors.rateLimited',
    GEOLOCATION_FAILED: 'errors.locationFailed',
    GEOLOCATION_DENIED: 'errors.locationDenied',
    UNKNOWN_ERROR: 'errors.unknown',
  };

  return keyMap[error.code] || 'errors.unknown';
}

/**
 * Determine if error should be retried
 */
export function shouldRetry(error: StandardError, attempt: number = 1): boolean {
  if (!error.retryable) return false;
  if (attempt > 3) return false; // Max 3 retries
  return true;
}

/**
 * Get retry delay in milliseconds with exponential backoff
 */
export function getRetryDelay(attempt: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  const delay = baseDelay * Math.pow(2, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Wrap async function with automatic error handling, retry logic, and timeout
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: {
    timeout?: number;
    maxRetries?: number;
    onError?: (error: StandardError) => void;
    context?: ErrorContext;
  } = {},
): Promise<T> {
  const {
    timeout = 30000,
    maxRetries = 3,
    onError,
    context = {},
  } = options;

  let lastError: StandardError | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Operation timeout')),
            timeout,
          ),
        ),
      ]);
    } catch (error) {
      lastError = normalizeError(error, 'UNKNOWN_ERROR', {
        ...context,
        attempt,
        maxRetries,
      });

      if (onError) {
        onError(lastError);
      }

      if (!shouldRetry(lastError, attempt)) {
        throw lastError;
      }

      // Wait before retrying
      if (attempt < maxRetries) {
        await new Promise(resolve =>
          setTimeout(resolve, getRetryDelay(attempt)),
        );
      }
    }
  }

  throw lastError || normalizeError(new Error('Max retries exceeded'), 'UNKNOWN_ERROR', context);
}

export const ErrorHandler = {
  normalizeError,
  getErrorMessageKey,
  shouldRetry,
  getRetryDelay,
  executeWithRetry,
} as const;
