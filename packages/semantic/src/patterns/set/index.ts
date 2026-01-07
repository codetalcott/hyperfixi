/**
 * Set Command Patterns
 *
 * Hand-crafted patterns for "set" command across languages.
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

import type { LanguagePattern } from '../../types';

import { getSetPatternsAr } from './ar';
import { getSetPatternsBn } from './bn';
import { getSetPatternsDe } from './de';
import { getSetPatternsEs } from './es';
import { getSetPatternsFr } from './fr';
import { getSetPatternsHi } from './hi';
import { getSetPatternsId } from './id';
import { getSetPatternsIt } from './it';
import { getSetPatternsJa } from './ja';
import { getSetPatternsKo } from './ko';
import { getSetPatternsMs } from './ms';
import { getSetPatternsPl } from './pl';
import { getSetPatternsPt } from './pt';
import { getSetPatternsRu } from './ru';
import { getSetPatternsTh } from './th';
import { getSetPatternsTl } from './tl';
import { getSetPatternsTr } from './tr';
import { getSetPatternsUk } from './uk';
import { getSetPatternsVi } from './vi';
import { getSetPatternsZh } from './zh';

/**
 * Get set patterns for a specific language.
 */
export function getSetPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'ar':
      return getSetPatternsAr();
    case 'bn':
      return getSetPatternsBn();
    case 'de':
      return getSetPatternsDe();
    case 'es':
      return getSetPatternsEs();
    case 'fr':
      return getSetPatternsFr();
    case 'hi':
      return getSetPatternsHi();
    case 'id':
      return getSetPatternsId();
    case 'it':
      return getSetPatternsIt();
    case 'ja':
      return getSetPatternsJa();
    case 'ko':
      return getSetPatternsKo();
    case 'ms':
      return getSetPatternsMs();
    case 'pl':
      return getSetPatternsPl();
    case 'pt':
      return getSetPatternsPt();
    case 'ru':
      return getSetPatternsRu();
    case 'th':
      return getSetPatternsTh();
    case 'tl':
      return getSetPatternsTl();
    case 'tr':
      return getSetPatternsTr();
    case 'uk':
      return getSetPatternsUk();
    case 'vi':
      return getSetPatternsVi();
    case 'zh':
      return getSetPatternsZh();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getSetPatternsAr } from './ar';
export { getSetPatternsBn } from './bn';
export { getSetPatternsDe } from './de';
export { getSetPatternsEs } from './es';
export { getSetPatternsFr } from './fr';
export { getSetPatternsHi } from './hi';
export { getSetPatternsId } from './id';
export { getSetPatternsIt } from './it';
export { getSetPatternsJa } from './ja';
export { getSetPatternsKo } from './ko';
export { getSetPatternsMs } from './ms';
export { getSetPatternsPl } from './pl';
export { getSetPatternsPt } from './pt';
export { getSetPatternsRu } from './ru';
export { getSetPatternsTh } from './th';
export { getSetPatternsTl } from './tl';
export { getSetPatternsTr } from './tr';
export { getSetPatternsUk } from './uk';
export { getSetPatternsVi } from './vi';
export { getSetPatternsZh } from './zh';

/**
 * Languages that have hand-crafted set patterns.
 */
export const setPatternLanguages = ['ar', 'bn', 'de', 'es', 'fr', 'hi', 'id', 'it', 'ja', 'ko', 'ms', 'pl', 'pt', 'ru', 'th', 'tl', 'tr', 'uk', 'vi', 'zh'];
