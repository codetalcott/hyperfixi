/**
 * Pattern Builders
 *
 * Functions for building and generating patterns for specific languages.
 */

import type { LanguagePattern } from '../types';

// Import from subdirectories for tree-shaking
import { getTogglePatternsForLanguage } from './toggle/index';
import { getPutPatternsForLanguage } from './put/index';
import { getEventHandlerPatternsForLanguage } from './event-handler/index';
import { getGrammarTransformedPatternsForLanguage } from './grammar-transformed/index';

// Import new multilingual command patterns
import { getAddPatternsForLanguage } from './add/index';
import { getRemovePatternsForLanguage } from './remove/index';
import { getShowPatternsForLanguage } from './show/index';
import { getHidePatternsForLanguage } from './hide/index';
import { getSetPatternsForLanguage } from './set/index';
import { getGetPatternsForLanguage } from './get/index';
import { getIncrementPatternsForLanguage } from './increment/index';
import { getDecrementPatternsForLanguage } from './decrement/index';

// Import English-only patterns
import { getEnglishOnlyPatterns } from './languages/en';

// Import generator directly (not from barrel)
import { generatePatternsForLanguage } from '../generators/pattern-generator';

// Import registry functions for lazy loading support
import { getRegisteredLanguages, tryGetProfile } from '../registry';

// Lazy cache for generated patterns PER LANGUAGE
// Using per-language cache instead of global cache to support lazy loading
// where languages are registered one at a time
const _generatedPatternsPerLanguage = new Map<string, LanguagePattern[]>();

/**
 * Get all generated patterns (lazy loaded).
 * @deprecated Use getGeneratedPatternsForLanguage() for lazy loading support.
 */
export function getGeneratedPatterns(): LanguagePattern[] {
  // For backwards compatibility, generate for all currently registered languages
  const allPatterns: LanguagePattern[] = [];
  for (const lang of getRegisteredLanguages()) {
    allPatterns.push(...getGeneratedPatternsForLanguage(lang));
  }
  return allPatterns;
}

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
 */
export function buildPatternsForLanguage(language: string): LanguagePattern[] {
  const patterns: LanguagePattern[] = [];

  // 1. Hand-crafted patterns for this language
  patterns.push(...getTogglePatternsForLanguage(language));
  patterns.push(...getPutPatternsForLanguage(language));
  patterns.push(...getEventHandlerPatternsForLanguage(language));

  // 2. New multilingual command patterns (ja, ko, ar, tr, zh, de, etc.)
  patterns.push(...getAddPatternsForLanguage(language));
  patterns.push(...getRemovePatternsForLanguage(language));
  patterns.push(...getShowPatternsForLanguage(language));
  patterns.push(...getHidePatternsForLanguage(language));
  patterns.push(...getSetPatternsForLanguage(language));
  patterns.push(...getGetPatternsForLanguage(language));
  patterns.push(...getIncrementPatternsForLanguage(language));
  patterns.push(...getDecrementPatternsForLanguage(language));

  // 3. Grammar-transformed patterns (for SOV/VSO grammar output)
  patterns.push(...getGrammarTransformedPatternsForLanguage(language));

  // 4. English-only hand-crafted patterns
  if (language === 'en') {
    patterns.push(...getEnglishOnlyPatterns());
  }

  // 5. Generated patterns for this language (per-language cache supports lazy loading)
  const langGeneratedPatterns = getGeneratedPatternsForLanguage(language);
  patterns.push(...langGeneratedPatterns);

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
];

/**
 * Build patterns for all languages.
 * @deprecated Use getPatternsForLanguage() for tree-shaking.
 */
export function buildAllPatterns(): LanguagePattern[] {
  const all: LanguagePattern[] = [];
  for (const lang of handcraftedLanguages) {
    all.push(...buildPatternsForLanguage(lang));
  }
  return all;
}

/**
 * Get list of all supported languages.
 */
export function getHandcraftedLanguages(): readonly string[] {
  return handcraftedLanguages;
}
