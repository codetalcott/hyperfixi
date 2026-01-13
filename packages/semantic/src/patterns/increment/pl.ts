/**
 * Polish Increment Patterns
 *
 * Tree-shakeable: Only included when Polish is imported.
 * Polish uses imperative verb forms for commands.
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Polish increment patterns.
 */
export function getIncrementPatternsPl(): LanguagePattern[] {
  return [
    {
      id: 'increment-pl-full',
      language: 'pl',
      command: 'increment',
      priority: 100,
      template: {
        format: 'zwiększ {patient} o {quantity}',
        tokens: [
          { type: 'literal', value: 'zwiększ', alternatives: ['zwieksz', 'podnieś', 'podnies'] },
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
      id: 'increment-pl-simple',
      language: 'pl',
      command: 'increment',
      priority: 90,
      template: {
        format: 'zwiększ {patient}',
        tokens: [
          { type: 'literal', value: 'zwiększ', alternatives: ['zwieksz', 'podnieś', 'podnies'] },
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
