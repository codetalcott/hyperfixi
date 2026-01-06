/**
 * Add Command Patterns
 *
 * Hand-crafted patterns for "add" command across languages.
 * Used for class manipulation: add .class to #element
 */

import type { LanguagePattern } from '../../types';

import { getAddPatternsJa } from './ja';
import { getAddPatternsKo } from './ko';
import { getAddPatternsAr } from './ar';
import { getAddPatternsTr } from './tr';
import { getAddPatternsZh } from './zh';
import { getAddPatternsIt } from './it';
import { getAddPatternsVi } from './vi';

/**
 * Get add patterns for a specific language.
 */
export function getAddPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'ja':
      return getAddPatternsJa();
    case 'ko':
      return getAddPatternsKo();
    case 'ar':
      return getAddPatternsAr();
    case 'tr':
      return getAddPatternsTr();
    case 'zh':
      return getAddPatternsZh();
    case 'it':
      return getAddPatternsIt();
    case 'vi':
      return getAddPatternsVi();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getAddPatternsJa } from './ja';
export { getAddPatternsKo } from './ko';
export { getAddPatternsAr } from './ar';
export { getAddPatternsTr } from './tr';
export { getAddPatternsZh } from './zh';
export { getAddPatternsIt } from './it';
export { getAddPatternsVi } from './vi';
