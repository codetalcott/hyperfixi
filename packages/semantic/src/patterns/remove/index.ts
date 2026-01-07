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
import { getRemovePatternsRu } from './ru';
import { getRemovePatternsTh } from './th';
import { getRemovePatternsTr } from './tr';
import { getRemovePatternsUk } from './uk';
import { getRemovePatternsVi } from './vi';
import { getRemovePatternsZh } from './zh';
import { getRemovePatternsTl } from './tl';

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
    case 'ru':
      return getRemovePatternsRu();
    case 'th':
      return getRemovePatternsTh();
    case 'tr':
      return getRemovePatternsTr();
    case 'uk':
      return getRemovePatternsUk();
    case 'vi':
      return getRemovePatternsVi();
    case 'zh':
      return getRemovePatternsZh();
    case 'tl':
      return getRemovePatternsTl();
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
export { getRemovePatternsRu } from './ru';
export { getRemovePatternsTh } from './th';
export { getRemovePatternsTr } from './tr';
export { getRemovePatternsUk } from './uk';
export { getRemovePatternsVi } from './vi';
export { getRemovePatternsZh } from './zh';
export { getRemovePatternsTl } from './tl';

/**
 * Languages that have hand-crafted remove patterns.
 */
export const removePatternLanguages = ['ar', 'bn', 'hi', 'it', 'ja', 'ko', 'ms', 'pl', 'ru', 'th', 'tr', 'uk', 'vi', 'zh', 'tl'];
