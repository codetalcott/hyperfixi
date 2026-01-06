/**
 * Italian Hide Patterns
 *
 * Tree-shakeable: Only included when Italian is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Italian hide patterns.
 */
export function getHidePatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'hide-it-full',
      language: 'it',
      command: 'hide',
      priority: 100,
      template: {
        format: 'nascondere {patient} con {style}',
        tokens: [
          { type: 'literal', value: 'nascondere', alternatives: ['nascondi', 'hide'] },
          { type: 'role', role: 'patient' },
          { type: 'group', optional: true, tokens: [
            { type: 'literal', value: 'con' },
            { type: 'role', role: 'style' },
          ]},
        ],
      },
      extraction: {
        patient: { position: 1 },
        style: { marker: 'con' },
      },
    },
    {
      id: 'hide-it-simple',
      language: 'it',
      command: 'hide',
      priority: 90,
      template: {
        format: 'nascondere {patient}',
        tokens: [
          { type: 'literal', value: 'nascondere', alternatives: ['nascondi', 'hide'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
