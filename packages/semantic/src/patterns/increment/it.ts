/**
 * Italian Increment Patterns
 *
 * Tree-shakeable: Only included when Italian is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Italian increment patterns.
 */
export function getIncrementPatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'increment-it-full',
      language: 'it',
      command: 'increment',
      priority: 100,
      template: {
        format: 'incrementare {patient} di {quantity}',
        tokens: [
          {
            type: 'literal',
            value: 'incrementare',
            alternatives: ['incrementa', 'aumentare', 'increment'],
          },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'di', alternatives: ['per'] },
              { type: 'role', role: 'quantity' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: {
          marker: 'di',
          markerAlternatives: ['per'],
          default: { type: 'literal', value: '1' },
        },
      },
    },
    {
      id: 'increment-it-simple',
      language: 'it',
      command: 'increment',
      priority: 90,
      template: {
        format: 'incrementare {patient}',
        tokens: [
          {
            type: 'literal',
            value: 'incrementare',
            alternatives: ['incrementa', 'aumentare', 'increment'],
          },
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
