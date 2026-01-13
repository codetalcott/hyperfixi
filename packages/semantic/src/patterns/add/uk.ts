/**
 * Ukrainian Add Patterns
 *
 * Tree-shakeable: Only included when Ukrainian is imported.
 * Ukrainian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Ukrainian add patterns.
 */
export function getAddPatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'add-uk-full',
      language: 'uk',
      command: 'add',
      priority: 100,
      template: {
        format: 'додати {patient} до {destination}',
        tokens: [
          { type: 'literal', value: 'додати', alternatives: ['додай'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'до', alternatives: ['на', 'в'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'до',
          markerAlternatives: ['на', 'в'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'add-uk-simple',
      language: 'uk',
      command: 'add',
      priority: 90,
      template: {
        format: 'додати {patient}',
        tokens: [
          { type: 'literal', value: 'додати', alternatives: ['додай'] },
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
