/**
 * Ukrainian Remove Patterns
 *
 * Tree-shakeable: Only included when Ukrainian is imported.
 * Ukrainian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Ukrainian remove patterns.
 */
export function getRemovePatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'remove-uk-full',
      language: 'uk',
      command: 'remove',
      priority: 100,
      template: {
        format: 'видалити {patient} з {source}',
        tokens: [
          { type: 'literal', value: 'видалити', alternatives: ['видали', 'прибрати', 'прибери'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'з', alternatives: ['від', 'із'] },
              { type: 'role', role: 'source' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        source: {
          marker: 'з',
          markerAlternatives: ['від', 'із'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'remove-uk-simple',
      language: 'uk',
      command: 'remove',
      priority: 90,
      template: {
        format: 'видалити {patient}',
        tokens: [
          { type: 'literal', value: 'видалити', alternatives: ['видали', 'прибрати', 'прибери'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        source: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}
