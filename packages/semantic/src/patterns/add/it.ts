/**
 * Italian Add Patterns
 *
 * Tree-shakeable: Only included when Italian is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Italian add patterns.
 */
export function getAddPatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'add-it-full',
      language: 'it',
      command: 'add',
      priority: 100,
      template: {
        format: 'aggiungere {patient} a {target}',
        tokens: [
          { type: 'literal', value: 'aggiungere', alternatives: ['aggiungi', 'add'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'a', alternatives: ['su', 'in'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'a',
          markerAlternatives: ['su', 'in'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'add-it-simple',
      language: 'it',
      command: 'add',
      priority: 90,
      template: {
        format: 'aggiungere {patient}',
        tokens: [
          { type: 'literal', value: 'aggiungere', alternatives: ['aggiungi', 'add'] },
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
