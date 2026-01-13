/**
 * Spanish Toggle Patterns
 *
 * Tree-shakeable: Only included when Spanish is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Spanish toggle patterns.
 */
export function getTogglePatternsEs(): LanguagePattern[] {
  return [
    {
      id: 'toggle-es-full',
      language: 'es',
      command: 'toggle',
      priority: 100,
      template: {
        format: 'alternar {patient} en {target}',
        tokens: [
          { type: 'literal', value: 'alternar', alternatives: ['cambiar', 'toggle'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'en', alternatives: ['sobre', 'de'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'en',
          markerAlternatives: ['sobre', 'de'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'toggle-es-simple',
      language: 'es',
      command: 'toggle',
      priority: 90,
      template: {
        format: 'alternar {patient}',
        tokens: [
          { type: 'literal', value: 'alternar', alternatives: ['cambiar', 'toggle'] },
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
