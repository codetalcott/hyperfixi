/**
 * Pattern Registry
 *
 * Central registry for all language patterns.
 * Provides lookup by language and command type.
 *
 * Architecture:
 * - builders.ts: Pattern building and generation logic
 * - registry.ts: Pattern cache and lookup functions
 * - languages/en/: English-only hand-crafted patterns
 * - {command}.ts: Consolidated per-command patterns (Phase 3.2)
 */

import type { LanguagePattern } from '../types';
import type { LanguageProfile } from '../generators/language-profiles';

// =============================================================================
// Re-exports from builders and registry
// =============================================================================

// Pattern building
export {
  buildPatternsForLanguage,
  buildAllPatterns,
  getGeneratedPatterns,
  getHandcraftedLanguages,
} from './builders';

// Pattern lookup and cache
export {
  allPatterns,
  getAllPatterns,
  getPatternsForLanguage,
  getPatternsForLanguageAndCommand,
  getSupportedLanguages,
  getSupportedCommands,
  getPatternById,
  getPatternStats,
  clearPatternCache,
} from './registry';

export type { PatternStats } from './registry';

// =============================================================================
// Re-exports from per-command pattern directories
// =============================================================================

// Per-command consolidated pattern files (Phase 3.2)
export { getTogglePatternsForLanguage } from './toggle';
export { getPutPatternsForLanguage } from './put';
export { getEventHandlerPatternsForLanguage } from './event-handler';
export { getGrammarTransformedPatternsForLanguage } from './grammar-transformed';

// Event handler utilities
export { eventNameTranslations, normalizeEventName } from './event-handler';

// =============================================================================
// Registry Pattern Generator Setup
// =============================================================================
// Set up the pattern generator for the registry so that non-English languages
// work correctly when using the full bundle. This enables the registry's
// getPatternsForLanguage to fall back to buildPatternsForLanguage when patterns
// aren't directly registered.

import { setPatternGenerator } from '../registry';
import { buildPatternsForLanguage } from './builders';

// Wrapper to match the registry's expected signature (profile -> patterns)
function patternGeneratorForProfile(profile: LanguageProfile): LanguagePattern[] {
  return buildPatternsForLanguage(profile.code);
}

// Register the pattern generator with the registry
// This allows the registry to generate patterns for any registered language
setPatternGenerator(patternGeneratorForProfile);

// =============================================================================
// Backwards Compatibility Notes
// =============================================================================
// NOTE: togglePatterns, putPatterns, eventHandlerPatterns arrays are NOT
// re-exported from this file to enable tree-shaking. Import them directly:
//   import { togglePatterns } from './patterns/toggle';
//   import { putPatterns } from './patterns/put';
//   import { eventHandlerPatterns } from './patterns/event-handler';
