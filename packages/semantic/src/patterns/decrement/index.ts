/**
 * Decrement Command Patterns
 *
 * Hand-crafted patterns for "decrement" command across languages.
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

import type { LanguagePattern } from '../../types';

import { getDecrementPatternsBn } from './bn';
import { getDecrementPatternsDe } from './de';
import { getDecrementPatternsHi } from './hi';
import { getDecrementPatternsIt } from './it';
import { getDecrementPatternsMs } from './ms';
import { getDecrementPatternsPl } from './pl';
import { getDecrementPatternsRu } from './ru';
import { getDecrementPatternsTh } from './th';
import { getDecrementPatternsTl } from './tl';
import { getDecrementPatternsTr } from './tr';
import { getDecrementPatternsUk } from './uk';
import { getDecrementPatternsVi } from './vi';
import { getDecrementPatternsZh } from './zh';

/**
 * Get decrement patterns for a specific language.
 */
export function getDecrementPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'bn':
      return getDecrementPatternsBn();
    case 'de':
      return getDecrementPatternsDe();
    case 'hi':
      return getDecrementPatternsHi();
    case 'it':
      return getDecrementPatternsIt();
    case 'ms':
      return getDecrementPatternsMs();
    case 'pl':
      return getDecrementPatternsPl();
    case 'ru':
      return getDecrementPatternsRu();
    case 'th':
      return getDecrementPatternsTh();
    case 'tl':
      return getDecrementPatternsTl();
    case 'tr':
      return getDecrementPatternsTr();
    case 'uk':
      return getDecrementPatternsUk();
    case 'vi':
      return getDecrementPatternsVi();
    case 'zh':
      return getDecrementPatternsZh();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getDecrementPatternsBn } from './bn';
export { getDecrementPatternsDe } from './de';
export { getDecrementPatternsHi } from './hi';
export { getDecrementPatternsIt } from './it';
export { getDecrementPatternsMs } from './ms';
export { getDecrementPatternsPl } from './pl';
export { getDecrementPatternsRu } from './ru';
export { getDecrementPatternsTh } from './th';
export { getDecrementPatternsTl } from './tl';
export { getDecrementPatternsTr } from './tr';
export { getDecrementPatternsUk } from './uk';
export { getDecrementPatternsVi } from './vi';
export { getDecrementPatternsZh } from './zh';

/**
 * Languages that have hand-crafted decrement patterns.
 */
export const decrementPatternLanguages = ['bn', 'de', 'hi', 'it', 'ms', 'pl', 'ru', 'th', 'tl', 'tr', 'uk', 'vi', 'zh'];
