/**
 * Decrement Command Patterns (Multilingual)
 *
 * Hand-crafted patterns for "decrement" command across languages.
 */

import type { LanguagePattern } from '../../types';

import { getDecrementPatternsDe } from './de';
import { getDecrementPatternsTr } from './tr';
import { getDecrementPatternsZh } from './zh';

/**
 * Get decrement patterns for a specific language.
 */
export function getDecrementPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'de':
      return getDecrementPatternsDe();
    case 'tr':
      return getDecrementPatternsTr();
    case 'zh':
      return getDecrementPatternsZh();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getDecrementPatternsDe } from './de';
export { getDecrementPatternsTr } from './tr';
export { getDecrementPatternsZh } from './zh';
