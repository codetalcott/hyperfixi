/**
 * Debug Logging System
 *
 * Provides environment-aware debug logging for the framework.
 * Enable via DEBUG environment variable or programmatically.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  isEnabled(): boolean;
}

class DebugLogger {
  private enabled: boolean;
  private namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
    this.enabled = this.checkEnabled();
  }

  private checkEnabled(): boolean {
    // Check if running in Node.js
    if (typeof process !== 'undefined' && process.env) {
      const DEBUG = process.env.DEBUG || '';
      // Enable if DEBUG=* or DEBUG=framework:* or DEBUG=framework:namespace
      return (
        DEBUG === '*' ||
        DEBUG.includes('framework:*') ||
        DEBUG.includes(`framework:${this.namespace}`)
      );
    }
    return false;
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.enabled) return;

    const prefix = `[framework:${this.namespace}]`;
    const timestamp = new Date().toISOString();

    switch (level) {
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(`${timestamp} ${prefix} DEBUG:`, message, ...args);
        break;
      case 'info':
        // eslint-disable-next-line no-console
        console.info(`${timestamp} ${prefix} INFO:`, message, ...args);
        break;
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(`${timestamp} ${prefix} WARN:`, message, ...args);
        break;
      case 'error':
        // eslint-disable-next-line no-console
        console.error(`${timestamp} ${prefix} ERROR:`, message, ...args);
        break;
    }
  }

  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }

  /**
   * Check if logging is enabled for this namespace.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Programmatically enable logging for this namespace.
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Programmatically disable logging for this namespace.
   */
  disable(): void {
    this.enabled = false;
  }
}

/**
 * Create a logger for a specific namespace.
 *
 * @param namespace - Logger namespace (e.g., 'pattern-matcher', 'tokenizer')
 * @returns Logger instance
 *
 * @example
 * const logger = createLogger('pattern-matcher');
 * logger.debug('Matching pattern:', pattern.id);
 * logger.warn('Low confidence match:', confidence);
 */
export function createLogger(namespace: string): Logger {
  return new DebugLogger(namespace);
}

/**
 * No-op logger that does nothing.
 * Useful for disabling logging in production builds.
 */
export const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  isEnabled: () => false,
};
