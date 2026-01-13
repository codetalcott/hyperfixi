/**
 * Italian Set Patterns
 *
 * Tree-shakeable: Only included when Italian is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Italian set patterns.
 */
export function getSetPatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'set-it-full',
      language: 'it',
      command: 'set',
      priority: 100,
      template: {
        format: 'impostare {patient} a {goal}',
        tokens: [
          { type: 'literal', value: 'impostare', alternatives: ['imposta', 'set', 'definire'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'a', alternatives: ['su', 'come'] },
              { type: 'role', role: 'goal' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        goal: { marker: 'a', markerAlternatives: ['su', 'come'] },
      },
    },
    {
      id: 'set-it-simple',
      language: 'it',
      command: 'set',
      priority: 90,
      template: {
        format: 'impostare {patient}',
        tokens: [
          { type: 'literal', value: 'impostare', alternatives: ['imposta', 'set'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
