/**
 * English Temporal Expression Patterns
 *
 * Hand-crafted patterns for natural temporal delay idioms.
 */

import type { LanguagePattern } from '../../../types';

/**
 * English: "in 2s toggle .active" - Natural temporal delay
 * Transforms to: wait 2s then toggle .active
 *
 * This is a beginner-friendly idiom for delayed execution.
 * Supports: 2s, 500ms, 2 seconds, 500 milliseconds
 */
export const temporalInEnglish: LanguagePattern = {
  id: 'temporal-en-in',
  language: 'en',
  command: 'wait',
  priority: 95, // Lower than standard wait patterns
  template: {
    format: 'in {duration}',
    tokens: [
      { type: 'literal', value: 'in' },
      { type: 'role', role: 'duration', expectedTypes: ['literal', 'expression'] },
    ],
  },
  extraction: {
    duration: { position: 1 },
  },
};

/**
 * English: "after 2s show #tooltip" - Natural temporal delay (alternative)
 * Transforms to: wait 2s then show #tooltip
 */
export const temporalAfterEnglish: LanguagePattern = {
  id: 'temporal-en-after',
  language: 'en',
  command: 'wait',
  priority: 95, // Lower than standard wait patterns
  template: {
    format: 'after {duration}',
    tokens: [
      { type: 'literal', value: 'after' },
      { type: 'role', role: 'duration', expectedTypes: ['literal', 'expression'] },
    ],
  },
  extraction: {
    duration: { position: 1 },
  },
};

/**
 * All English temporal patterns.
 */
export const temporalPatternsEn: LanguagePattern[] = [temporalInEnglish, temporalAfterEnglish];
