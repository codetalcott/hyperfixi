/**
 * Turkish Put Patterns
 *
 * Hand-crafted patterns for "put" command.
 * Turkish: "merhaba" yi #output a koy
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Turkish put patterns.
 */
export function getPutPatternsTr(): LanguagePattern[] {
  return [
    {
      id: 'put-tr-full',
      language: 'tr',
      command: 'put',
      priority: 100,
      template: {
        format: '{patient} yi {destination} a koy',
        tokens: [
          {
            type: 'role',
            role: 'patient',
            expectedTypes: ['literal', 'selector', 'reference', 'expression'],
          },
          {
            type: 'literal',
            value: 'yi',
            alternatives: ['yı', 'yu', 'yü', 'i', 'ı', 'u', 'ü', "'i", "'ı"],
          },
          { type: 'role', role: 'destination', expectedTypes: ['selector', 'reference'] },
          { type: 'literal', value: 'a', alternatives: ['e', "'a", "'e", '-a', '-e'] },
          { type: 'literal', value: 'koy', alternatives: ['koymak', 'yerleştir', 'yerleştirmek'] },
        ],
      },
      extraction: {
        patient: { position: 0 },
        destination: { position: 2 },
      },
    },
    {
      id: 'put-tr-simple',
      language: 'tr',
      command: 'put',
      priority: 90,
      template: {
        format: '{destination} a {patient} koy',
        tokens: [
          { type: 'role', role: 'destination', expectedTypes: ['selector', 'reference'] },
          { type: 'literal', value: 'a', alternatives: ['e', "'a", "'e"] },
          {
            type: 'role',
            role: 'patient',
            expectedTypes: ['literal', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: 'koy', alternatives: ['koymak'] },
        ],
      },
      extraction: {
        destination: { position: 0 },
        patient: { position: 2 },
      },
    },
  ];
}
