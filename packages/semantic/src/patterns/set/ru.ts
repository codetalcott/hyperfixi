/**
 * Russian Set Patterns
 *
 * Tree-shakeable: Only included when Russian is imported.
 * Russian uses infinitive verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Russian set patterns.
 */
export function getSetPatternsRu(): LanguagePattern[] {
  return [
    {
      id: 'set-ru-full',
      language: 'ru',
      command: 'set',
      priority: 100,
      template: {
        format: 'установить {patient} в {goal}',
        tokens: [
          { type: 'literal', value: 'установить', alternatives: ['установи', 'задать', 'задай'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'в', alternatives: ['на', 'как'] },
              { type: 'role', role: 'goal' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        goal: { marker: 'в', markerAlternatives: ['на', 'как'] },
      },
    },
    {
      id: 'set-ru-simple',
      language: 'ru',
      command: 'set',
      priority: 90,
      template: {
        format: 'установить {patient}',
        tokens: [
          { type: 'literal', value: 'установить', alternatives: ['установи', 'задать', 'задай'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
