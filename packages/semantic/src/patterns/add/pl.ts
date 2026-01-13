/**
 * Polish Add Patterns
 *
 * Tree-shakeable: Only included when Polish is imported.
 * Polish uses imperative verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Polish add patterns.
 */
export function getAddPatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'add-pl-full',
      language: 'pl',
      command: 'add',
      priority: 100,
      template: {
        format: 'dodaj {patient} do {destination}',
        tokens: [
          { type: 'literal', value: 'dodaj', alternatives: ['dołącz', 'dolacz'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'do', alternatives: ['na', 'w'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'do',
          markerAlternatives: ['na', 'w'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'add-pl-simple',
      language: 'pl',
      command: 'add',
      priority: 90,
      template: {
        format: 'dodaj {patient}',
        tokens: [
          { type: 'literal', value: 'dodaj', alternatives: ['dołącz', 'dolacz'] },
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
