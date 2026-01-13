/**
 * Indonesian Set Patterns
 *
 * Hand-crafted patterns for "set" command.
 * Indonesian: atur x ke 10
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Indonesian set patterns.
 */
export function getSetPatternsId(): LanguagePattern[] {
  return [
    {
      id: 'set-id-full',
      language: 'id',
      command: 'set',
      priority: 100,
      template: {
        format: 'atur {destination} ke {patient}',
        tokens: [
          { type: 'literal', value: 'atur', alternatives: ['tetapkan', 'setel', 'set'] },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: 'ke', alternatives: ['menjadi', 'jadi', 'pada'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { position: 3 },
      },
    },
    {
      id: 'set-id-pada-direct',
      language: 'id',
      command: 'set',
      priority: 98,
      template: {
        format: 'atur pada {destination} {patient}',
        tokens: [
          { type: 'literal', value: 'atur', alternatives: ['tetapkan', 'setel'] },
          { type: 'literal', value: 'pada', alternatives: ['ke', 'di'] },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 2 },
        patient: { position: 3 },
      },
    },
    {
      id: 'set-id-equals',
      language: 'id',
      command: 'set',
      priority: 95,
      template: {
        format: '{destination} = {patient}',
        tokens: [
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: '=' },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
  ];
}
