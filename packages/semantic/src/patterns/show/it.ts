/**
 * Italian Show Patterns
 *
 * Tree-shakeable: Only included when Italian is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Italian show patterns.
 */
export function getShowPatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'show-it-full',
      language: 'it',
      command: 'show',
      priority: 100,
      template: {
        format: 'mostrare {patient} con {style}',
        tokens: [
          { type: 'literal', value: 'mostrare', alternatives: ['mostra', 'visualizzare', 'show'] },
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
      id: 'show-it-simple',
      language: 'it',
      command: 'show',
      priority: 90,
      template: {
        format: 'mostrare {patient}',
        tokens: [
          { type: 'literal', value: 'mostrare', alternatives: ['mostra', 'visualizzare', 'show'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
