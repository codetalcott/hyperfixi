/**
 * Show Command Patterns
 *
 * Hand-crafted patterns for "show" command across languages.
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

import type { LanguagePattern } from '../../types';

import { getShowPatternsAr } from './ar';
import { getShowPatternsBn } from './bn';
import { getShowPatternsDe } from './de';
import { getShowPatternsFr } from './fr';
import { getShowPatternsHi } from './hi';
import { getShowPatternsIt } from './it';
import { getShowPatternsJa } from './ja';
import { getShowPatternsKo } from './ko';
import { getShowPatternsMs } from './ms';
import { getShowPatternsPl } from './pl';
import { getShowPatternsRu } from './ru';
import { getShowPatternsTh } from './th';
import { getShowPatternsTr } from './tr';
import { getShowPatternsUk } from './uk';
import { getShowPatternsVi } from './vi';
import { getShowPatternsZh } from './zh';
import { getShowPatternsTl } from './tl';

/**
 * Get show patterns for a specific language.
 */
export function getShowPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'ar':
      return getShowPatternsAr();
    case 'bn':
      return getShowPatternsBn();
    case 'de':
      return getShowPatternsDe();
    case 'fr':
      return getShowPatternsFr();
    case 'hi':
      return getShowPatternsHi();
    case 'it':
      return getShowPatternsIt();
    case 'ja':
      return getShowPatternsJa();
    case 'ko':
      return getShowPatternsKo();
    case 'ms':
      return getShowPatternsMs();
    case 'pl':
      return getShowPatternsPl();
    case 'ru':
      return getShowPatternsRu();
    case 'th':
      return getShowPatternsTh();
    case 'tr':
      return getShowPatternsTr();
    case 'uk':
      return getShowPatternsUk();
    case 'vi':
      return getShowPatternsVi();
    case 'zh':
      return getShowPatternsZh();
    case 'tl':
      return getShowPatternsTl();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getShowPatternsAr } from './ar';
export { getShowPatternsBn } from './bn';
export { getShowPatternsDe } from './de';
export { getShowPatternsFr } from './fr';
export { getShowPatternsHi } from './hi';
export { getShowPatternsIt } from './it';
export { getShowPatternsJa } from './ja';
export { getShowPatternsKo } from './ko';
export { getShowPatternsMs } from './ms';
export { getShowPatternsPl } from './pl';
export { getShowPatternsRu } from './ru';
export { getShowPatternsTh } from './th';
export { getShowPatternsTr } from './tr';
export { getShowPatternsUk } from './uk';
export { getShowPatternsVi } from './vi';
export { getShowPatternsZh } from './zh';
export { getShowPatternsTl } from './tl';

/**
 * Languages that have hand-crafted show patterns.
 */
export const showPatternLanguages = ['ar', 'bn', 'de', 'fr', 'hi', 'it', 'ja', 'ko', 'ms', 'pl', 'ru', 'th', 'tr', 'uk', 'vi', 'zh', 'tl'];
