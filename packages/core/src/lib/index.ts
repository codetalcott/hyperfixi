/**
 * Library modules for htmx-like features
 *
 * These modules provide pluggable implementations for:
 * - DOM morphing (morphlex)
 * - View Transitions API
 */

// Morph Adapter - thin wrapper over morphlex
export { morphAdapter, type MorphOptions } from './morph-adapter';

// View Transitions API integration
export {
  withViewTransition,
  isViewTransitionsSupported,
  type TransitionCallback,
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
