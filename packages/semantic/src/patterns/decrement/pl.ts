/**
 * Polish Decrement Patterns
 *
 * Tree-shakeable: Only included when Polish is imported.
 * Polish uses imperative verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Polish decrement patterns.
 */
export function getDecrementPatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'decrement-pl-full',
      language: 'pl',
      command: 'decrement',
      priority: 100,
      template: {
        format: 'zmniejsz {patient} o {quantity}',
        tokens: [
          { type: 'literal', value: 'zmniejsz', alternatives: ['obniż', 'obniz'] },
          { type: 'role', role: 'patient' },
          {
            type: 'group',
            optional: true,
            tokens: [
              { type: 'literal', value: 'o' },
              { type: 'role', role: 'quantity' },
            ],
          },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: { marker: 'o', default: { type: 'literal', value: 1 } },
      },
    },
    {
      id: 'decrement-pl-simple',
      language: 'pl',
      command: 'decrement',
      priority: 90,
      template: {
        format: 'zmniejsz {patient}',
        tokens: [
          { type: 'literal', value: 'zmniejsz', alternatives: ['obniż', 'obniz'] },
          { type: 'role', role: 'patient' },
        ],
      },
      extraction: {
        patient: { position: 1 },
        quantity: { default: { type: 'literal', value: 1 } },
      },
    },
  ];
}
