/**
 * Show Command Patterns
 *
 * Hand-crafted patterns for "show" command across languages.
 * Used for visibility: show #element
 */

import type { LanguagePattern } from '../../types';

import { getShowPatternsJa } from './ja';
import { getShowPatternsKo } from './ko';
import { getShowPatternsAr } from './ar';
import { getShowPatternsTr } from './tr';
import { getShowPatternsZh } from './zh';
import { getShowPatternsDe } from './de';
import { getShowPatternsFr } from './fr';

/**
 * Get show patterns for a specific language.
 */
export function getShowPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'ja':
      return getShowPatternsJa();
    case 'ko':
      return getShowPatternsKo();
    case 'ar':
      return getShowPatternsAr();
    case 'tr':
      return getShowPatternsTr();
    case 'zh':
      return getShowPatternsZh();
    case 'de':
      return getShowPatternsDe();
    case 'fr':
      return getShowPatternsFr();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getShowPatternsJa } from './ja';
export { getShowPatternsKo } from './ko';
export { getShowPatternsAr } from './ar';
export { getShowPatternsTr } from './tr';
export { getShowPatternsZh } from './zh';
export { getShowPatternsDe } from './de';
export { getShowPatternsFr } from './fr';
