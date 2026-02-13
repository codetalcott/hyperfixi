/**
 * Prepend Command Patterns
 *
 * Hand-crafted patterns for "prepend" command across languages.
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

import type { LanguagePattern } from '../../types';

import { getPrependPatternsEn } from './en';
import { getPrependPatternsEs } from './es';
import { getPrependPatternsJa } from './ja';
import { getPrependPatternsKo } from './ko';

/**
 * Get prepend patterns for a specific language.
 */
export function getPrependPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'en':
      return getPrependPatternsEn();
    case 'es':
      return getPrependPatternsEs();
    case 'ja':
      return getPrependPatternsJa();
    case 'ko':
      return getPrependPatternsKo();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getPrependPatternsEn } from './en';
export { getPrependPatternsEs } from './es';
export { getPrependPatternsJa } from './ja';
export { getPrependPatternsKo } from './ko';

/**
 * Languages that have hand-crafted prepend patterns.
 */
export const prependPatternLanguages = ['en', 'es', 'ja', 'ko'];
