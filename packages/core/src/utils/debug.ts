/**
 * Debug logging utility with environment-based control
 *
 * Usage:
 * - Browser: Set window.__HYPERFIXI_DEBUG__ = true in console, then reload
 * - Node.js: Set HYPERFIXI_DEBUG=true environment variable
 * - Build time: Dead code elimination removes all debug code in production
 *
 * @example
 * import { debug } from './utils/debug';
 * debug.command('SET command executing with:', input);
 * debug.event('pointerdown event fired on:', element);
 */

/**
 * Check if debugging is enabled across multiple sources:
 * 1. localStorage (persists across page reloads)
 * 2. window.__HYPERFIXI_DEBUG__ (session-level)
 * 3. process.env.HYPERFIXI_DEBUG (Node.js)
 */
function checkDebugEnabled(): boolean {
  // Check localStorage first (browser only, persists across reloads)
  if (typeof localStorage !== 'undefined') {
    try {
      const setting =
        localStorage.getItem('hyperfixi:debug') ||
        localStorage.getItem('lokascript:debug');
      if (setting === '*' || setting === 'true') return true;
      // Could also support namespace-specific: 'semantic,parser,evaluator'
    } catch {
      // localStorage might throw in some environments (e.g., private browsing)
    }
  }

  // Fallback to window flag (browser, session-level)
  if (typeof window !== 'undefined' && (window as any).__HYPERFIXI_DEBUG__) {
    return true;
  }

  // Node.js environment variable
  if (typeof process !== 'undefined' && process.env?.HYPERFIXI_DEBUG === 'true') {
    return true;
  }

  return false;
}

const isDebugEnabled = checkDebugEnabled();

/**
 * Debug flags for different subsystems
 * Set individual flags to false to disable specific debug categories
 */
export const DEBUG = {
  /** Command execution logs (🔧) */
  commands: isDebugEnabled,

  /** Event handler logs (🎯) */
  events: isDebugEnabled,

  /** Parser/tokenizer logs (📝) */
  parsing: isDebugEnabled,

  /** Expression evaluation logs (🔍) */
  expressions: isDebugEnabled,

  /** CSS/Style application logs (🎨) */
  styles: isDebugEnabled,

  /** Runtime internals (🚀) */
  runtime: isDebugEnabled,

  /** Repeat/loop command logs (🔁) */
  loops: isDebugEnabled,

  /** Wait/async command logs (⏳) */
  async: isDebugEnabled,
};

/**
 * Debug logging helpers with emoji prefixes
 * Only logs when corresponding DEBUG flag is enabled
 */
export const debug = {
  /** Log command execution details */
  command: (...args: any[]) => {
    if (DEBUG.commands) console.log('🔧', ...args);
  },

  /** Log event handler execution */
  event: (...args: any[]) => {
    if (DEBUG.events) console.log('🎯', ...args);
  },

  /** Log parsing operations */
  parse: (...args: any[]) => {
    if (DEBUG.parsing) console.log('📝', ...args);
  },

  /** Log expression evaluation */
  expr: (...args: any[]) => {
    if (DEBUG.expressions) console.log('🔍', ...args);
  },

  /** Log expression evaluation (alias for expr) */
  expressions: (...args: any[]) => {
    if (DEBUG.expressions) console.log('🔍', ...args);
  },

  /** Log CSS/style operations */
  style: (...args: any[]) => {
    if (DEBUG.styles) console.log('🎨', ...args);
  },

  /** Log runtime internals */
  runtime: (...args: any[]) => {
    if (DEBUG.runtime) console.log('🚀', ...args);
  },

  /** Log loop/repeat operations */
  loop: (...args: any[]) => {
    if (DEBUG.loops) console.log('🔁', ...args);
  },

  /** Log async/wait operations */
  async: (...args: any[]) => {
    if (DEBUG.async) console.log('⏳', ...args);
  },
};

/**
 * Group logging for hierarchical debug output
 */
export const debugGroup = {
  start: (label: string) => {
    if (isDebugEnabled) console.group(label);
  },

  end: () => {
    if (isDebugEnabled) console.groupEnd();
  },
};

/**
 * Debug control API for programmatic enable/disable
 * Survives minification and works in production builds
 */
export const debugControl = {
  /**
   * Enable debug logging (persists via localStorage)
   * Page must be reloaded for changes to take effect
   */
  enable(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('hyperfixi:debug', '*');
        console.log('HyperFixi debug logging enabled. Reload page to see detailed logs.');
      } catch (e) {
        console.warn('⚠️  Could not enable debug logging (localStorage unavailable):', e);
      }
    } else {
      console.warn(
        '⚠️  localStorage not available. Set window.__HYPERFIXI_DEBUG__ = true instead.'
      );
    }
  },

  /**
   * Disable debug logging (clears localStorage)
   * Page must be reloaded for changes to take effect
   */
  disable(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('hyperfixi:debug');
        localStorage.removeItem('lokascript:debug');
        console.log('HyperFixi debug logging disabled. Reload page.');
      } catch (e) {
        console.warn('⚠️  Could not disable debug logging:', e);
      }
    } else {
      console.warn(
        '⚠️  localStorage not available. Set window.__HYPERFIXI_DEBUG__ = false instead.'
      );
    }
  },

  /**
   * Check if debug logging is currently enabled
   */
  isEnabled(): boolean {
    return isDebugEnabled;
  },

  /**
   * Get current debug status and settings
   */
  status(): { enabled: boolean; source: string } {
    if (typeof localStorage !== 'undefined') {
      try {
        const setting =
          localStorage.getItem('hyperfixi:debug') ||
          localStorage.getItem('lokascript:debug');
        if (setting) {
          return { enabled: true, source: 'localStorage' };
        }
      } catch {
        // Fall through
      }
    }

    if (typeof window !== 'undefined' && (window as any).__HYPERFIXI_DEBUG__) {
      return { enabled: true, source: 'window.__HYPERFIXI_DEBUG__' };
    }

    if (typeof process !== 'undefined' && process.env?.HYPERFIXI_DEBUG === 'true') {
      return { enabled: true, source: 'process.env.HYPERFIXI_DEBUG' };
    }

    return { enabled: false, source: 'none' };
  },
};
