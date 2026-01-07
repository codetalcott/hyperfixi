/**
 * Spanish Set Patterns
 *
 * Hand-crafted patterns for "set" command.
 * Spanish: establecer x a 10
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Spanish set patterns.
 */
export function getSetPatternsEs(): LanguagePattern[] {
  return [
    {
      id: 'set-es-full',
      language: 'es',
      command: 'set',
      priority: 100,
      template: {
        format: 'establecer {destination} a {patient}',
        tokens: [
          { type: 'literal', value: 'establecer', alternatives: ['fijar', 'definir', 'poner', 'set'] },
          { type: 'role', role: 'destination', expectedTypes: ['property-path', 'selector', 'reference', 'expression'] },
          { type: 'literal', value: 'a', alternatives: ['en', 'como'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { position: 3 },
      },
    },
    {
      id: 'set-es-prep-first',
      language: 'es',
      command: 'set',
      priority: 95,
      template: {
        format: 'establecer en {destination} {patient}',
        tokens: [
          { type: 'literal', value: 'establecer', alternatives: ['fijar', 'definir', 'poner', 'set'] },
          { type: 'literal', value: 'en', alternatives: ['a'] },
          { type: 'role', role: 'destination', expectedTypes: ['property-path', 'selector', 'reference', 'expression'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 2 },
        patient: { position: 3 },
      },
    },
    {
      id: 'set-es-equals',
      language: 'es',
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
