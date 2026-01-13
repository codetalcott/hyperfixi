/**
 * Ukrainian Increment Patterns
 *
 * Tree-shakeable: Only included when Ukrainian is imported.
 * Ukrainian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Ukrainian increment patterns.
 */
export function getIncrementPatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'increment-uk-full',
      language: 'uk',
      command: 'increment',
      priority: 100,
      template: {
        format: 'збільшити {patient} на {quantity}',
        tokens: [
          { type: 'literal', value: 'збільшити', alternatives: ['збільш'] },
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
      id: 'increment-uk-simple',
      language: 'uk',
      command: 'increment',
      priority: 90,
      template: {
        format: 'збільшити {patient}',
        tokens: [
          { type: 'literal', value: 'збільшити', alternatives: ['збільш'] },
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
