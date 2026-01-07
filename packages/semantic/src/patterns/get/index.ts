/**
 * Get Command Patterns
 *
 * Hand-crafted patterns for "get" command across languages.
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

import type { LanguagePattern } from '../../types';

import { getGetPatternsAr } from './ar';
import { getGetPatternsBn } from './bn';
import { getGetPatternsDe } from './de';
import { getGetPatternsHi } from './hi';
import { getGetPatternsIt } from './it';
import { getGetPatternsJa } from './ja';
import { getGetPatternsKo } from './ko';
import { getGetPatternsMs } from './ms';
import { getGetPatternsPl } from './pl';
import { getGetPatternsRu } from './ru';
import { getGetPatternsTh } from './th';
import { getGetPatternsUk } from './uk';
import { getGetPatternsVi } from './vi';
import { getGetPatternsTl } from './tl';

/**
 * Get get patterns for a specific language.
 */
export function getGetPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'ar':
      return getGetPatternsAr();
    case 'bn':
      return getGetPatternsBn();
    case 'de':
      return getGetPatternsDe();
    case 'hi':
      return getGetPatternsHi();
    case 'it':
      return getGetPatternsIt();
    case 'ja':
      return getGetPatternsJa();
    case 'ko':
      return getGetPatternsKo();
    case 'ms':
      return getGetPatternsMs();
    case 'pl':
      return getGetPatternsPl();
    case 'ru':
      return getGetPatternsRu();
    case 'th':
      return getGetPatternsTh();
    case 'uk':
      return getGetPatternsUk();
    case 'vi':
      return getGetPatternsVi();
    case 'tl':
      return getGetPatternsTl();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getGetPatternsAr } from './ar';
export { getGetPatternsBn } from './bn';
export { getGetPatternsDe } from './de';
export { getGetPatternsHi } from './hi';
export { getGetPatternsIt } from './it';
export { getGetPatternsJa } from './ja';
export { getGetPatternsKo } from './ko';
export { getGetPatternsMs } from './ms';
export { getGetPatternsPl } from './pl';
export { getGetPatternsRu } from './ru';
export { getGetPatternsTh } from './th';
export { getGetPatternsUk } from './uk';
export { getGetPatternsVi } from './vi';
export { getGetPatternsTl } from './tl';

/**
 * Languages that have hand-crafted get patterns.
 */
export const getPatternLanguages = ['ar', 'bn', 'de', 'hi', 'it', 'ja', 'ko', 'ms', 'pl', 'ru', 'th', 'uk', 'vi', 'tl'];
