/**
 * Pre-built Behaviors for HyperFixi
 *
 * Convenience behaviors that provide common patterns out of the box.
 * These can be registered with the runtime and installed using hyperscript.
 *
 * Available Behaviors:
 * - HistorySwap: Automatic popstate handling (re-fetch on back/forward)
 * - Boosted: Automatic AJAX links/forms (htmx boost pattern)
 *
 * @example
 *   import { registerHistorySwap, registerBoosted } from '@hyperfixi/core/behaviors';
 *
 *   // Register with runtime
 *   const registry = runtime.getBehaviorRegistry();
 *   registerHistorySwap(registry);
 *   registerBoosted(registry);
 *
 *   // Now use in hyperscript:
 *   // install HistorySwap(target: "#main")
 *   // install Boosted(target: "#content")
 */

// HistorySwap - Automatic popstate handling
export {
  createHistorySwap,
  registerHistorySwap,
  HistorySwapBehavior,
  historySwapHyperscript,
  type HistorySwapConfig,
  type HistorySwapInstance,
} from './history-swap';

// Boosted - Automatic AJAX links/forms
export {
  createBoosted,
  registerBoosted,
  BoostedBehavior,
  boostedHyperscript,
  type BoostedConfig,
  type BoostedInstance,
} from './boosted';

/**
 * Register all pre-built behaviors with a registry
 *
 * @param registry - Behavior registry (Map or object with set method)
 */
export function registerAllBehaviors(registry: Map<string, unknown> | any): void {
  // Import behavior registrations
  const { registerHistorySwap } = require('./history-swap');
  const { registerBoosted } = require('./boosted');

  registerHistorySwap(registry);
  registerBoosted(registry);
}
