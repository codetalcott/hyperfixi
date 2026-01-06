/**
 * Get Command Patterns (Multilingual)
 *
 * Hand-crafted patterns for "get" command across languages.
 */

import type { LanguagePattern } from '../../types';

import { getGetPatternsDe } from './de';
import { getGetPatternsJa } from './ja';
import { getGetPatternsKo } from './ko';
import { getGetPatternsAr } from './ar';
import { getGetPatternsIt } from './it';
import { getGetPatternsVi } from './vi';

/**
 * Get get patterns for a specific language.
 */
export function getGetPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'de':
      return getGetPatternsDe();
    case 'ja':
      return getGetPatternsJa();
    case 'ko':
      return getGetPatternsKo();
    case 'ar':
      return getGetPatternsAr();
    case 'it':
      return getGetPatternsIt();
    case 'vi':
      return getGetPatternsVi();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getGetPatternsDe } from './de';
export { getGetPatternsJa } from './ja';
export { getGetPatternsKo } from './ko';
export { getGetPatternsAr } from './ar';
export { getGetPatternsIt } from './it';
export { getGetPatternsVi } from './vi';
