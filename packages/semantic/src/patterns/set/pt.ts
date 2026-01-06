/**
 * Portuguese Set Patterns
 *
 * Hand-crafted patterns for "set" command.
 * Portuguese: definir x para 10
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Portuguese set patterns.
 */
export function getSetPatternsPt(): LanguagePattern[] {
  return [
    {
      id: 'set-pt-full',
      language: 'pt',
      command: 'set',
      priority: 100,
      template: {
        format: 'definir {destination} para {patient}',
        tokens: [
          { type: 'literal', value: 'definir', alternatives: ['estabelecer', 'colocar', 'set'] },
          { type: 'role', role: 'destination', expectedTypes: ['property-path', 'selector', 'reference', 'expression'] },
          { type: 'literal', value: 'para', alternatives: ['como', 'a', 'em'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { position: 3 },
      },
    },
    {
      id: 'set-pt-equals',
      language: 'pt',
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
