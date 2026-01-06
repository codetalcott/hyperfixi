/**
 * Hide Command Patterns
 *
 * Hand-crafted patterns for "hide" command across languages.
 * Used for visibility: hide #element
 */

import type { LanguagePattern } from '../../types';

import { getHidePatternsJa } from './ja';
import { getHidePatternsKo } from './ko';
import { getHidePatternsAr } from './ar';
import { getHidePatternsTr } from './tr';
import { getHidePatternsZh } from './zh';
import { getHidePatternsDe } from './de';

/**
 * Get hide patterns for a specific language.
 */
export function getHidePatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'ja':
      return getHidePatternsJa();
    case 'ko':
      return getHidePatternsKo();
    case 'ar':
      return getHidePatternsAr();
    case 'tr':
      return getHidePatternsTr();
    case 'zh':
      return getHidePatternsZh();
    case 'de':
      return getHidePatternsDe();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getHidePatternsJa } from './ja';
export { getHidePatternsKo } from './ko';
export { getHidePatternsAr } from './ar';
export { getHidePatternsTr } from './tr';
export { getHidePatternsZh } from './zh';
export { getHidePatternsDe } from './de';
