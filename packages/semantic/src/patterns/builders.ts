/**
 * Pattern Builders
 *
 * Functions for building and generating patterns for specific languages.
 * Uses a registry-based approach for maintainability and extensibility.
 */

import type { LanguagePattern } from '../types';

// Consolidated command pattern files (Phase 3.2)
import { getTogglePatternsForLanguage } from './toggle';
import { getTakePatternsForLanguage } from './take';
import { getPutPatternsForLanguage } from './put';
import { getEventHandlerPatternsForLanguage } from './event-handler';
import { getGrammarTransformedPatternsForLanguage } from './grammar-transformed';
import { getAddPatternsForLanguage } from './add';
import { getRemovePatternsForLanguage } from './remove';
import { getShowPatternsForLanguage } from './show';
import { getHidePatternsForLanguage } from './hide';
import { getSetPatternsForLanguage } from './set';
import { getGetPatternsForLanguage } from './get';
import { getIncrementPatternsForLanguage } from './increment';
import { getDecrementPatternsForLanguage } from './decrement';
import { getWaitPatternsForLanguage } from './wait';
import { getFetchPatternsForLanguage } from './fetch';
import { getAppendPatternsForLanguage } from './append';
import { getPrependPatternsForLanguage } from './prepend';
import { getTriggerPatternsForLanguage } from './trigger';
import { getSendPatternsForLanguage } from './send';

// Import English-only patterns
import { getEnglishOnlyPatterns } from './languages/en';

// Import generator directly (not from barrel)
import { generatePatternsForLanguage } from '../generators/pattern-generator';

// Import registry functions for lazy loading support
import { tryGetProfile } from '../registry';

// =============================================================================
// Pattern Loader Registry
// =============================================================================

/**
 * Type for pattern loader functions.
 * Each loader returns patterns for a specific command/category for a given language.
 */
type PatternLoader = (language: string) => LanguagePattern[];

/**
 * Registry of all pattern loaders.
 * This replaces individual push() calls with a unified registry approach.
 * Order matters: hand-crafted patterns should come before generated patterns.
 */
const PATTERN_LOADERS: PatternLoader[] = [
  // Hand-crafted core patterns
  getTogglePatternsForLanguage,
  getTakePatternsForLanguage,
  getPutPatternsForLanguage,
  getEventHandlerPatternsForLanguage,

  // Multilingual command patterns
  getAddPatternsForLanguage,
  getRemovePatternsForLanguage,
  getShowPatternsForLanguage,
  getHidePatternsForLanguage,
  getSetPatternsForLanguage,
  getGetPatternsForLanguage,
  getIncrementPatternsForLanguage,
  getDecrementPatternsForLanguage,
  getWaitPatternsForLanguage,
  getFetchPatternsForLanguage,
  getAppendPatternsForLanguage,
  getPrependPatternsForLanguage,
  getTriggerPatternsForLanguage,
  getSendPatternsForLanguage,

  // Grammar-transformed patterns (for SOV/VSO grammar output)
  getGrammarTransformedPatternsForLanguage,
];

/**
 * Register a custom pattern loader.
 * Useful for plugins or extensions that add new command patterns.
 */
export function registerPatternLoader(loader: PatternLoader): void {
  PATTERN_LOADERS.push(loader);
}

/**
 * Get the current pattern loaders (for testing/introspection).
 */
export function getPatternLoaders(): readonly PatternLoader[] {
  return PATTERN_LOADERS;
}

// Lazy cache for generated patterns PER LANGUAGE
// Using per-language cache instead of global cache to support lazy loading
// where languages are registered one at a time
const _generatedPatternsPerLanguage = new Map<string, LanguagePattern[]>();

/**
 * Get generated patterns for a specific language.
 * This supports lazy loading scenarios where languages are registered one at a time.
 */
export function getGeneratedPatternsForLanguage(language: string): LanguagePattern[] {
  // Check per-language cache first
  const cached = _generatedPatternsPerLanguage.get(language);
  if (cached) {
    return cached;
  }

  // Get profile from registry
  const profile = tryGetProfile(language);
  if (!profile) {
    return [];
  }

  // Generate patterns for this language
  const patterns = generatePatternsForLanguage(profile);
  _generatedPatternsPerLanguage.set(language, patterns);
  return patterns;
}

/**
 * Clear the generated patterns cache for a language (useful for testing).
 */
export function clearGeneratedPatternsCache(language?: string): void {
  if (language) {
    _generatedPatternsPerLanguage.delete(language);
  } else {
    _generatedPatternsPerLanguage.clear();
  }
}

// =============================================================================
// Lazy Pattern Building
// =============================================================================

/**
 * Build patterns for a specific language.
 * This is the core function for tree-shakeable pattern loading.
 * Uses the PATTERN_LOADERS registry for maintainability.
 */
export function buildPatternsForLanguage(language: string): LanguagePattern[] {
  // Collect patterns from all registered loaders
  const patterns = PATTERN_LOADERS.flatMap(loader => loader(language));

  // Add English-only hand-crafted patterns
  if (language === 'en') {
    patterns.push(...getEnglishOnlyPatterns());
  }

  // Add generated patterns for this language (per-language cache supports lazy loading)
  patterns.push(...getGeneratedPatternsForLanguage(language));

  return patterns;
}

// Languages with hand-crafted patterns
const handcraftedLanguages = [
  'en',
  'ja',
  'ar',
  'es',
  'ko',
  'zh',
  'tr',
  'pt',
  'fr',
  'de',
  'id',
  'qu',
  'sw',
  'it',
  'vi',
  'pl',
  'ru',
  'uk',
  'hi',
  'bn',
  'th',
  'ms',
  'tl',
  'he',
];

/**
 * Get list of all supported languages.
 */
export function getHandcraftedLanguages(): readonly string[] {
  return handcraftedLanguages;
}
