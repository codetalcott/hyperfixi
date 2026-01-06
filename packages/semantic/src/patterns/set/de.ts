/**
 * German Set Patterns
 *
 * Hand-crafted patterns for "set" command.
 * German: setze x auf 10
 */

import type { LanguagePattern } from '../../types';

/**
 * Get German set patterns.
 */
export function getSetPatternsDe(): LanguagePattern[] {
  return [
    {
      id: 'set-de-full',
      language: 'de',
      command: 'set',
      priority: 100,
      template: {
        format: 'setze {destination} auf {patient}',
        tokens: [
          { type: 'literal', value: 'setze', alternatives: ['setzen', 'stelle', 'stellen', 'set'] },
          { type: 'role', role: 'destination', expectedTypes: ['property-path', 'selector', 'reference', 'expression'] },
          { type: 'literal', value: 'auf', alternatives: ['zu', 'an'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { position: 3 },
      },
    },
    {
      id: 'set-de-equals',
      language: 'de',
      command: 'set',
      priority: 95,
      template: {
        format: '{destination} = {patient}',
        tokens: [
          { type: 'role', role: 'destination', expectedTypes: ['property-path', 'selector', 'reference', 'expression'] },
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
