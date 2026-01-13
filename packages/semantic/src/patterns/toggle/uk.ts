/**
 * Ukrainian Toggle Patterns
 *
 * Tree-shakeable: Only included when Ukrainian is imported.
 * Ukrainian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Ukrainian toggle patterns.
 */
export function getTogglePatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'toggle-uk-full',
      language: 'uk',
      command: 'toggle',
      priority: 100,
      template: {
        format: 'перемкнути {patient} на {destination}',
        tokens: [
          { type: 'literal', value: 'перемкнути', alternatives: ['перемкни'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'на', alternatives: ['в', 'для'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'на',
          markerAlternatives: ['в', 'для'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'toggle-uk-simple',
      language: 'uk',
      command: 'toggle',
      priority: 90,
      template: {
        format: 'перемкнути {patient}',
        tokens: [
          { type: 'literal', value: 'перемкнути', alternatives: ['перемкни'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}
