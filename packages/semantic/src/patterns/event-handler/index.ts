/**
 * EventHandler Command Patterns
 *
 * Hand-crafted patterns for "event-handler" command across languages.
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

import type { LanguagePattern } from '../../types';

import { getEventHandlerPatternsAr } from './ar';
import { getEventHandlerPatternsBn } from './bn';
import { getEventHandlerPatternsDe } from './de';
import { getEventHandlerPatternsEn } from './en';
import { getEventHandlerPatternsEs } from './es';
import { getEventHandlerPatternsFr } from './fr';
import { getEventHandlerPatternsHi } from './hi';
import { getEventHandlerPatternsId } from './id';
import { getEventHandlerPatternsIt } from './it';
import { getEventHandlerPatternsJa } from './ja';
import { getEventHandlerPatternsKo } from './ko';
import { getEventHandlerPatternsMs } from './ms';
import { getEventHandlerPatternsPl } from './pl';
import { getEventHandlerPatternsPt } from './pt';
import { getEventHandlerPatternsQu } from './qu';
import { getEventHandlerPatternsRu } from './ru';
import { getEventHandlerPatternsSw } from './sw';
import { getEventHandlerPatternsTh } from './th';
import { getEventHandlerPatternsTl } from './tl';
import { getEventHandlerPatternsTr } from './tr';
import { getEventHandlerPatternsUk } from './uk';
import { getEventHandlerPatternsVi } from './vi';
import { getEventHandlerPatternsZh } from './zh';

/**
 * Get event-handler patterns for a specific language.
 */
export function getEventHandlerPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'ar':
      return getEventHandlerPatternsAr();
    case 'bn':
      return getEventHandlerPatternsBn();
    case 'de':
      return getEventHandlerPatternsDe();
    case 'en':
      return getEventHandlerPatternsEn();
    case 'es':
      return getEventHandlerPatternsEs();
    case 'fr':
      return getEventHandlerPatternsFr();
    case 'hi':
      return getEventHandlerPatternsHi();
    case 'id':
      return getEventHandlerPatternsId();
    case 'it':
      return getEventHandlerPatternsIt();
    case 'ja':
      return getEventHandlerPatternsJa();
    case 'ko':
      return getEventHandlerPatternsKo();
    case 'ms':
      return getEventHandlerPatternsMs();
    case 'pl':
      return getEventHandlerPatternsPl();
    case 'pt':
      return getEventHandlerPatternsPt();
    case 'qu':
      return getEventHandlerPatternsQu();
    case 'ru':
      return getEventHandlerPatternsRu();
    case 'sw':
      return getEventHandlerPatternsSw();
    case 'th':
      return getEventHandlerPatternsTh();
    case 'tl':
      return getEventHandlerPatternsTl();
    case 'tr':
      return getEventHandlerPatternsTr();
    case 'uk':
      return getEventHandlerPatternsUk();
    case 'vi':
      return getEventHandlerPatternsVi();
    case 'zh':
      return getEventHandlerPatternsZh();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getEventHandlerPatternsAr } from './ar';
export { getEventHandlerPatternsBn } from './bn';
export { getEventHandlerPatternsDe } from './de';
export { getEventHandlerPatternsEn } from './en';
export { getEventHandlerPatternsEs } from './es';
export { getEventHandlerPatternsFr } from './fr';
export { getEventHandlerPatternsHi } from './hi';
export { getEventHandlerPatternsId } from './id';
export { getEventHandlerPatternsIt } from './it';
export { getEventHandlerPatternsJa } from './ja';
export { getEventHandlerPatternsKo } from './ko';
export { getEventHandlerPatternsMs } from './ms';
export { getEventHandlerPatternsPl } from './pl';
export { getEventHandlerPatternsPt } from './pt';
export { getEventHandlerPatternsQu } from './qu';
export { getEventHandlerPatternsRu } from './ru';
export { getEventHandlerPatternsSw } from './sw';
export { getEventHandlerPatternsTh } from './th';
export { getEventHandlerPatternsTl } from './tl';
export { getEventHandlerPatternsTr } from './tr';
export { getEventHandlerPatternsUk } from './uk';
export { getEventHandlerPatternsVi } from './vi';
export { getEventHandlerPatternsZh } from './zh';

/**
 * Languages that have hand-crafted event-handler patterns.
 */
export const eventhandlerPatternLanguages = [
  'ar',
  'bn',
  'de',
  'en',
  'es',
  'fr',
  'hi',
  'id',
  'it',
  'ja',
  'ko',
  'ms',
  'pl',
  'pt',
  'qu',
  'ru',
  'sw',
  'th',
  'tl',
  'tr',
  'uk',
  'vi',
  'zh',
];
