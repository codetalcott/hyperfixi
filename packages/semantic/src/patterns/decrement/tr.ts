/**
 * Turkish Decrement Patterns
 *
 * Hand-crafted patterns for "decrement" command.
 * Turkish: counter azalt (SOV order)
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Turkish decrement patterns.
 */
export function getDecrementPatternsTr(): LanguagePattern[] {
  return [
    {
      id: 'decrement-tr-full',
      language: 'tr',
      command: 'decrement',
      priority: 100,
      template: {
        format: '{patient} azalt',
        tokens: [
          { type: 'role', role: 'patient', expectedTypes: ['selector', 'reference', 'expression'] },
          { type: 'literal', value: 'azalt', alternatives: ['azaltmak', 'düşür', 'decrement'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    {
      id: 'decrement-tr-svo',
      language: 'tr',
      command: 'decrement',
      priority: 90,
      template: {
        format: 'azalt {patient}',
        tokens: [
          { type: 'literal', value: 'azalt', alternatives: ['azaltmak'] },
          { type: 'role', role: 'patient', expectedTypes: ['selector', 'reference', 'expression'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
