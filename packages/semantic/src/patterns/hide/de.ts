/**
 * German Hide Patterns
 *
 * Hand-crafted patterns for "hide" command.
 * German: verstecke #modal
 */

import type { LanguagePattern } from '../../types';

/**
 * Get German hide patterns.
 */
export function getHidePatternsDe(): LanguagePattern[] {
  return [
    {
      id: 'hide-de-full',
      language: 'de',
      command: 'hide',
      priority: 100,
      template: {
        format: 'verstecke {patient}',
        tokens: [
          { type: 'literal', value: 'verstecke', alternatives: ['verstecken', 'verberge', 'verbergen', 'hide'] },
          { type: 'role', role: 'patient', expectedTypes: ['selector', 'reference'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
