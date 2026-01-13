/**
 * Russian Add Patterns
 *
 * Tree-shakeable: Only included when Russian is imported.
 * Russian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Russian add patterns.
 */
export function getAddPatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'add-ru-full',
      language: 'ru',
      command: 'add',
      priority: 100,
      template: {
        format: 'добавить {patient} к {destination}',
        tokens: [
          { type: 'literal', value: 'добавить', alternatives: ['добавь'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'к', alternatives: ['на', 'в'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'к',
          markerAlternatives: ['на', 'в'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'add-ru-simple',
      language: 'ru',
      command: 'add',
      priority: 90,
      template: {
        format: 'добавить {patient}',
        tokens: [
          { type: 'literal', value: 'добавить', alternatives: ['добавь'] },
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
