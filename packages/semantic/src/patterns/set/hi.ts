/**
 * Hindi Set Patterns
 *
 * Patterns for parsing "set" command in Hindi.
 */

import type { LanguagePattern } from '../../types';

export function getSetPatternsHi(): LanguagePattern[] {
  return [
    // Full pattern: :x को 5 सेट करें
    {
      id: 'set-hi-full',
      language: 'hi',
      command: 'set',
      priority: 100,
      template: {
        format: '{destination} को {patient} सेट करें',
        tokens: [
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'को' },
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'सेट', alternatives: ['निर्धारित'] },
          {
            type: 'group',
            optional: true,
            tokens: [{ type: 'literal', value: 'करें', alternatives: ['करो'] }],
          },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { marker: 'को', position: 2 },
      },
    },
    // Simple pattern: सेट :x 5
    {
      id: 'set-hi-simple',
      language: 'hi',
      command: 'set',
      priority: 90,
      template: {
        format: 'सेट {destination} {patient}',
        tokens: [
          { type: 'literal', value: 'सेट', alternatives: ['निर्धारित'] },
          { type: 'role', role: 'destination' },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { position: 2 },
      },
    },
  ];
}
