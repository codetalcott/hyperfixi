/**
 * English Prepend Patterns
 *
 * Tree-shakeable: Only included when English is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get English prepend patterns.
 */
export function getPrependPatternsEn(): LanguagePattern[] {
  return [
    {
      id: 'prepend-en-full',
      language: 'en',
      command: 'prepend',
      priority: 100,
      template: {
        format: 'prepend {patient} to {destination}',
        tokens: [
          { type: 'literal', value: 'prepend' },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'selector', 'expression'] },
          { type: 'literal', value: 'to' },
          { type: 'role', role: 'destination', expectedTypes: ['selector', 'reference'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
        destination: { marker: 'to' },
      },
    },
  ];
}
