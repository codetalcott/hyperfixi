/**
 * Hide Command Patterns
 *
 * Hand-crafted patterns for "hide" command across languages.
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

import type { LanguagePattern } from '../../types';

import { getHidePatternsAr } from './ar';
import { getHidePatternsBn } from './bn';
import { getHidePatternsDe } from './de';
import { getHidePatternsHi } from './hi';
import { getHidePatternsIt } from './it';
import { getHidePatternsJa } from './ja';
import { getHidePatternsKo } from './ko';
import { getHidePatternsMs } from './ms';
import { getHidePatternsPl } from './pl';
import { getHidePatternsRu } from './ru';
import { getHidePatternsTh } from './th';
import { getHidePatternsTr } from './tr';
import { getHidePatternsUk } from './uk';
import { getHidePatternsVi } from './vi';
import { getHidePatternsZh } from './zh';
import { getHidePatternsTl } from './tl';

/**
 * Get hide patterns for a specific language.
 */
export function getHidePatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'ar':
      return getHidePatternsAr();
    case 'bn':
      return getHidePatternsBn();
    case 'de':
      return getHidePatternsDe();
    case 'hi':
      return getHidePatternsHi();
    case 'it':
      return getHidePatternsIt();
    case 'ja':
      return getHidePatternsJa();
    case 'ko':
      return getHidePatternsKo();
    case 'ms':
      return getHidePatternsMs();
    case 'pl':
      return getHidePatternsPl();
    case 'ru':
      return getHidePatternsRu();
    case 'th':
      return getHidePatternsTh();
    case 'tr':
      return getHidePatternsTr();
    case 'uk':
      return getHidePatternsUk();
    case 'vi':
      return getHidePatternsVi();
    case 'zh':
      return getHidePatternsZh();
    case 'tl':
      return getHidePatternsTl();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getHidePatternsAr } from './ar';
export { getHidePatternsBn } from './bn';
export { getHidePatternsDe } from './de';
export { getHidePatternsHi } from './hi';
export { getHidePatternsIt } from './it';
export { getHidePatternsJa } from './ja';
export { getHidePatternsKo } from './ko';
export { getHidePatternsMs } from './ms';
export { getHidePatternsPl } from './pl';
export { getHidePatternsRu } from './ru';
export { getHidePatternsTh } from './th';
export { getHidePatternsTr } from './tr';
export { getHidePatternsUk } from './uk';
export { getHidePatternsVi } from './vi';
export { getHidePatternsZh } from './zh';
export { getHidePatternsTl } from './tl';

/**
 * Languages that have hand-crafted hide patterns.
 */
export const hidePatternLanguages = ['ar', 'bn', 'de', 'hi', 'it', 'ja', 'ko', 'ms', 'pl', 'ru', 'th', 'tr', 'uk', 'vi', 'zh', 'tl'];
