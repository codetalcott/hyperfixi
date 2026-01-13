/**
 * Polish Set Patterns
 *
 * Tree-shakeable: Only included when Polish is imported.
 * Polish uses imperative verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Polish set patterns.
 */
export function getSetPatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'set-pl-full',
      language: 'pl',
      command: 'set',
      priority: 100,
      template: {
        format: 'ustaw {patient} na {goal}',
        tokens: [
          { type: 'literal', value: 'ustaw', alternatives: ['określ', 'okresl', 'przypisz'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'na', alternatives: ['do', 'jako'] },
              { type: 'role', role: 'goal' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        goal: { marker: 'na', markerAlternatives: ['do', 'jako'] },
      },
    },
    {
      id: 'set-pl-simple',
      language: 'pl',
      command: 'set',
      priority: 90,
      template: {
        format: 'ustaw {patient}',
        tokens: [
          { type: 'literal', value: 'ustaw', alternatives: ['określ', 'okresl'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
