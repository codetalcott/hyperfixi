/**
 * Put Command Patterns
 *
 * Hand-crafted patterns for "put" command across languages.
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

import type { LanguagePattern } from '../../types';

import { getPutPatternsAr } from './ar';
import { getPutPatternsBn } from './bn';
import { getPutPatternsEn } from './en';
import { getPutPatternsEs } from './es';
import { getPutPatternsHi } from './hi';
import { getPutPatternsId } from './id';
import { getPutPatternsIt } from './it';
import { getPutPatternsJa } from './ja';
import { getPutPatternsKo } from './ko';
import { getPutPatternsMs } from './ms';
import { getPutPatternsPl } from './pl';
import { getPutPatternsRu } from './ru';
import { getPutPatternsTh } from './th';
import { getPutPatternsTl } from './tl';
import { getPutPatternsTr } from './tr';
import { getPutPatternsUk } from './uk';
import { getPutPatternsVi } from './vi';
import { getPutPatternsZh } from './zh';

/**
 * Get put patterns for a specific language.
 */
export function getPutPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'ar':
      return getPutPatternsAr();
    case 'bn':
      return getPutPatternsBn();
    case 'en':
      return getPutPatternsEn();
    case 'es':
      return getPutPatternsEs();
    case 'hi':
      return getPutPatternsHi();
    case 'id':
      return getPutPatternsId();
    case 'it':
      return getPutPatternsIt();
    case 'ja':
      return getPutPatternsJa();
    case 'ko':
      return getPutPatternsKo();
    case 'ms':
      return getPutPatternsMs();
    case 'pl':
      return getPutPatternsPl();
    case 'ru':
      return getPutPatternsRu();
    case 'th':
      return getPutPatternsTh();
    case 'tl':
      return getPutPatternsTl();
    case 'tr':
      return getPutPatternsTr();
    case 'uk':
      return getPutPatternsUk();
    case 'vi':
      return getPutPatternsVi();
    case 'zh':
      return getPutPatternsZh();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getPutPatternsAr } from './ar';
export { getPutPatternsBn } from './bn';
export { getPutPatternsEn } from './en';
export { getPutPatternsEs } from './es';
export { getPutPatternsHi } from './hi';
export { getPutPatternsId } from './id';
export { getPutPatternsIt } from './it';
export { getPutPatternsJa } from './ja';
export { getPutPatternsKo } from './ko';
export { getPutPatternsMs } from './ms';
export { getPutPatternsPl } from './pl';
export { getPutPatternsRu } from './ru';
export { getPutPatternsTh } from './th';
export { getPutPatternsTl } from './tl';
export { getPutPatternsTr } from './tr';
export { getPutPatternsUk } from './uk';
export { getPutPatternsVi } from './vi';
export { getPutPatternsZh } from './zh';

/**
 * Languages that have hand-crafted put patterns.
 */
export const putPatternLanguages = [
  'ar',
  'bn',
  'en',
  'es',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'ru',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
];
