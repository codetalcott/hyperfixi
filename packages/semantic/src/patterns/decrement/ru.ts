/**
 * Russian Decrement Patterns
 *
 * Tree-shakeable: Only included when Russian is imported.
 * Russian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Russian decrement patterns.
 */
export function getDecrementPatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'decrement-ru-full',
      language: 'ru',
      command: 'decrement',
      priority: 100,
      template: {
        format: 'уменьшить {patient} на {quantity}',
        tokens: [
          { type: 'literal', value: 'уменьшить', alternatives: ['уменьши'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'на' },
              { type: 'role', role: 'quantity' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: { marker: 'на', default: { type: 'literal', value: 1 } },
      },
    },
    {
      id: 'decrement-ru-simple',
      language: 'ru',
      command: 'decrement',
      priority: 90,
      template: {
        format: 'уменьшить {patient}',
        tokens: [
          { type: 'literal', value: 'уменьшить', alternatives: ['уменьши'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: { default: { type: 'literal', value: 1 } },
      },
    },
  ];
}
