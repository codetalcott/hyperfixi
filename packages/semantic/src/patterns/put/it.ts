/**
 * Italian Put Patterns
 *
 * Tree-shakeable: Only included when Italian is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Italian put patterns.
 */
export function getPutPatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'put-it-full',
      language: 'it',
      command: 'put',
      priority: 100,
      template: {
        format: 'mettere {patient} in {target}',
        tokens: [
          { type: 'literal', value: 'mettere', alternatives: ['metti', 'inserire', 'put'] },
          { type: 'role', role: 'patient' },
          { type: 'group', optional: true, tokens: [
            { type: 'literal', value: 'in', alternatives: ['dentro', 'nel'] },
            { type: 'role', role: 'destination' },
          ]},
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'in', markerAlternatives: ['dentro', 'nel'] },
      },
    },
    {
      id: 'put-it-simple',
      language: 'it',
      command: 'put',
      priority: 90,
      template: {
        format: 'mettere {patient}',
        tokens: [
          { type: 'literal', value: 'mettere', alternatives: ['metti', 'inserire', 'put'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
