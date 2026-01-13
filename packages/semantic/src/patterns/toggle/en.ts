/**
 * English Toggle Patterns
 *
 * Tree-shakeable: Only included when English is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get English toggle patterns.
 */
export function getTogglePatternsEn(): LanguagePattern[] {
  return [
    {
      id: 'toggle-en-full',
      language: 'en',
      command: 'toggle',
      priority: 100,
      template: {
        format: 'toggle {patient} on {target}',
        tokens: [
          { type: 'literal', value: 'toggle' },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'on', alternatives: ['from'] },
              { type: 'role', role: 'destination' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: {
          marker: 'on',
          markerAlternatives: ['from'],
          default: { type: 'reference', value: 'me' },
        },
      },
    },
    {
      id: 'toggle-en-simple',
      language: 'en',
      command: 'toggle',
      priority: 90,
      template: {
        format: 'toggle {patient}',
        tokens: [
          { type: 'literal', value: 'toggle' },
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
