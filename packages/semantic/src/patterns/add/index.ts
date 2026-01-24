/**
 * Add Command Patterns
 *
 * Hand-crafted patterns for "add" command across languages.
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

import type { LanguagePattern } from '../../types';

import { getAddPatternsAr } from './ar';
import { getAddPatternsBn } from './bn';
import { getAddPatternsHi } from './hi';
import { getAddPatternsIt } from './it';
import { getAddPatternsJa } from './ja';
import { getAddPatternsKo } from './ko';
import { getAddPatternsMs } from './ms';
import { getAddPatternsPl } from './pl';
import { getAddPatternsQu } from './qu';
import { getAddPatternsRu } from './ru';
import { getAddPatternsTh } from './th';
import { getAddPatternsTl } from './tl';
import { getAddPatternsTr } from './tr';
import { getAddPatternsUk } from './uk';
import { getAddPatternsVi } from './vi';
import { getAddPatternsZh } from './zh';

/**
 * Get add patterns for a specific language.
 */
export function getAddPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'ar':
      return getAddPatternsAr();
    case 'bn':
      return getAddPatternsBn();
    case 'hi':
      return getAddPatternsHi();
    case 'it':
      return getAddPatternsIt();
    case 'ja':
      return getAddPatternsJa();
    case 'ko':
      return getAddPatternsKo();
    case 'ms':
      return getAddPatternsMs();
    case 'pl':
      return getAddPatternsPl();
    case 'qu':
      return getAddPatternsQu();
    case 'ru':
      return getAddPatternsRu();
    case 'th':
      return getAddPatternsTh();
    case 'tl':
      return getAddPatternsTl();
    case 'tr':
      return getAddPatternsTr();
    case 'uk':
      return getAddPatternsUk();
    case 'vi':
      return getAddPatternsVi();
    case 'zh':
      return getAddPatternsZh();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getAddPatternsAr } from './ar';
export { getAddPatternsBn } from './bn';
export { getAddPatternsHi } from './hi';
export { getAddPatternsIt } from './it';
export { getAddPatternsJa } from './ja';
export { getAddPatternsKo } from './ko';
export { getAddPatternsMs } from './ms';
export { getAddPatternsPl } from './pl';
export { getAddPatternsQu } from './qu';
export { getAddPatternsRu } from './ru';
export { getAddPatternsTh } from './th';
export { getAddPatternsTl } from './tl';
export { getAddPatternsTr } from './tr';
export { getAddPatternsUk } from './uk';
export { getAddPatternsVi } from './vi';
export { getAddPatternsZh } from './zh';

/**
 * Languages that have hand-crafted add patterns.
 */
export const addPatternLanguages = [
  'ar',
  'bn',
  'hi',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'qu',
  'ru',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
];
