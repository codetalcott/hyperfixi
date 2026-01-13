/**
 * Ukrainian Get Patterns
 *
 * Tree-shakeable: Only included when Ukrainian is imported.
 * Ukrainian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Ukrainian get patterns.
 */
export function getGetPatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'get-uk-full',
      language: 'uk',
      command: 'get',
      priority: 100,
      template: {
        format: 'отримати {patient} з {source}',
        tokens: [
          { type: 'literal', value: 'отримати', alternatives: ['отримай', 'взяти', 'візьми'] },
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
        source: { marker: 'з', markerAlternatives: ['від', 'із'] },
      },
    },
    {
      id: 'get-uk-simple',
      language: 'uk',
      command: 'get',
      priority: 90,
      template: {
        format: 'отримати {patient}',
        tokens: [
          { type: 'literal', value: 'отримати', alternatives: ['отримай', 'взяти', 'візьми'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
