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
import { getRepeatPatternsForLanguage } from './repeat';
import { getAppendPatternsForLanguage } from './append';
import { getPrependPatternsForLanguage } from './prepend';
import { getTriggerPatternsForLanguage } from './trigger';
import { getSendPatternsForLanguage } from './send';
import { getPickPatternsForLanguage } from './pick';

// Import English-only patterns
import { getEnglishOnlyPatterns } from './languages/en';

// Import generator directly (not from barrel)
import { generatePatternsForLanguage } from '../generators/pattern-generator';
import { getSchema } from '../generators/command-schemas';
import type { ActionType, ExtractionRule } from '../types';

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
  getRepeatPatternsForLanguage,
  getAppendPatternsForLanguage,
  getPrependPatternsForLanguage,
  getTriggerPatternsForLanguage,
  getSendPatternsForLanguage,
  getPickPatternsForLanguage,

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

  return patterns.map(inheritSchemaDefaults);
}

/**
 * Roles whose schema default is inherited only by the GENERATED patterns that
 * declare them. `on.source` is the one exclusion: only a minority of the `on`
 * patterns in every language (English included) carry the default, so
 * inheriting it here would materialize an implicit `source: me` on ~2800
 * patterns at once — a corpus-wide change with nothing asking for it. The
 * asymmetry is symmetric across languages, so it costs no fidelity signal.
 */
const DEFAULT_INHERITANCE_EXCLUSIONS: ReadonlySet<string> = new Set(['on.source']);

/**
 * Give a hand-crafted pattern the schema defaults the generated ones already get.
 *
 * `generatePattern` runs every optional role with a `default` through
 * `buildExtractionRulesWithDefaults`, so a generated pattern that does not
 * capture, say, `toggle.destination` still materializes the schema's implicit
 * `me` (`applyExtractionRules` tags it `implicit: true`). The hand-crafted
 * patterns in `src/patterns/*.ts` hand-write their `extraction` maps and had
 * simply never been given those defaults, so which pattern won a match decided
 * whether the implicit role existed: `.active কে টগল` (generated) kept
 * `toggle.destination`, `.active কে টগল করুন` (`toggle-bn-full`, hand-crafted)
 * dropped it. That is invisible to a bare-command gate — the English round-trip
 * is identical either way — and shows up only as an R1 role-set difference
 * against the English reference, which is where the `i18n-kept-rows` ratchet
 * found it (bn/de/qu/hi/th/zh toggle, add, remove, increment, decrement).
 *
 * Inheritance never overrides: a rule that already declares a `default` (or a
 * static `value`) keeps it, and a role the pattern actually captures is
 * unaffected — `applyExtractionRules` consults `default` only when nothing was
 * captured.
 */
function inheritSchemaDefaults(pattern: LanguagePattern): LanguagePattern {
  const schema = getSchema(pattern.command as ActionType);
  if (!schema) return pattern;

  let extraction: Record<string, ExtractionRule> | undefined;
  for (const roleSpec of schema.roles) {
    if (roleSpec.required || !roleSpec.default) continue;
    if (DEFAULT_INHERITANCE_EXCLUSIONS.has(`${pattern.command}.${roleSpec.role}`)) continue;
    const existing = (pattern.extraction as Record<string, ExtractionRule> | undefined)?.[
      roleSpec.role
    ];
    if (existing?.default !== undefined || existing?.value !== undefined) continue;
    extraction ??= { ...(pattern.extraction as Record<string, ExtractionRule>) };
    extraction[roleSpec.role] = { ...existing, default: roleSpec.default };
  }

  return extraction ? { ...pattern, extraction } : pattern;
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
