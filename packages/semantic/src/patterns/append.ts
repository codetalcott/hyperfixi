/**
 * Append Command Patterns (Consolidated)
 *
 * Hand-crafted patterns for "append" command across languages.
 * Languages without hand-crafted patterns rely on auto-generation from profiles.
 *
 * Phase 3.2: Consolidated from 5 files into single file.
 */

import type { LanguagePattern } from '../types';

function getAppendPatternsEn(): LanguagePattern[] {
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

/**
 * Get append patterns for a specific language.
 */
export function getAppendPatternsForLanguage(language: string): LanguagePattern[] {
  switch (language) {
    case 'en':
      return getAppendPatternsEn();
    default:
      return [];
  }
}
