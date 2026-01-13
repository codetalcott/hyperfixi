/**
 * Russian Remove Patterns
 *
 * Tree-shakeable: Only included when Russian is imported.
 * Russian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Russian remove patterns.
 */
export function getRemovePatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'remove-ru-full',
      language: 'ru',
      command: 'remove',
      priority: 100,
      template: {
        format: 'удалить {patient} из {source}',
        tokens: [
          { type: 'literal', value: 'удалить', alternatives: ['удали', 'убрать', 'убери'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'из', alternatives: ['от', 'с'] },
              { type: 'role', role: 'source' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        source: {
          marker: 'из',
          markerAlternatives: ['от', 'с'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'remove-ru-simple',
      language: 'ru',
      command: 'remove',
      priority: 90,
      template: {
        format: 'удалить {patient}',
        tokens: [
          { type: 'literal', value: 'удалить', alternatives: ['удали', 'убрать', 'убери'] },
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
