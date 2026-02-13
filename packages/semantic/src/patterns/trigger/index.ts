/**
 * Trigger Command Patterns
 *
 * Hand-crafted patterns for "trigger" command across languages.
 *
 * @generated This file is auto-generated. Do not edit manually.
 */

import type { LanguagePattern } from '../../types';

import { getTriggerPatternsEn } from './en';
import { getTriggerPatternsEs } from './es';
import { getTriggerPatternsJa } from './ja';
import { getTriggerPatternsKo } from './ko';

/**
 * Get trigger patterns for a specific language.
 */
export function getTriggerPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'en':
      return getTriggerPatternsEn();
    case 'es':
      return getTriggerPatternsEs();
    case 'ja':
      return getTriggerPatternsJa();
    case 'ko':
      return getTriggerPatternsKo();
    default:
      return [];
  }
}

// Re-export language-specific getters for tree-shaking
export { getTriggerPatternsEn } from './en';
export { getTriggerPatternsEs } from './es';
export { getTriggerPatternsJa } from './ja';
export { getTriggerPatternsKo } from './ko';

/**
 * Languages that have hand-crafted trigger patterns.
 */
export const triggerPatternLanguages = ['en', 'es', 'ja', 'ko'];
