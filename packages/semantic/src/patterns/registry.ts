/**
 * Pattern Registry
 *
 * Pattern cache and lookup functions for the semantic parser.
 */

import type { LanguagePattern, ActionType } from '../types';
import { buildPatternsForLanguage, buildAllPatterns } from './builders';

// =============================================================================
// Pattern Cache
// =============================================================================

/**
 * Pattern cache for performance.
 * Maps language code to array of patterns for that language.
 */
const patternCache = new Map<string, LanguagePattern[]>();

// Lazy all patterns - only built when accessed
let _allPatterns: LanguagePattern[] | null = null;

/**
 * Ensure all patterns are built (lazy initialization).
 */
function ensureAllPatterns(): LanguagePattern[] {
  if (_allPatterns === null) {
    _allPatterns = buildAllPatterns();
  }
  return _allPatterns;
}

// =============================================================================
// All Patterns (Lazy Getter - for backwards compatibility)
// =============================================================================

/**
 * All registered patterns across all languages.
 * Uses a Proxy to lazily build patterns on first access.
 * @deprecated Since v1.3.0. Will be removed in v2.0.0. Use getPatternsForLanguage() for tree-shaking.
 */
export const allPatterns: LanguagePattern[] = new Proxy([] as LanguagePattern[], {
  get(_target, prop) {
    const arr = ensureAllPatterns();
    const value = Reflect.get(arr, prop);
    // Bind methods to the actual array, not the proxy target
    if (typeof value === 'function') {
      return value.bind(arr);
    }
    return value;
  },
  // Support iteration (for...of, spread operator)
  ownKeys() {
    return Reflect.ownKeys(ensureAllPatterns());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(ensureAllPatterns(), prop);
  },
});

// =============================================================================
// Pattern Lookup
// =============================================================================

/**
 * Get all patterns.
 * @deprecated Since v1.3.0. Will be removed in v2.0.0. Use getPatternsForLanguage() for tree-shaking.
 */
export function getAllPatterns(): LanguagePattern[] {
  if (_allPatterns === null) {
    _allPatterns = buildAllPatterns();
  }
  return _allPatterns;
}

/**
 * Get all patterns for a specific language.
 * Uses caching for performance.
 */
export function getPatternsForLanguage(language: string): LanguagePattern[] {
  // Check cache first
  if (patternCache.has(language)) {
    return patternCache.get(language)!;
  }

  // Build patterns for this language
  const patterns = buildPatternsForLanguage(language);
  patternCache.set(language, patterns);
  return patterns;
}

/**
 * Get patterns for a specific language and command.
 */
export function getPatternsForLanguageAndCommand(
  language: string,
  command: ActionType
): LanguagePattern[] {
  return getPatternsForLanguage(language)
    .filter(p => p.command === command)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Get all supported languages.
 */
export function getSupportedLanguages(): string[] {
  const languages = new Set(allPatterns.map(p => p.language));
  return Array.from(languages);
}

/**
 * Get all supported commands.
 */
export function getSupportedCommands(): ActionType[] {
  const commands = new Set(allPatterns.map(p => p.command));
  return Array.from(commands) as ActionType[];
}

/**
 * Find a pattern by ID.
 */
export function getPatternById(id: string): LanguagePattern | undefined {
  return allPatterns.find(p => p.id === id);
}

// =============================================================================
// Pattern Statistics (for debugging/tooling)
// =============================================================================

export interface PatternStats {
  totalPatterns: number;
  byLanguage: Record<string, number>;
  byCommand: Record<string, number>;
}

/**
 * Get statistics about registered patterns.
 */
export function getPatternStats(): PatternStats {
  const byLanguage: Record<string, number> = {};
  const byCommand: Record<string, number> = {};

  for (const pattern of allPatterns) {
    byLanguage[pattern.language] = (byLanguage[pattern.language] || 0) + 1;
    byCommand[pattern.command] = (byCommand[pattern.command] || 0) + 1;
  }

  return {
    totalPatterns: allPatterns.length,
    byLanguage,
    byCommand,
  };
}

/**
 * Clear the pattern cache.
 * Useful for testing or when language profiles change.
 */
export function clearPatternCache(): void {
  patternCache.clear();
  _allPatterns = null;
}
