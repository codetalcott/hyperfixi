/**
 * Italian Decrement Patterns
 *
 * Tree-shakeable: Only included when Italian is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Italian decrement patterns.
 */
export function getDecrementPatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'decrement-it-full',
      language: 'it',
      command: 'decrement',
      priority: 100,
      template: {
        format: 'decrementare {patient} di {quantity}',
        tokens: [
          { type: 'literal', value: 'decrementare', alternatives: ['decrementa', 'diminuire', 'decrement'] },
          { type: 'role', role: 'patient' },
          { type: 'group', optional: true, tokens: [
            { type: 'literal', value: 'di', alternatives: ['per'] },
            { type: 'role', role: 'quantity' },
          ]},
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: { marker: 'di', markerAlternatives: ['per'], default: { type: 'literal', value: '1' } },
      },
    },
    {
      id: 'decrement-it-simple',
      language: 'it',
      command: 'decrement',
      priority: 90,
      template: {
        format: 'decrementare {patient}',
        tokens: [
          { type: 'literal', value: 'decrementare', alternatives: ['decrementa', 'diminuire', 'decrement'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: { default: { type: 'literal', value: '1' } },
      },
    },
  ];
}
