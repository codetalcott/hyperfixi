/**
 * Russian Hide Patterns
 *
 * Tree-shakeable: Only included when Russian is imported.
 * Russian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Russian hide patterns.
 */
export function getHidePatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'hide-ru-full',
      language: 'ru',
      command: 'hide',
      priority: 100,
      template: {
        format: 'скрыть {patient} с {style}',
        tokens: [
          { type: 'literal', value: 'скрыть', alternatives: ['скрой', 'спрятать', 'спрячь'] },
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
      id: 'hide-ru-simple',
      language: 'ru',
      command: 'hide',
      priority: 90,
      template: {
        format: 'скрыть {patient}',
        tokens: [
          { type: 'literal', value: 'скрыть', alternatives: ['скрой', 'спрятать', 'спрячь'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
