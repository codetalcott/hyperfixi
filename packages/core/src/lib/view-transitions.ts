/**
 * View Transitions API Integration
 *
 * Provides a transition queue to smoothly sequence DOM updates using the
 * View Transitions API. This prevents transition cancellation when multiple
 * swaps occur in quick succession (following htmx 4 pattern).
 *
 * Features:
 * - Automatic feature detection (graceful fallback when unsupported)
 * - Transition queue to prevent cancellation
 * - Promise-based API for await support
 * - Configurable global enable/disable
 *
 * @example
 * ```typescript
 * import { withViewTransition, isViewTransitionsSupported } from './view-transitions';
 *
 * // Simple usage
 * await withViewTransition(() => {
 *   target.innerHTML = newContent;
 * });
 *
 * // In swap command
 * swap #target with it using view transition
 * ```
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Callback function for DOM updates during transition
 */
export type TransitionCallback = () => void | Promise<void>;

/**
 * View Transition options
 */
export interface ViewTransitionOptions {
  /**
   * Skip transition and execute callback immediately
   * Useful for programmatic control
   */
  skipTransition?: boolean;

  /**
   * Transition name for CSS targeting
   * Maps to view-transition-name CSS property
   */
  transitionName?: string;

  /**
   * Timeout for transition in milliseconds
   * @default 5000
   */
  timeout?: number;
}

/**
 * Queued transition item
 */
interface QueuedTransition {
  callback: TransitionCallback;
  options: ViewTransitionOptions;
  resolve: (value: void | PromiseLike<void>) => void;
  reject: (reason?: any) => void;
}

// ============================================================================
// Feature Detection
// ============================================================================

/**
 * Check if View Transitions API is supported
 */
export function isViewTransitionsSupported(): boolean {
  return (
    typeof document !== 'undefined' && typeof (document as any).startViewTransition === 'function'
  );
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Global configuration for View Transitions
 */
export interface ViewTransitionsConfig {
  /**
   * Enable View Transitions globally
   * @default true (when supported)
   */
  enabled: boolean;

  /**
   * Default timeout for transitions
   * @default 5000
   */
  defaultTimeout: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug: boolean;
}

let config: ViewTransitionsConfig = {
  enabled: isViewTransitionsSupported(),
  defaultTimeout: 5000,
  debug: false,
};

/**
 * Configure View Transitions behavior
 */
export function configureViewTransitions(options: Partial<ViewTransitionsConfig>): void {
  config = { ...config, ...options };
}

/**
 * Get current configuration
 */
export function getViewTransitionsConfig(): ViewTransitionsConfig {
  return { ...config };
}

// ============================================================================
// Transition Queue
// ============================================================================

/**
 * Queue of pending transitions
 * Ensures transitions execute sequentially without cancellation
 */
let transitionQueue: QueuedTransition[] = [];
let isProcessingQueue = false;

/**
 * Process the next transition in the queue
 */
async function processQueue(): Promise<void> {
  if (isProcessingQueue || transitionQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (transitionQueue.length > 0) {
    const item = transitionQueue.shift()!;

    try {
      await executeTransition(item.callback, item.options);
      item.resolve();
    } catch (error) {
      item.reject(error);
    }
  }

  isProcessingQueue = false;
}

/**
 * Execute a single transition
 */
async function executeTransition(
  callback: TransitionCallback,
  options: ViewTransitionOptions
): Promise<void> {
  const { skipTransition = false, timeout = config.defaultTimeout } = options;

  // Skip transition if disabled, not supported, or explicitly skipped
  if (!config.enabled || !isViewTransitionsSupported() || skipTransition) {
    await callback();
    return;
  }

  // Create the view transition
  const transition = (document as any).startViewTransition(async () => {
    await callback();
  });

  // Wait for transition with timeout
  const timeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => reject(new Error('View transition timed out')), timeout);
  });

  try {
    await Promise.race([transition.finished, timeoutPromise]);
  } catch (error) {
    // Log timeout errors in debug mode but don't throw
    if (config.debug) {
      console.warn('[ViewTransitions] Transition timed out or failed:', error);
    }
    // Skip the transition but ensure callback was executed
    // The callback runs in startViewTransition, so it should be done
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Execute a DOM update with View Transitions
 *
 * Queues the transition to prevent cancellation when multiple swaps occur.
 * Falls back to immediate execution when View Transitions are not supported.
 *
 * @param callback - Function that performs DOM updates
 * @param options - Transition options
 * @returns Promise that resolves when transition completes
 *
 * @example
 * ```typescript
 * // Basic usage
 * await withViewTransition(() => {
 *   document.getElementById('content').innerHTML = newHtml;
 * });
 *
 * // With options
 * await withViewTransition(
 *   () => { target.innerHTML = content; },
 *   { transitionName: 'slide-in' }
 * );
 *
 * // Skip transition programmatically
 * await withViewTransition(updateDOM, { skipTransition: true });
 * ```
 */
export function withViewTransition(
  callback: TransitionCallback,
  options: ViewTransitionOptions = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    transitionQueue.push({
      callback,
      options,
      resolve,
      reject,
    });

    // Start processing queue
    processQueue().catch(reject);
  });
}

/**
 * Execute a DOM update with View Transitions (immediate, not queued)
 *
 * Use this when you need immediate execution without queue waiting.
 * Note: May cancel in-progress transitions.
 *
 * @param callback - Function that performs DOM updates
 * @param options - Transition options
 * @returns Promise that resolves when transition completes
 */
export async function withViewTransitionImmediate(
  callback: TransitionCallback,
  options: ViewTransitionOptions = {}
): Promise<void> {
  return executeTransition(callback, options);
}

/**
 * Clear the transition queue
 *
 * Useful for canceling pending transitions on navigation or cleanup.
 */
export function clearTransitionQueue(): void {
  // Reject all pending transitions
  for (const item of transitionQueue) {
    item.reject(new Error('Transition queue cleared'));
  }
  transitionQueue = [];
}

/**
 * Get the number of pending transitions
 */
export function getPendingTransitionCount(): number {
  return transitionQueue.length;
}

/**
 * Check if transitions are currently being processed
 */
export function isTransitioning(): boolean {
  return isProcessingQueue;
}

// ============================================================================
// CSS Helpers
// ============================================================================

/**
 * Apply a view-transition-name to an element
 *
 * This helps with CSS targeting for custom transition animations.
 *
 * @param element - Element to apply transition name to
 * @param name - Transition name (or null to remove)
 *
 * @example
 * ```typescript
 * // Before swap
 * setTransitionName(target, 'main-content');
 *
 * // In CSS:
 * // ::view-transition-old(main-content) { animation: slide-out 0.3s; }
 * // ::view-transition-new(main-content) { animation: slide-in 0.3s; }
 * ```
 */
export function setTransitionName(element: Element, name: string | null): void {
  if (name) {
    (element as HTMLElement).style.viewTransitionName = name;
  } else {
    (element as HTMLElement).style.viewTransitionName = '';
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  isSupported: isViewTransitionsSupported,
  configure: configureViewTransitions,
  getConfig: getViewTransitionsConfig,
  withTransition: withViewTransition,
  withTransitionImmediate: withViewTransitionImmediate,
  clearQueue: clearTransitionQueue,
  getPendingCount: getPendingTransitionCount,
  isTransitioning,
  setTransitionName,
};
