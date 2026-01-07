/**
 * Increment Command Patterns
 *
 * Hand-crafted patterns for "increment" command across languages.
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

import type { LanguagePattern } from '../../types';

import { getIncrementPatternsBn } from './bn';
import { getIncrementPatternsDe } from './de';
import { getIncrementPatternsHi } from './hi';
import { getIncrementPatternsIt } from './it';
import { getIncrementPatternsMs } from './ms';
import { getIncrementPatternsPl } from './pl';
import { getIncrementPatternsRu } from './ru';
import { getIncrementPatternsTh } from './th';
import { getIncrementPatternsTl } from './tl';
import { getIncrementPatternsTr } from './tr';
import { getIncrementPatternsUk } from './uk';
import { getIncrementPatternsVi } from './vi';
import { getIncrementPatternsZh } from './zh';

/**
 * Get increment patterns for a specific language.
 */
export function getIncrementPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'bn':
      return getIncrementPatternsBn();
    case 'de':
      return getIncrementPatternsDe();
    case 'hi':
      return getIncrementPatternsHi();
    case 'it':
      return getIncrementPatternsIt();
    case 'ms':
      return getIncrementPatternsMs();
    case 'pl':
      return getIncrementPatternsPl();
    case 'ru':
      return getIncrementPatternsRu();
    case 'th':
      return getIncrementPatternsTh();
    case 'tl':
      return getIncrementPatternsTl();
    case 'tr':
      return getIncrementPatternsTr();
    case 'uk':
      return getIncrementPatternsUk();
    case 'vi':
      return getIncrementPatternsVi();
    case 'zh':
      return getIncrementPatternsZh();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getIncrementPatternsBn } from './bn';
export { getIncrementPatternsDe } from './de';
export { getIncrementPatternsHi } from './hi';
export { getIncrementPatternsIt } from './it';
export { getIncrementPatternsMs } from './ms';
export { getIncrementPatternsPl } from './pl';
export { getIncrementPatternsRu } from './ru';
export { getIncrementPatternsTh } from './th';
export { getIncrementPatternsTl } from './tl';
export { getIncrementPatternsTr } from './tr';
export { getIncrementPatternsUk } from './uk';
export { getIncrementPatternsVi } from './vi';
export { getIncrementPatternsZh } from './zh';

/**
 * Languages that have hand-crafted increment patterns.
 */
export const incrementPatternLanguages = ['bn', 'de', 'hi', 'it', 'ms', 'pl', 'ru', 'th', 'tl', 'tr', 'uk', 'vi', 'zh'];
