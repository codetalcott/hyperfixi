/**
 * Italian Remove Patterns
 *
 * Tree-shakeable: Only included when Italian is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Italian remove patterns.
 */
export function getRemovePatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'remove-it-full',
      language: 'it',
      command: 'remove',
      priority: 100,
      template: {
        format: 'rimuovere {patient} da {target}',
        tokens: [
          {
            type: 'literal',
            value: 'rimuovere',
            alternatives: ['rimuovi', 'eliminare', 'togliere', 'remove'],
          },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'da', alternatives: ['di'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'da',
          markerAlternatives: ['di'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'remove-it-simple',
      language: 'it',
      command: 'remove',
      priority: 90,
      template: {
        format: 'rimuovere {patient}',
        tokens: [
          {
            type: 'literal',
            value: 'rimuovere',
            alternatives: ['rimuovi', 'eliminare', 'togliere', 'remove'],
          },
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
