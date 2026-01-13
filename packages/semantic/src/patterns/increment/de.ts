/**
 * German Increment Patterns
 *
 * Hand-crafted patterns for "increment" command.
 * German: erhöhe zähler
 */

import type { LanguagePattern } from '../../types';

/**
 * Get German increment patterns.
 */
export function getIncrementPatternsDe(): LanguagePattern[] {
  return [
    {
      id: 'increment-de-full',
      language: 'de',
      command: 'increment',
      priority: 100,
      template: {
        format: 'erhöhe {patient}',
        tokens: [
          {
            type: 'literal',
            value: 'erhöhe',
            alternatives: ['erhoehe', 'erhöhen', 'inkrementiere', 'inkrementieren', 'increment'],
          },
          { type: 'role', role: 'patient', expectedTypes: ['selector', 'reference', 'expression'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
