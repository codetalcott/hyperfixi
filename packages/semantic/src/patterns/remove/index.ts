/**
 * Remove Command Patterns
 *
 * Hand-crafted patterns for "remove" command across languages.
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

import type { LanguagePattern } from '../../types';

import { getRemovePatternsAr } from './ar';
import { getRemovePatternsBn } from './bn';
import { getRemovePatternsHi } from './hi';
import { getRemovePatternsIt } from './it';
import { getRemovePatternsJa } from './ja';
import { getRemovePatternsKo } from './ko';
import { getRemovePatternsMs } from './ms';
import { getRemovePatternsPl } from './pl';
import { getRemovePatternsQu } from './qu';
import { getRemovePatternsRu } from './ru';
import { getRemovePatternsTh } from './th';
import { getRemovePatternsTl } from './tl';
import { getRemovePatternsTr } from './tr';
import { getRemovePatternsUk } from './uk';
import { getRemovePatternsVi } from './vi';
import { getRemovePatternsZh } from './zh';

/**
 * Get remove patterns for a specific language.
 */
export function getRemovePatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'ar':
      return getRemovePatternsAr();
    case 'bn':
      return getRemovePatternsBn();
    case 'hi':
      return getRemovePatternsHi();
    case 'it':
      return getRemovePatternsIt();
    case 'ja':
      return getRemovePatternsJa();
    case 'ko':
      return getRemovePatternsKo();
    case 'ms':
      return getRemovePatternsMs();
    case 'pl':
      return getRemovePatternsPl();
    case 'qu':
      return getRemovePatternsQu();
    case 'ru':
      return getRemovePatternsRu();
    case 'th':
      return getRemovePatternsTh();
    case 'tl':
      return getRemovePatternsTl();
    case 'tr':
      return getRemovePatternsTr();
    case 'uk':
      return getRemovePatternsUk();
    case 'vi':
      return getRemovePatternsVi();
    case 'zh':
      return getRemovePatternsZh();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getRemovePatternsAr } from './ar';
export { getRemovePatternsBn } from './bn';
export { getRemovePatternsHi } from './hi';
export { getRemovePatternsIt } from './it';
export { getRemovePatternsJa } from './ja';
export { getRemovePatternsKo } from './ko';
export { getRemovePatternsMs } from './ms';
export { getRemovePatternsPl } from './pl';
export { getRemovePatternsQu } from './qu';
export { getRemovePatternsRu } from './ru';
export { getRemovePatternsTh } from './th';
export { getRemovePatternsTl } from './tl';
export { getRemovePatternsTr } from './tr';
export { getRemovePatternsUk } from './uk';
export { getRemovePatternsVi } from './vi';
export { getRemovePatternsZh } from './zh';

/**
 * Languages that have hand-crafted remove patterns.
 */
export const removePatternLanguages = [
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
