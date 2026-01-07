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
import { getEventHandlerPatternsEn } from './en';
import { getEventHandlerPatternsEs } from './es';
import { getEventHandlerPatternsHi } from './hi';
import { getEventHandlerPatternsIt } from './it';
import { getEventHandlerPatternsJa } from './ja';
import { getEventHandlerPatternsKo } from './ko';
import { getEventHandlerPatternsMs } from './ms';
import { getEventHandlerPatternsPl } from './pl';
import { getEventHandlerPatternsPt } from './pt';
import { getEventHandlerPatternsQu } from './qu';
import { getEventHandlerPatternsRu } from './ru';
import { getEventHandlerPatternsTh } from './th';
import { getEventHandlerPatternsTr } from './tr';
import { getEventHandlerPatternsUk } from './uk';
import { getEventHandlerPatternsVi } from './vi';
import { getEventHandlerPatternsZh } from './zh';
import { getEventHandlerPatternsTl } from './tl';

/**
 * Get event-handler patterns for a specific language.
 */
export function getEventHandlerPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'ar':
      return getEventHandlerPatternsAr();
    case 'bn':
      return getEventHandlerPatternsBn();
    case 'en':
      return getEventHandlerPatternsEn();
    case 'es':
      return getEventHandlerPatternsEs();
    case 'hi':
      return getEventHandlerPatternsHi();
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
    case 'th':
      return getEventHandlerPatternsTh();
    case 'tr':
      return getEventHandlerPatternsTr();
    case 'uk':
      return getEventHandlerPatternsUk();
    case 'vi':
      return getEventHandlerPatternsVi();
    case 'zh':
      return getEventHandlerPatternsZh();
    case 'tl':
      return getEventHandlerPatternsTl();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getEventHandlerPatternsAr } from './ar';
export { getEventHandlerPatternsBn } from './bn';
export { getEventHandlerPatternsEn } from './en';
export { getEventHandlerPatternsEs } from './es';
export { getEventHandlerPatternsHi } from './hi';
export { getEventHandlerPatternsIt } from './it';
export { getEventHandlerPatternsJa } from './ja';
export { getEventHandlerPatternsKo } from './ko';
export { getEventHandlerPatternsMs } from './ms';
export { getEventHandlerPatternsPl } from './pl';
export { getEventHandlerPatternsPt } from './pt';
export { getEventHandlerPatternsQu } from './qu';
export { getEventHandlerPatternsRu } from './ru';
export { getEventHandlerPatternsTh } from './th';
export { getEventHandlerPatternsTr } from './tr';
export { getEventHandlerPatternsUk } from './uk';
export { getEventHandlerPatternsVi } from './vi';
export { getEventHandlerPatternsZh } from './zh';
export { getEventHandlerPatternsTl } from './tl';

/**
 * Languages that have hand-crafted event-handler patterns.
 */
export const eventHandlerPatternLanguages = ['ar', 'bn', 'en', 'es', 'hi', 'it', 'ja', 'ko', 'ms', 'pl', 'pt', 'qu', 'ru', 'th', 'tr', 'uk', 'vi', 'zh', 'tl'];
