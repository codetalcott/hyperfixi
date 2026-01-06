/**
 * Chinese Decrement Patterns
 *
 * Hand-crafted patterns for "decrement" command.
 * Chinese: 减少 counter
 */

import type { LanguagePattern } from '../../types';

/**
 * Get Chinese decrement patterns.
 */
export function getDecrementPatternsZh(): LanguagePattern[] {
  return [
    {
      id: 'decrement-zh-full',
      language: 'zh',
      command: 'decrement',
      priority: 100,
      template: {
        format: '减少 {patient}',
        tokens: [
          { type: 'literal', value: '减少', alternatives: ['递减', '减', '降低', 'decrement'] },
          { type: 'role', role: 'patient', expectedTypes: ['selector', 'reference', 'expression'] },
        ],
      },
      extraction: {
        patient: { position: 1 },
      },
    },
  ];
}
