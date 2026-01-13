/**
 * Pattern Generator for prism-hyperfixi.
 *
 * Converts i18n dictionary keywords to Prism regex patterns.
 * Handles the difference between Latin scripts (word boundaries)
 * and non-Latin scripts (no boundaries needed).
 */

import { dictionaries } from '@hyperfixi/i18n';
import type { Dictionary } from '@hyperfixi/i18n';
import type { LanguagePatterns } from './types';
import { isNonLatinLanguage, getTextDirection } from './token-definitions';

/**
 * Cache of generated patterns per language.
 */
const patternCache = new Map<string, LanguagePatterns>();

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert a list of keywords to a regex pattern.
 *
 * - Latin scripts: Use `\b` word boundaries to prevent partial matches
 * - Non-Latin scripts: Simple alternation (characters are unambiguous)
 *
 * Keywords are sorted longest-first for greedy matching.
 */
function keywordsToPattern(keywords: string[], isNonLatin: boolean): RegExp {
  if (keywords.length === 0) {
    // Return a pattern that never matches
    return /(?!)/;
  }

  // Filter out empty strings and deduplicate
  const unique = [...new Set(keywords.filter(k => k && k.trim()))];

  // Sort longest-first for greedy matching
  const sorted = unique.sort((a, b) => b.length - a.length);

  // Escape regex special characters
  const escaped = sorted.map(escapeRegex);

  if (isNonLatin) {
    // Non-Latin: Simple alternation (no word boundaries needed)
    return new RegExp(`(${escaped.join('|')})`, 'g');
  } else {
    // Latin: Use word boundaries for accurate matching
    return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
  }
}

/**
 * Extract all values from a dictionary category.
 */
function getCategoryValues(dict: Dictionary, category: keyof Dictionary): string[] {
  const entries = dict[category];
  if (!entries || typeof entries !== 'object') {
    return [];
  }
  return Object.values(entries).filter((v): v is string => typeof v === 'string');
}

/**
 * Generate Prism patterns for a specific language.
 *
 * Patterns are cached for performance. Call `clearPatternCache()` to reset.
 */
export function generatePatterns(languageCode: string): LanguagePatterns {
  // Check cache first
  const cached = patternCache.get(languageCode);
  if (cached) {
    return cached;
  }

  // Get dictionary for this language
  const dict = dictionaries[languageCode];
  if (!dict) {
    throw new Error(
      `Unknown language: ${languageCode}. Available: ${Object.keys(dictionaries).join(', ')}`
    );
  }

  const isNonLatin = isNonLatinLanguage(languageCode);

  // Build patterns from dictionary categories
  const patterns: LanguagePatterns = {
    language: languageCode,
    direction: getTextDirection(languageCode),
    isNonLatin,
    patterns: {
      command: keywordsToPattern(getCategoryValues(dict, 'commands'), isNonLatin),
      modifier: keywordsToPattern(getCategoryValues(dict, 'modifiers'), isNonLatin),
      event: keywordsToPattern(getCategoryValues(dict, 'events'), isNonLatin),
      logical: keywordsToPattern(getCategoryValues(dict, 'logical'), isNonLatin),
      temporal: keywordsToPattern(getCategoryValues(dict, 'temporal'), isNonLatin),
      value: keywordsToPattern(getCategoryValues(dict, 'values'), isNonLatin),
      attribute: keywordsToPattern(getCategoryValues(dict, 'attributes'), isNonLatin),
      expression: keywordsToPattern(getCategoryValues(dict, 'expressions'), isNonLatin),
    },
  };

  // Cache for future use
  patternCache.set(languageCode, patterns);

  return patterns;
}

/**
 * Clear the pattern cache.
 * Useful for testing or when dictionaries are updated dynamically.
 */
export function clearPatternCache(): void {
  patternCache.clear();
}

/**
 * Get all keywords for a language as a flat array.
 * Useful for language detection.
 */
export function getAllKeywords(languageCode: string): string[] {
  const dict = dictionaries[languageCode];
  if (!dict) {
    return [];
  }

  const categories: (keyof Dictionary)[] = [
    'commands',
    'modifiers',
    'events',
    'logical',
    'temporal',
    'values',
    'attributes',
    'expressions',
  ];

  const allKeywords: string[] = [];
  for (const category of categories) {
    allKeywords.push(...getCategoryValues(dict, category));
  }

  return [...new Set(allKeywords)]; // Deduplicate
}

/**
 * Get all supported language codes.
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(dictionaries);
}

/**
 * Check if a language is supported.
 */
export function isLanguageSupported(languageCode: string): boolean {
  return languageCode in dictionaries;
}
