/**
 * Ukrainian Decrement Patterns
 *
 * Tree-shakeable: Only included when Ukrainian is imported.
 * Ukrainian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Ukrainian decrement patterns.
 */
export function getDecrementPatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'decrement-uk-full',
      language: 'uk',
      command: 'decrement',
      priority: 100,
      template: {
        format: 'зменшити {patient} на {quantity}',
        tokens: [
          { type: 'literal', value: 'зменшити', alternatives: ['зменш'] },
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
      id: 'decrement-uk-simple',
      language: 'uk',
      command: 'decrement',
      priority: 90,
      template: {
        format: 'зменшити {patient}',
        tokens: [
          { type: 'literal', value: 'зменшити', alternatives: ['зменш'] },
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
