/**
 * Pattern Registry
 *
 * Pattern cache and lookup functions for the semantic parser.
 */

import type { LanguagePattern, ActionType } from '../types';
import { buildPatternsForLanguage, getHandcraftedLanguages } from './builders';

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
 *
 * Iterates the handcrafted-language list and collects patterns per language
 * via the non-deprecated `buildPatternsForLanguage()` path.
 */
function ensureAllPatterns(): LanguagePattern[] {
  if (_allPatterns === null) {
    const all: LanguagePattern[] = [];
    for (const lang of getHandcraftedLanguages()) {
      all.push(...buildPatternsForLanguage(lang));
    }
    _allPatterns = all;
  }
  return _allPatterns;
}

// =============================================================================
// Pattern Lookup
// =============================================================================

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
  const languages = new Set(ensureAllPatterns().map(p => p.language));
  return Array.from(languages);
}

/**
 * Get all supported commands.
 */
export function getSupportedCommands(): ActionType[] {
  const commands = new Set(ensureAllPatterns().map(p => p.command));
  return Array.from(commands) as ActionType[];
}

/**
 * Find a pattern by ID.
 */
export function getPatternById(id: string): LanguagePattern | undefined {
  return ensureAllPatterns().find(p => p.id === id);
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
  const patterns = ensureAllPatterns();

  for (const pattern of patterns) {
    byLanguage[pattern.language] = (byLanguage[pattern.language] || 0) + 1;
    byCommand[pattern.command] = (byCommand[pattern.command] || 0) + 1;
  }

  return {
    totalPatterns: patterns.length,
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
