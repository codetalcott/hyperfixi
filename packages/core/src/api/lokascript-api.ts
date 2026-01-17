/**
 * Lokascript API
 *
 * This is the primary API for HyperFixi's multilingual scripting language.
 *
 * Etymology: "loka" (Sanskrit/Indo-European: "world/realm/universe")
 * Reflects the multilingual scope - a scripting language that adapts to 23 different
 * linguistic structures (SOV, VSO, SVO word orders).
 *
 * This module re-exports the API with the new "lokascript" naming.
 * The underlying implementation remains in hyperscript-api.ts during the transition.
 */

import { hyperscript, _hyperscript, config } from './hyperscript-api.js';
import type { HyperscriptAPI } from './hyperscript-api.js';

/**
 * Main lokascript API
 *
 * Provides a clean, type-safe public interface for lokascript compilation and execution
 * across 23 languages with SOV/VSO/SVO grammar transformation.
 */
export const lokascript = hyperscript;

/**
 * Alias for official _hyperscript compatibility
 * (kept for backward compatibility with the original hyperscript ecosystem)
 */
export const _lokascript = _hyperscript;

/**
 * Re-export hyperscript for compatibility during transition
 * @deprecated Use lokascript instead
 */
export { hyperscript };

/**
 * Re-export config for convenience
 */
export { config };

/**
 * Type alias for the API interface
 */
export type LokascriptAPI = HyperscriptAPI;

// Re-export the types from the original module for convenience
export type {
  HyperscriptAPI,
  HyperscriptConfig,
  CompileResult,
  CompileError,
  NewCompileOptions,
  ValidateResult,
} from './hyperscript-api.js';
