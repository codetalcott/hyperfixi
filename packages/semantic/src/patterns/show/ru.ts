/**
 * Russian Show Patterns
 *
 * Tree-shakeable: Only included when Russian is imported.
 * Russian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Russian show patterns.
 */
export function getShowPatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'show-ru-full',
      language: 'ru',
      command: 'show',
      priority: 100,
      template: {
        format: 'показать {patient} с {style}',
        tokens: [
          { type: 'literal', value: 'показать', alternatives: ['покажи'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'с', alternatives: ['со', 'как'] },
              { type: 'role', role: 'style' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        style: { marker: 'с', markerAlternatives: ['со', 'как'] },
      },
    },
    {
      id: 'show-ru-simple',
      language: 'ru',
      command: 'show',
      priority: 90,
      template: {
        format: 'показать {patient}',
        tokens: [
          { type: 'literal', value: 'показать', alternatives: ['покажи'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
