/**
 * Russian Increment Patterns
 *
 * Tree-shakeable: Only included when Russian is imported.
 * Russian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Russian increment patterns.
 */
export function getIncrementPatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'increment-ru-full',
      language: 'ru',
      command: 'increment',
      priority: 100,
      template: {
        format: 'увеличить {patient} на {quantity}',
        tokens: [
          { type: 'literal', value: 'увеличить', alternatives: ['увеличь'] },
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
      id: 'increment-ru-simple',
      language: 'ru',
      command: 'increment',
      priority: 90,
      template: {
        format: 'увеличить {patient}',
        tokens: [
          { type: 'literal', value: 'увеличить', alternatives: ['увеличь'] },
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
