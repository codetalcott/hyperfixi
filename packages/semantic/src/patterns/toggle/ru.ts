/**
 * Russian Toggle Patterns
 *
 * Tree-shakeable: Only included when Russian is imported.
 * Russian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Russian toggle patterns.
 */
export function getTogglePatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'toggle-ru-full',
      language: 'ru',
      command: 'toggle',
      priority: 100,
      template: {
        format: 'переключить {patient} на {destination}',
        tokens: [
          { type: 'literal', value: 'переключить', alternatives: ['переключи'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'на', alternatives: ['в', 'для'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'на',
          markerAlternatives: ['в', 'для'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'toggle-ru-simple',
      language: 'ru',
      command: 'toggle',
      priority: 90,
      template: {
        format: 'переключить {patient}',
        tokens: [
          { type: 'literal', value: 'переключить', alternatives: ['переключи'] },
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
