/**
 * Prepend Command Patterns (Consolidated)
 *
 * Hand-crafted patterns for "prepend" command across languages.
 * Languages without hand-crafted patterns rely on auto-generation from profiles.
 *
 * Phase 3.2: Consolidated from 5 files into single file.
 */

import type { LanguagePattern } from '../types';

function getPrependPatternsEn(): LanguagePattern[] {
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

/**
 * Get prepend patterns for a specific language.
 */
export function getPrependPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'en':
      return getPrependPatternsEn();
    default:
      return [];
  }
}
