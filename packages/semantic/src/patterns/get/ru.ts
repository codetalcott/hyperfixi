/**
 * Russian Get Patterns
 *
 * Tree-shakeable: Only included when Russian is imported.
 * Russian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Russian get patterns.
 */
export function getGetPatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'get-ru-full',
      language: 'ru',
      command: 'get',
      priority: 100,
      template: {
        format: 'получить {patient} из {source}',
        tokens: [
          { type: 'literal', value: 'получить', alternatives: ['получи', 'взять', 'возьми'] },
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
        source: { marker: 'из', markerAlternatives: ['от', 'с'] },
      },
    },
    {
      id: 'get-ru-simple',
      language: 'ru',
      command: 'get',
      priority: 90,
      template: {
        format: 'получить {patient}',
        tokens: [
          { type: 'literal', value: 'получить', alternatives: ['получи', 'взять', 'возьми'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
