/**
 * Ukrainian Show Patterns
 *
 * Tree-shakeable: Only included when Ukrainian is imported.
 * Ukrainian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Ukrainian show patterns.
 */
export function getShowPatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'show-uk-full',
      language: 'uk',
      command: 'show',
      priority: 100,
      template: {
        format: 'показати {patient} з {style}',
        tokens: [
          { type: 'literal', value: 'показати', alternatives: ['покажи'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'з', alternatives: ['із', 'як'] },
              { type: 'role', role: 'style' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        style: { marker: 'з', markerAlternatives: ['із', 'як'] },
      },
    },
    {
      id: 'show-uk-simple',
      language: 'uk',
      command: 'show',
      priority: 90,
      template: {
        format: 'показати {patient}',
        tokens: [
          { type: 'literal', value: 'показати', alternatives: ['покажи'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
