/**
 * Toggle Command Patterns
 *
 * Hand-crafted patterns for "toggle" command across languages.
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

import type { LanguagePattern } from '../../types';

import { getTogglePatternsAr } from './ar';
import { getTogglePatternsBn } from './bn';
import { getTogglePatternsEn } from './en';
import { getTogglePatternsEs } from './es';
import { getTogglePatternsHi } from './hi';
import { getTogglePatternsIt } from './it';
import { getTogglePatternsJa } from './ja';
import { getTogglePatternsKo } from './ko';
import { getTogglePatternsMs } from './ms';
import { getTogglePatternsPl } from './pl';
import { getTogglePatternsRu } from './ru';
import { getTogglePatternsTh } from './th';
import { getTogglePatternsTl } from './tl';
import { getTogglePatternsTr } from './tr';
import { getTogglePatternsUk } from './uk';
import { getTogglePatternsVi } from './vi';
import { getTogglePatternsZh } from './zh';

/**
 * Get toggle patterns for a specific language.
 */
export function getTogglePatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'ar':
      return getTogglePatternsAr();
    case 'bn':
      return getTogglePatternsBn();
    case 'en':
      return getTogglePatternsEn();
    case 'es':
      return getTogglePatternsEs();
    case 'hi':
      return getTogglePatternsHi();
    case 'it':
      return getTogglePatternsIt();
    case 'ja':
      return getTogglePatternsJa();
    case 'ko':
      return getTogglePatternsKo();
    case 'ms':
      return getTogglePatternsMs();
    case 'pl':
      return getTogglePatternsPl();
    case 'ru':
      return getTogglePatternsRu();
    case 'th':
      return getTogglePatternsTh();
    case 'tl':
      return getTogglePatternsTl();
    case 'tr':
      return getTogglePatternsTr();
    case 'uk':
      return getTogglePatternsUk();
    case 'vi':
      return getTogglePatternsVi();
    case 'zh':
      return getTogglePatternsZh();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getTogglePatternsAr } from './ar';
export { getTogglePatternsBn } from './bn';
export { getTogglePatternsEn } from './en';
export { getTogglePatternsEs } from './es';
export { getTogglePatternsHi } from './hi';
export { getTogglePatternsIt } from './it';
export { getTogglePatternsJa } from './ja';
export { getTogglePatternsKo } from './ko';
export { getTogglePatternsMs } from './ms';
export { getTogglePatternsPl } from './pl';
export { getTogglePatternsRu } from './ru';
export { getTogglePatternsTh } from './th';
export { getTogglePatternsTl } from './tl';
export { getTogglePatternsTr } from './tr';
export { getTogglePatternsUk } from './uk';
export { getTogglePatternsVi } from './vi';
export { getTogglePatternsZh } from './zh';

/**
 * Languages that have hand-crafted toggle patterns.
 */
export const togglePatternLanguages = ['ar', 'bn', 'en', 'es', 'hi', 'it', 'ja', 'ko', 'ms', 'pl', 'ru', 'th', 'tl', 'tr', 'uk', 'vi', 'zh'];
