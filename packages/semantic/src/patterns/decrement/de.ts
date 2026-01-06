/**
 * German Decrement Patterns
 *
 * Hand-crafted patterns for "decrement" command.
 * German: verringere zähler
 */

import type { LanguagePattern } from '../../types';

/**
 * Get German decrement patterns.
 */
export function getDecrementPatternsDe(): LanguagePattern[] {
  return [
    {
      id: 'decrement-de-full',
      language: 'de',
      command: 'decrement',
      priority: 100,
      template: {
        format: 'verringere {patient}',
        tokens: [
          { type: 'literal', value: 'verringere', alternatives: ['verringern', 'dekrementiere', 'dekrementieren', 'reduziere', 'decrement'] },
          { type: 'role', role: 'patient', expectedTypes: ['selector', 'reference', 'expression'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
