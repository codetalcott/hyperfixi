/**
 * Append Command Patterns
 *
 * Hand-crafted patterns for "append" command across languages.
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

import type { LanguagePattern } from '../../types';

import { getAppendPatternsEn } from './en';
import { getAppendPatternsEs } from './es';
import { getAppendPatternsJa } from './ja';
import { getAppendPatternsKo } from './ko';

/**
 * Get append patterns for a specific language.
 */
export function getAppendPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'en':
      return getAppendPatternsEn();
    case 'es':
      return getAppendPatternsEs();
    case 'ja':
      return getAppendPatternsJa();
    case 'ko':
      return getAppendPatternsKo();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getAppendPatternsEn } from './en';
export { getAppendPatternsEs } from './es';
export { getAppendPatternsJa } from './ja';
export { getAppendPatternsKo } from './ko';

/**
 * Languages that have hand-crafted append patterns.
 */
export const appendPatternLanguages = ['en', 'es', 'ja', 'ko'];
