/**
 * Ukrainian Hide Patterns
 *
 * Tree-shakeable: Only included when Ukrainian is imported.
 * Ukrainian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Ukrainian hide patterns.
 */
export function getHidePatternsUk(): LanguagePattern[] {
  return [
    {
      id: 'hide-uk-full',
      language: 'uk',
      command: 'hide',
      priority: 100,
      template: {
        format: 'сховати {patient} з {style}',
        tokens: [
          { type: 'literal', value: 'сховати', alternatives: ['сховай', 'приховати', 'приховай'] },
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
      id: 'hide-uk-simple',
      language: 'uk',
      command: 'hide',
      priority: 90,
      template: {
        format: 'сховати {patient}',
        tokens: [
          { type: 'literal', value: 'сховати', alternatives: ['сховай', 'приховати', 'приховай'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
