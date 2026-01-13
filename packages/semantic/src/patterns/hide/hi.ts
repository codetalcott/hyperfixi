/**
 * Hindi Hide Patterns
 *
 * Patterns for parsing "hide" command in Hindi.
 */

import type { LanguagePattern } from '../../types';

export function getHidePatternsHi(): LanguagePattern[] {
  return [
    // Full pattern: #element को छिपाएं
    {
      id: 'hide-hi-full',
      language: 'hi',
      command: 'hide',
      priority: 100,
      template: {
        format: '{patient} को छिपाएं',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'को' },
          { type: 'literal', value: 'छिपाएं', alternatives: ['छिपा'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
      },
    },
    // Simple pattern: छिपाएं #element
    {
      id: 'hide-hi-simple',
      language: 'hi',
      command: 'hide',
      priority: 90,
      template: {
        format: 'छिपाएं {patient}',
        tokens: [
          { type: 'literal', value: 'छिपाएं', alternatives: ['छिपा'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
    // Bare pattern: छिपाएं (implicit me)
    {
      id: 'hide-hi-bare',
      language: 'hi',
      command: 'hide',
      priority: 80,
      template: {
        format: 'छिपाएं',
        tokens: [{ type: 'literal', value: 'छिपाएं', alternatives: ['छिपा'] }],
      },
      extraction: {
        patient: { default: { type: 'reference', value: 'me' } },
      },
    },
  ];
}
