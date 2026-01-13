/**
 * Polish Toggle Patterns
 *
 * Tree-shakeable: Only included when Polish is imported.
 * Polish uses imperative verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Polish toggle patterns.
 */
export function getTogglePatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'toggle-pl-full',
      language: 'pl',
      command: 'toggle',
      priority: 100,
      template: {
        format: 'przełącz {patient} na {destination}',
        tokens: [
          { type: 'literal', value: 'przełącz', alternatives: ['przelacz', 'przełączaj'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'na', alternatives: ['w', 'dla'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'na',
          markerAlternatives: ['w', 'dla'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'toggle-pl-simple',
      language: 'pl',
      command: 'toggle',
      priority: 90,
      template: {
        format: 'przełącz {patient}',
        tokens: [
          { type: 'literal', value: 'przełącz', alternatives: ['przelacz', 'przełączaj'] },
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
