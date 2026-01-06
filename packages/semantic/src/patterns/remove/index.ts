/**
 * Remove Command Patterns
 *
 * Hand-crafted patterns for "remove" command across languages.
 * Used for class manipulation: remove .class from #element
 */

import type { LanguagePattern } from '../../types';

import { getRemovePatternsJa } from './ja';
import { getRemovePatternsKo } from './ko';
import { getRemovePatternsAr } from './ar';
import { getRemovePatternsTr } from './tr';
import { getRemovePatternsZh } from './zh';
import { getRemovePatternsIt } from './it';
import { getRemovePatternsVi } from './vi';

/**
 * Get remove patterns for a specific language.
 */
export function getRemovePatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'ja':
      return getRemovePatternsJa();
    case 'ko':
      return getRemovePatternsKo();
    case 'ar':
      return getRemovePatternsAr();
    case 'tr':
      return getRemovePatternsTr();
    case 'zh':
      return getRemovePatternsZh();
    case 'it':
      return getRemovePatternsIt();
    case 'vi':
      return getRemovePatternsVi();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getRemovePatternsJa } from './ja';
export { getRemovePatternsKo } from './ko';
export { getRemovePatternsAr } from './ar';
export { getRemovePatternsTr } from './tr';
export { getRemovePatternsZh } from './zh';
export { getRemovePatternsIt } from './it';
export { getRemovePatternsVi } from './vi';
