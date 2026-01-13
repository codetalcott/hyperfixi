/**
 * Italian Get Patterns
 *
 * Tree-shakeable: Only included when Italian is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Italian get patterns.
 */
export function getGetPatternsIt(): LanguagePattern[] {
  return [
    {
      id: 'get-it-full',
      language: 'it',
      command: 'get',
      priority: 100,
      template: {
        format: 'ottenere {patient} da {source}',
        tokens: [
          { type: 'literal', value: 'ottenere', alternatives: ['ottieni', 'get', 'prendere'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'da', alternatives: ['di'] },
              { type: 'role', role: 'source' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        source: { marker: 'da', markerAlternatives: ['di'] },
      },
    },
    {
      id: 'get-it-simple',
      language: 'it',
      command: 'get',
      priority: 90,
      template: {
        format: 'ottenere {patient}',
        tokens: [
          { type: 'literal', value: 'ottenere', alternatives: ['ottieni', 'get'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
