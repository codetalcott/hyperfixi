/**
 * Runtime Environment Adapter
 * Provides unified APIs across Node.js, Deno, and browsers
 */

// Ambient type declaration for Deno global (when available at runtime)
// Note: Not marked as optional because typeof checks ensure it exists before access
declare const Deno: {
  version: { deno: string };
  build: { os: string };
  readTextFile: (path: string) => Promise<string>;
  env: { get: (key: string) => string | undefined };
};

// ============================================================================
// Environment Detection
// ============================================================================

export const isDeno = typeof Deno !== 'undefined';
export const isNode = typeof process !== 'undefined' && process.versions?.node;
export const isBrowser = typeof window !== 'undefined';

// ============================================================================
// Runtime Information
// ============================================================================

export interface RuntimeInfo {
  name: 'deno' | 'node' | 'browser' | 'unknown';
  version: string;
  hasDOM: boolean;
  hasWebAPIs: boolean;
  hasFileSystem: boolean;
  hasNetworking: boolean;
  typescript: boolean;
  supportsESM: boolean;
  supportsWorkers: boolean;
}

export function getRuntimeInfo(): RuntimeInfo {
  const hasDOM = typeof document !== 'undefined';
  const hasWebAPIs = typeof fetch !== 'undefined';

  if (isDeno) {
    return {
      name: 'deno',
      version: Deno.version.deno,
      hasDOM: hasDOM,
      hasWebAPIs: true,
      hasFileSystem: true,
      hasNetworking: true,
      typescript: true,
      supportsESM: true,
      supportsWorkers: true,
    };
  }

  if (isNode) {
    return {
      name: 'node',
      version: process.version,
      hasDOM: hasDOM, // Could be true with jsdom
      hasWebAPIs: hasWebAPIs, // Node 18+ has fetch
      hasFileSystem: true,
      hasNetworking: true,
      typescript: false, // Runtime JavaScript, but may have TS tooling
      supportsESM: true,
      supportsWorkers: true,
    };
  }

  if (isBrowser) {
    return {
      name: 'browser',
      version: navigator.userAgent,
      hasDOM: true,
      hasWebAPIs: true,
      hasFileSystem: false,
      hasNetworking: true,
      typescript: false, // Runtime JavaScript
      supportsESM: true,
      supportsWorkers: true,
    };
  }

  return {
    name: 'unknown',
    version: 'unknown',
    hasDOM: hasDOM,
    hasWebAPIs: hasWebAPIs,
    hasFileSystem: false,
    hasNetworking: hasWebAPIs,
    typescript: false,
    supportsESM: true,
    supportsWorkers: false,
  };
}

// ============================================================================
// Universal APIs
// ============================================================================

/**
 * Universal console logging that works across environments
 */
export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(`[HyperFixi] ${message}`, ...args);
  },

  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[HyperFixi] ${message}`, ...args);
  },

  error: (message: string, ...args: unknown[]) => {
    console.error(`[HyperFixi] ${message}`, ...args);
  },

  debug: (message: string, ...args: unknown[]) => {
    if (isDeno && Deno.env.get('DEBUG') === 'hyperfixi') {
      console.log(`[HyperFixi Debug] ${message}`, ...args);
    } else if (isNode && process.env.DEBUG === 'hyperfixi') {
      console.log(`[HyperFixi Debug] ${message}`, ...args);
    }
  },
};

/**
 * Universal performance measurement
 */
export const performance = {
  now: (): number => {
    if (isDeno || isBrowser) {
      return globalThis.performance.now();
    } else if (isNode) {
      const [seconds, nanoseconds] = process.hrtime();
      return seconds * 1000 + nanoseconds / 1000000;
    }
    return Date.now();
  },

  mark: (name: string): void => {
    if (globalThis.performance?.mark) {
      globalThis.performance.mark(name);
    }
  },

  measure: (name: string, startMark?: string, endMark?: string): void => {
    if (globalThis.performance?.measure) {
      globalThis.performance.measure(name, startMark, endMark);
    }
  },
};

/**
 * Universal event system
 */
export class UniversalEventTarget {
  private listeners = new Map<string, Set<(event: any) => void>>();

  addEventListener(type: string, listener: (event: any) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (event: any) => void): void {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.delete(listener);
    }
  }

  dispatchEvent(event: { type: string; [key: string]: any }): boolean {
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          logger.error(`Error in event listener for ${event.type}:`, error);
        }
      });
      return true;
    }
    return false;
  }
}

// ============================================================================
// LLM Agent Metadata
// ============================================================================

/**
 * Provides runtime information optimized for LLM understanding
 */
export function getLLMRuntimeInfo() {
  const info = getRuntimeInfo();

  return {
    // Basic runtime info
    runtime: info.name,
    version: info.version,
    typescript: info.typescript,

    // Capabilities
    capabilities: {
      dom: info.hasDOM,
      webapis: info.hasWebAPIs,
      filesystem: info.hasFileSystem,
      networking: info.hasNetworking,
      workers: info.supportsWorkers,
      esm: info.supportsESM,
    },

    // Environment-specific features
    features: {
      // Deno-specific
      ...(isDeno && {
        permissions: 'explicit',
        builtinTypescript: true,
        standardLibrary: 'https://deno.land/std',
        jsr: true,
        denoDeploy: true,
      }),

      // Node.js-specific
      ...(isNode && {
        npm: true,
        packageJson: true,
        nodeModules: true,
        builtinModules: true,
      }),

      // Browser-specific
      ...(isBrowser && {
        dom: true,
        webapis: true,
        serviceWorkers: true,
        webAssembly: typeof WebAssembly !== 'undefined',
      }),
    },

    // Recommended patterns for this environment
    patterns: {
      imports: isDeno ? 'url-based' : isNode ? 'npm-based' : 'esm-based',
      testing: isDeno ? 'deno-test' : isNode ? 'vitest/jest' : 'web-test-runner',
      bundling: isDeno ? 'deno-bundle' : isNode ? 'vite/rollup' : 'native-esm',
    },
  };
}

// ============================================================================
// Conditional Imports Helper
// ============================================================================

/**
 * Helper for environment-specific imports
 */
export async function importForEnvironment<T>(imports: {
  deno?: () => Promise<T>;
  node?: () => Promise<T>;
  browser?: () => Promise<T>;
  fallback?: () => Promise<T>;
}): Promise<T> {
  if (isDeno && imports.deno) {
    return imports.deno();
  }

  if (isNode && imports.node) {
    return imports.node();
  }

  if (isBrowser && imports.browser) {
    return imports.browser();
  }

  if (imports.fallback) {
    return imports.fallback();
  }

  throw new Error('No suitable import found for current environment');
}
