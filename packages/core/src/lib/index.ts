/**
 * Library modules for htmx-like features
 *
 * These modules provide pluggable implementations for:
 * - DOM morphing (morphlex/idiomorph)
 * - View Transitions API
 */

// Morph Adapter - Pluggable DOM morphing
export {
  morphAdapter,
  setMorphEngine,
  getMorphEngine,
  resetMorphEngine,
  type MorphEngine,
  type MorphOptions,
} from './morph-adapter';

// View Transitions API integration
export {
  withViewTransition,
  withViewTransitionImmediate,
  isViewTransitionsSupported,
  configureViewTransitions,
  getViewTransitionsConfig,
  clearTransitionQueue,
  getPendingTransitionCount,
  isTransitioning,
  setTransitionName,
  type TransitionCallback,
  type ViewTransitionOptions,
  type ViewTransitionsConfig,
} from './view-transitions';

// Swap Executor - Shared DOM swap execution logic
export {
  executeSwap,
  executeSwapWithTransition,
  extractContent,
  detectStrategy,
  STRATEGY_KEYWORDS,
  type SwapStrategy,
  type SwapExecutionOptions,
} from './swap-executor';
