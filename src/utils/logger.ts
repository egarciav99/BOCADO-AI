// Logger utility for Bocado AI
// Sanitizes logs in production to prevent data leaks

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

const config: LoggerConfig = {
  level: isDev ? 'debug' : 'warn', // Solo warn y error en producción
  enableConsole: true,
};

// Patterns que podrían indicar datos sensibles
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /api[_-]?key/i,
  /secret/i,
  /credential/i,
  /email/i,
  /uid[:\s=]/i,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // emails
];

const containsSensitiveData = (args: any[]): boolean => {
  const text = JSON.stringify(args).toLowerCase();
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(text));
};

const sanitizeArgs = (args: any[]): any[] => {
  if (isDev) return args;
  
  return args.map(arg => {
    if (typeof arg === 'string') {
      // Truncar strings largos
      return arg.length > 500 ? arg.substring(0, 500) + '...' : arg;
    }
    return arg;
  });
};

export const logger = {
  debug: (...args: any[]) => {
    if (LOG_LEVELS[config.level] > LOG_LEVELS.debug) return;
    if (!config.enableConsole) return;
    if (!isDev) return; // No debug en producción
    
    console.debug('[BOCADO:DEBUG]', ...sanitizeArgs(args));
  },
  
  info: (...args: any[]) => {
    if (LOG_LEVELS[config.level] > LOG_LEVELS.info) return;
    if (!config.enableConsole) return;
    
    if (containsSensitiveData(args) && !isDev) {
      console.info('[BOCADO:INFO]', '[Datos omitidos por seguridad]');
      return;
    }
    
    console.info('[BOCADO:INFO]', ...sanitizeArgs(args));
  },
  
  warn: (...args: any[]) => {
    if (LOG_LEVELS[config.level] > LOG_LEVELS.warn) return;
    if (!config.enableConsole) return;
    
    console.warn('[BOCADO:WARN]', ...sanitizeArgs(args));
  },
  
  error: (...args: any[]) => {
    if (LOG_LEVELS[config.level] > LOG_LEVELS.error) return;
    if (!config.enableConsole) return;
    
    // En producción, sanitizar errores
    if (!isDev && containsSensitiveData(args)) {
      console.error('[BOCADO:ERROR]', 'Error occurred (details hidden in production)');
      return;
    }
    
    console.error('[BOCADO:ERROR]', ...sanitizeArgs(args));
  },
  
  // Para errores que siempre deben loguearse (críticos)
  critical: (...args: any[]) => {
    console.error('[BOCADO:CRITICAL]', ...args);
  },
};

// Hook para logging en desarrollo
export const useLogger = (component: string) => {
  return {
    debug: (...args: any[]) => logger.debug(`[${component}]`, ...args),
    info: (...args: any[]) => logger.info(`[${component}]`, ...args),
    warn: (...args: any[]) => logger.warn(`[${component}]`, ...args),
    error: (...args: any[]) => logger.error(`[${component}]`, ...args),
  };
};

export default logger;
