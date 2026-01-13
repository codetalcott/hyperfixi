/**
 * French Set Patterns
 *
 * Hand-crafted patterns for "set" command.
 * French: définir x à 10
 */

import type { LanguagePattern } from '../../types';

/**
 * Get French set patterns.
 */
export function getSetPatternsFr(): LanguagePattern[] {
  return [
    {
      id: 'set-fr-full',
      language: 'fr',
      command: 'set',
      priority: 100,
      template: {
        format: 'définir {destination} à {patient}',
        tokens: [
          {
            type: 'literal',
            value: 'définir',
            alternatives: ['definir', 'mettre', 'fixer', 'set'],
          },
          {
            type: 'role',
            role: 'destination',
            expectedTypes: ['property-path', 'selector', 'reference', 'expression'],
          },
          { type: 'literal', value: 'à', alternatives: ['a', 'sur', 'comme'] },
          { type: 'role', role: 'patient', expectedTypes: ['literal', 'expression', 'reference'] },
        ],
      },
      extraction: {
        destination: { position: 1 },
        patient: { position: 3 },
      },
    },
    {
      id: 'set-fr-sur-direct',
      language: 'fr',
      command: 'set',
      priority: 98,
      template: {
        format: 'définir sur {destination} {patient}',
        tokens: [
          { type: 'literal', value: 'définir', alternatives: ['definir', 'mettre', 'fixer'] },
          { type: 'literal', value: 'sur', alternatives: ['à', 'en'] },
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
      id: 'set-fr-equals',
      language: 'fr',
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
