/**
 * Set Command Patterns (Multilingual)
 *
 * Hand-crafted patterns for "set" command across languages.
 * Used for variable assignment: set x to 5
 *
 * Note: English patterns are in languages/en/set.ts and handled separately.
 */

import type { LanguagePattern } from '../../types';

import { getSetPatternsJa } from './ja';
import { getSetPatternsKo } from './ko';
import { getSetPatternsAr } from './ar';
import { getSetPatternsTr } from './tr';
import { getSetPatternsZh } from './zh';
import { getSetPatternsEs } from './es';
import { getSetPatternsPt } from './pt';
import { getSetPatternsFr } from './fr';
import { getSetPatternsDe } from './de';
import { getSetPatternsId } from './id';
import { getSetPatternsIt } from './it';
import { getSetPatternsVi } from './vi';

/**
 * Get set patterns for a specific language.
 */
export function getSetPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'ja':
      return getSetPatternsJa();
    case 'ko':
      return getSetPatternsKo();
    case 'ar':
      return getSetPatternsAr();
    case 'tr':
      return getSetPatternsTr();
    case 'zh':
      return getSetPatternsZh();
    case 'es':
      return getSetPatternsEs();
    case 'pt':
      return getSetPatternsPt();
    case 'fr':
      return getSetPatternsFr();
    case 'de':
      return getSetPatternsDe();
    case 'id':
      return getSetPatternsId();
    case 'it':
      return getSetPatternsIt();
    case 'vi':
      return getSetPatternsVi();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getSetPatternsJa } from './ja';
export { getSetPatternsKo } from './ko';
export { getSetPatternsAr } from './ar';
export { getSetPatternsTr } from './tr';
export { getSetPatternsZh } from './zh';
export { getSetPatternsEs } from './es';
export { getSetPatternsPt } from './pt';
export { getSetPatternsFr } from './fr';
export { getSetPatternsDe } from './de';
export { getSetPatternsId } from './id';
export { getSetPatternsIt } from './it';
export { getSetPatternsVi } from './vi';
