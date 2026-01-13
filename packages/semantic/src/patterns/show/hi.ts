/**
 * Hindi Show Patterns
 *
 * Patterns for parsing "show" command in Hindi.
 */

import type { LanguagePattern } from '../../types';

export function getShowPatternsHi(): LanguagePattern[] {
  return [
    // Full pattern: #element को दिखाएं
    {
      id: 'show-hi-full',
      language: 'hi',
      command: 'show',
      priority: 100,
      template: {
        format: '{patient} को दिखाएं',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'को' },
          { type: 'literal', value: 'दिखाएं', alternatives: ['दिखा'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    // Simple pattern: दिखाएं #element
    {
      id: 'show-hi-simple',
      language: 'hi',
      command: 'show',
      priority: 90,
      template: {
        format: 'दिखाएं {patient}',
        tokens: [
          { type: 'literal', value: 'दिखाएं', alternatives: ['दिखा'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    // Bare pattern: दिखाएं (implicit me)
    {
      id: 'show-hi-bare',
      language: 'hi',
      command: 'show',
      priority: 80,
      template: {
        format: 'दिखाएं',
        tokens: [{ type: 'literal', value: 'दिखाएं', alternatives: ['दिखा'] }],
      },
      extraction: {
        patient: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}
