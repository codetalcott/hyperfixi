/**
 * English Append Patterns
 *
 * Tree-shakeable: Only included when English is imported.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get English append patterns.
 */
export function getAppendPatternsEn(): LanguagePattern[] {
  return [
    {
      id: 'append-en-full',
      language: 'en',
      command: 'append',
      priority: 100,
      template: {
        format: 'append {patient} to {destination}',
        tokens: [
          { type: 'literal', value: 'append' },
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
