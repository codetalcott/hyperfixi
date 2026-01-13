/**
 * Hindi Toggle Patterns
 *
 * Patterns for parsing "toggle" command in Hindi.
 * Hindi is SOV, so pattern is: {patient} को टॉगल करें
 */

import type { LanguagePattern } from '../../types';

export function getTogglePatternsHi(): LanguagePattern[] {
  return [
    // Full pattern: .active को #button पर टॉगल करें
    {
      id: 'toggle-hi-full',
      language: 'hi',
      command: 'toggle',
      priority: 100,
      template: {
        format: '{patient} को {destination} पर टॉगल करें',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'को' },
          { type: 'role', role: 'destination' },
          { type: 'literal', value: 'पर' },
          { type: 'literal', value: 'टॉगल', alternatives: ['बदलें', 'बदल'] },
          {
            type: 'group',
            optional: true,
            tokens: [{ type: 'literal', value: 'करें', alternatives: ['करो'] }],
          },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { marker: 'को', position: 2 },
      },
    },
    // Simple pattern: .active टॉगल करें
    {
      id: 'toggle-hi-simple',
      language: 'hi',
      command: 'toggle',
      priority: 90,
      template: {
        format: '{patient} टॉगल करें',
        tokens: [
          { type: 'role', role: 'patient' },
          { type: 'literal', value: 'टॉगल', alternatives: ['बदलें', 'बदल'] },
          {
            type: 'group',
            optional: true,
            tokens: [{ type: 'literal', value: 'करें', alternatives: ['करो'] }],
          },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { default: { type: 'reference', value: 'me' } },
      },
    },
    // Bare pattern: टॉगल .active
    {
      id: 'toggle-hi-bare',
      language: 'hi',
      command: 'toggle',
      priority: 80,
      template: {
        format: 'टॉगल {patient}',
        tokens: [
          { type: 'literal', value: 'टॉगल', alternatives: ['बदलें', 'बदल'] },
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
