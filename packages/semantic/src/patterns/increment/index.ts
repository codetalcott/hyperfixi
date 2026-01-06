/**
 * Increment Command Patterns (Multilingual)
 *
 * Hand-crafted patterns for "increment" command across languages.
 */

import type { LanguagePattern } from '../../types';

import { getIncrementPatternsDe } from './de';
import { getIncrementPatternsTr } from './tr';
import { getIncrementPatternsZh } from './zh';

/**
 * Get increment patterns for a specific language.
 */
export function getIncrementPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'de':
      return getIncrementPatternsDe();
    case 'tr':
      return getIncrementPatternsTr();
    case 'zh':
      return getIncrementPatternsZh();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getIncrementPatternsDe } from './de';
export { getIncrementPatternsTr } from './tr';
export { getIncrementPatternsZh } from './zh';
